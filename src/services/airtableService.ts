
import { UserProgress, Module, Lesson, Material, Stream, CalendarEvent, ArenaScenario, AppNotification, AppConfig } from '../types';
import { Logger } from './logger';

// ─── Configuration ──────────────────────────────────────────────
// Credentials must be provided via environment variables (VITE_AIRTABLE_PAT, VITE_AIRTABLE_BASE_ID)
const DEFAULT_PAT = import.meta.env.VITE_AIRTABLE_PAT || '';
const DEFAULT_BASE_ID = import.meta.env.VITE_AIRTABLE_BASE_ID || '';

const TABLES = {
  MODULES: import.meta.env.VITE_AIRTABLE_MODULES_TABLE || 'Modules',
  LESSONS: import.meta.env.VITE_AIRTABLE_LESSONS_TABLE || 'Lessons',
  MATERIALS: import.meta.env.VITE_AIRTABLE_MATERIALS_TABLE || 'Materials',
  STREAMS: import.meta.env.VITE_AIRTABLE_STREAMS_TABLE || 'Streams',
  USERS: import.meta.env.VITE_AIRTABLE_USERS_TABLE || 'Users',
  NOTIFICATIONS: import.meta.env.VITE_AIRTABLE_NOTIFICATIONS_TABLE || 'Notifications',
  SCENARIOS: import.meta.env.VITE_AIRTABLE_SCENARIOS_TABLE || 'Scenarios',
  EVENTS: import.meta.env.VITE_AIRTABLE_EVENTS_TABLE || 'Events',
  CONFIG: import.meta.env.VITE_AIRTABLE_CONFIG_TABLE || 'Config',
};

// ─── Rate limiter (Airtable: 5 req/sec per base) ───────────────
class RateLimiter {
  private queue: Array<{ fn: () => Promise<any>; resolve: (v: any) => void; reject: (e: any) => void }> = [];
  private running = 0;
  private readonly maxConcurrent: number;
  private readonly intervalMs: number;
  private lastTick = 0;

  constructor(maxPerSecond = 4, maxConcurrent = 3) {
    this.maxConcurrent = maxConcurrent;
    this.intervalMs = Math.ceil(1000 / maxPerSecond);
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this.drain();
    });
  }

  private async drain() {
    if (this.running >= this.maxConcurrent || this.queue.length === 0) return;

    const now = Date.now();
    const wait = Math.max(0, this.intervalMs - (now - this.lastTick));
    if (wait > 0) {
      setTimeout(() => this.drain(), wait);
      return;
    }

    const item = this.queue.shift();
    if (!item) return;

    this.running++;
    this.lastTick = Date.now();

    try {
      const result = await item.fn();
      item.resolve(result);
    } catch (e) {
      item.reject(e);
    } finally {
      this.running--;
      this.drain();
    }
  }
}

// ─── Types ──────────────────────────────────────────────────────
interface AirtableRecord<T = Record<string, any>> {
  id: string;
  fields: T;
  createdTime?: string;
}

interface AirtableListResponse<T = Record<string, any>> {
  records: AirtableRecord<T>[];
  offset?: string;
}

interface SyncMeta {
  lastSyncTimestamp: number;
  contentHash: string;
}

// ─── Main Service ───────────────────────────────────────────────
class AirtableService {
  private baseUrl = 'https://api.airtable.com/v0';
  private baseId: string;
  private pat: string;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 2 * 60 * 1000;
  private limiter = new RateLimiter(4, 3);
  
  // Track Airtable record IDs for delete/update operations
  private recordIdMap: Map<string, Map<string, string>> = new Map(); // table -> appId -> airtableRecordId

  constructor() {
    this.baseId = DEFAULT_BASE_ID;
    this.pat = DEFAULT_PAT;
  }

  // ─── Configuration ──────────────────────────────────────────
  updateConfig(pat: string, baseId: string) {
    this.pat = pat;
    this.baseId = baseId;
    this.clearCache();
    this.recordIdMap.clear();
  }

  isConfigured(): boolean {
    return !!(this.pat && this.baseId);
  }

  clearCache() {
    this.cache.clear();
    Logger.log('🧹 Airtable cache cleared');
  }

  // ─── Core Request (with rate limiting & retry) ──────────────
  private async request<T>(endpoint: string, options: RequestInit = {}, useCache = false): Promise<T> {
    if (!this.pat || !this.baseId) {
      throw new Error('Airtable configuration missing (PAT or Base ID)');
    }

    // Cache check
    const cacheKey = `${endpoint}:${options.method || 'GET'}`;
    if (useCache && options.method === undefined) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.data;
      }
    }

    return this.limiter.execute(async () => {
      const url = `${this.baseUrl}/${this.baseId}/${endpoint}`;
      const headers = {
        'Authorization': `Bearer ${this.pat}`,
        'Content-Type': 'application/json',
        ...options.headers,
      };

      let lastError: Error | null = null;

      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const response = await fetch(url, { ...options, headers });

          // Rate limited — backoff & retry
          if (response.status === 429) {
            const retryAfter = parseInt(response.headers.get('Retry-After') || '30', 10);
            Logger.log(`⚠️ Airtable 429 — waiting ${retryAfter}s (attempt ${attempt + 1})`);
            await this.sleep(retryAfter * 1000);
            continue;
          }

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Airtable ${response.status}: ${errorText}`);
          }

          const data = await response.json();
          if (useCache && !options.method) {
            this.cache.set(cacheKey, { data, timestamp: Date.now() });
          }
          return data;
        } catch (error) {
          lastError = error as Error;
          if (attempt < 2) {
            await this.sleep(500 * (attempt + 1));
          }
        }
      }

      throw lastError || new Error('Airtable request failed');
    });
  }

  private sleep(ms: number) {
    return new Promise(r => setTimeout(r, ms));
  }

  // ─── Paginated Fetch (handles >100 records) ─────────────────
  private async fetchAll<T>(table: string, params = '', useCache = false): Promise<AirtableRecord<T>[]> {
    const allRecords: AirtableRecord<T>[] = [];
    let offset: string | undefined;

    do {
      const sep = params ? '&' : '';
      const offsetParam = offset ? `${sep}offset=${offset}` : '';
      const endpoint = `${table}?${params}${offsetParam}`;

      const data = await this.request<AirtableListResponse<T>>(endpoint, {}, useCache && !offset);
      allRecords.push(...data.records);
      offset = data.offset;
    } while (offset);

    return allRecords;
  }

  // ─── Record ID Resolution ──────────────────────────────────
  private setRecordId(table: string, appId: string, recordId: string) {
    if (!this.recordIdMap.has(table)) this.recordIdMap.set(table, new Map());
    this.recordIdMap.get(table)!.set(appId, recordId);
  }

  private getRecordId(table: string, appId: string): string | undefined {
    return this.recordIdMap.get(table)?.get(appId);
  }

  private async resolveRecordId(table: string, appId: string, idField = 'id'): Promise<string | null> {
    const cached = this.getRecordId(table, appId);
    if (cached) return cached;

    try {
      const data = await this.request<AirtableListResponse>(
        `${table}?filterByFormula={${idField}}="${appId}"&maxRecords=1`
      );
      if (data.records.length > 0) {
        this.setRecordId(table, appId, data.records[0].id);
        return data.records[0].id;
      }
    } catch { /* ignore */ }
    return null;
  }

  // ─── Batch Operations (max 10 per Airtable call) ───────────
  private async batchCreate(table: string, records: Array<{ fields: Record<string, any> }>): Promise<AirtableRecord[]> {
    const results: AirtableRecord[] = [];
    const batches = this.chunk(records, 10);

    for (const batch of batches) {
      try {
        const data = await this.request<{ records: AirtableRecord[] }>(table, {
          method: 'POST',
          body: JSON.stringify({ records: batch }),
        });
        results.push(...data.records);
      } catch (e) {
        Logger.error(`Batch create failed for ${table}`, e);
      }
    }
    return results;
  }

  private async batchUpdate(table: string, records: Array<{ id: string; fields: Record<string, any> }>): Promise<AirtableRecord[]> {
    const results: AirtableRecord[] = [];
    const batches = this.chunk(records, 10);

    for (const batch of batches) {
      try {
        const data = await this.request<{ records: AirtableRecord[] }>(table, {
          method: 'PATCH',
          body: JSON.stringify({ records: batch }),
        });
        results.push(...data.records);
      } catch (e) {
        Logger.error(`Batch update failed for ${table}`, e);
      }
    }
    return results;
  }

  private async batchDelete(table: string, recordIds: string[]): Promise<void> {
    const batches = this.chunk(recordIds, 10);

    for (const batch of batches) {
      try {
        const params = batch.map(id => `records[]=${id}`).join('&');
        await this.request(`${table}?${params}`, { method: 'DELETE' });
      } catch (e) {
        Logger.error(`Batch delete failed for ${table}`, e);
      }
    }
  }

  private chunk<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  }

  // ═════════════════════════════════════════════════════════════
  //                      FETCH OPERATIONS
  // ═════════════════════════════════════════════════════════════

  // ─── Modules + Lessons ──────────────────────────────────────
  async fetchModules(): Promise<Module[]> {
    try {
      Logger.log('🔄 Fetching modules with lessons from Airtable...');
      const t0 = Date.now();

      const [moduleRecords, lessonRecords] = await Promise.all([
        this.fetchAll(TABLES.MODULES, 'sort%5B0%5D%5Bfield%5D=sortOrder&sort%5B0%5D%5Bdirection%5D=asc', true),
        this.fetchAll(TABLES.LESSONS, 'sort%5B0%5D%5Bfield%5D=order&sort%5B0%5D%5Bdirection%5D=asc', true),
      ]);

      // Build record ID maps
      moduleRecords.forEach(r => this.setRecordId(TABLES.MODULES, String(r.fields.id || r.id), r.id));
      lessonRecords.forEach(r => this.setRecordId(TABLES.LESSONS, String(r.fields.appId || r.id), r.id));

      // Map lessons to their module's Airtable record ID
      const lessonsMap = new Map<string, Lesson[]>();
      lessonRecords.forEach(r => {
        const f = r.fields as any;
        const lesson: Lesson = {
          id: String(f.appId || r.id),
          title: f.title || 'Урок без названия',
          description: f.description || '',
          content: f.content || '',
          xpReward: Number(f.xpReward) || 100,
          homeworkType: (f.homeworkType || 'TEXT') as any,
          homeworkTask: f.homeworkTask || '',
          aiGradingInstruction: f.aiGradingInstruction || '',
          videoUrl: f.videoUrl || '',
        };

        const moduleLinks = Array.isArray(f.Module) ? f.Module : (f.Module ? [f.Module] : []);
        moduleLinks.forEach((modRecId: string) => {
          if (!lessonsMap.has(modRecId)) lessonsMap.set(modRecId, []);
          lessonsMap.get(modRecId)!.push(lesson);
        });
      });

      // Fallback: reverse link from Modules.Lessons field
      const moduleLessonsLinkMap = new Map<string, Lesson[]>();
      moduleRecords.forEach(mr => {
        const links = (mr.fields as any).Lessons || [];
        if (Array.isArray(links) && links.length > 0) {
          const lessons: Lesson[] = [];
          links.forEach((lessonRecId: string) => {
            const lr = lessonRecords.find(l => l.id === lessonRecId);
            if (lr) {
              const f = lr.fields as any;
              lessons.push({
                id: String(f.appId || lr.id),
                title: f.title || 'Урок',
                description: f.description || '',
                content: f.content || '',
                xpReward: Number(f.xpReward) || 100,
                homeworkType: (f.homeworkType || 'TEXT') as any,
                homeworkTask: f.homeworkTask || '',
                aiGradingInstruction: f.aiGradingInstruction || '',
                videoUrl: f.videoUrl || '',
              });
            }
          });
          moduleLessonsLinkMap.set(mr.id, lessons);
        }
      });

      const modules: Module[] = moduleRecords.map(mr => {
        const f = mr.fields as any;
        return {
          id: String(f.id || mr.id),
          title: f.title || 'Модуль',
          description: f.description || '',
          category: this.mapCategory(f.category),
          minLevel: Number(f.minLevel) || 1,
          imageUrl: f.imageUrl || '',
          videoUrl: f.videoUrl || '',
          pdfUrl: f.pdfUrl || '',
          lessons: lessonsMap.get(mr.id) || moduleLessonsLinkMap.get(mr.id) || [],
        };
      });

      Logger.log(`✅ Loaded ${modules.length} modules, ${lessonRecords.length} lessons in ${Date.now() - t0}ms`);
      return modules;
    } catch (error) {
      Logger.error('❌ Failed to fetch modules', error);
      return [];
    }
  }

  // ─── Materials ──────────────────────────────────────────────
  async fetchMaterials(): Promise<Material[]> {
    try {
      const records = await this.fetchAll(TABLES.MATERIALS, 'sort%5B0%5D%5Bfield%5D=sortOrder&sort%5B0%5D%5Bdirection%5D=asc', true);
      records.forEach(r => this.setRecordId(TABLES.MATERIALS, String((r.fields as any).id || r.id), r.id));
      return records.map(r => {
        const f = r.fields as any;
        return { id: String(f.id || r.id), title: f.title || '', description: f.description || '', type: (f.type || 'LINK') as any, url: f.url || '' };
      });
    } catch { return []; }
  }

  // ─── Streams ────────────────────────────────────────────────
  async fetchStreams(): Promise<Stream[]> {
    try {
      const records = await this.fetchAll(TABLES.STREAMS, 'sort%5B0%5D%5Bfield%5D=date&sort%5B0%5D%5Bdirection%5D=desc', true);
      records.forEach(r => this.setRecordId(TABLES.STREAMS, String((r.fields as any).id || r.id), r.id));
      return records.map(r => {
        const f = r.fields as any;
        return { id: String(f.id || r.id), title: f.title || '', date: f.date || new Date().toISOString(), youtubeUrl: f.youtubeUrl || '', status: (f.status || 'UPCOMING') as any };
      });
    } catch { return []; }
  }

  // ─── Scenarios ──────────────────────────────────────────────
  async fetchScenarios(): Promise<ArenaScenario[]> {
    try {
      const records = await this.fetchAll(TABLES.SCENARIOS, '', true);
      records.forEach(r => this.setRecordId(TABLES.SCENARIOS, String((r.fields as any).id || r.id), r.id));
      return records.map(r => {
        const f = r.fields as any;
        return { id: String(f.id || r.id), title: f.title || '', difficulty: (f.difficulty || 'Medium') as any, clientRole: f.clientRole || '', objective: f.objective || '', initialMessage: f.initialMessage || '' };
      });
    } catch { return []; }
  }

  // ─── Events ─────────────────────────────────────────────────
  async fetchEvents(): Promise<CalendarEvent[]> {
    try {
      const records = await this.fetchAll(TABLES.EVENTS, 'sort%5B0%5D%5Bfield%5D=date&sort%5B0%5D%5Bdirection%5D=asc', true);
      records.forEach(r => this.setRecordId(TABLES.EVENTS, String((r.fields as any).id || r.id), r.id));
      return records.map(r => {
        const f = r.fields as any;
        return { id: String(f.id || r.id), title: f.title || '', description: f.description || '', date: f.date || new Date().toISOString(), type: (f.type || 'OTHER') as any, durationMinutes: Number(f.durationMinutes) || 60 };
      });
    } catch { return []; }
  }

  // ─── Notifications ──────────────────────────────────────────
  async fetchNotifications(): Promise<AppNotification[]> {
    try {
      const records = await this.fetchAll(TABLES.NOTIFICATIONS, 'sort%5B0%5D%5Bfield%5D=date&sort%5B0%5D%5Bdirection%5D=desc&maxRecords=50', true);
      return records.map(r => {
        const f = r.fields as any;
        return { id: r.id, title: f.title || '', message: f.message || '', type: (f.type || 'INFO') as any, date: f.date || r.createdTime || '', link: f.link, targetUserId: f.targetUserId, targetRole: f.targetRole };
      });
    } catch { return []; }
  }

  // ─── Config ─────────────────────────────────────────────────
  async fetchConfig(): Promise<Record<string, string>> {
    try {
      const records = await this.fetchAll(TABLES.CONFIG, '', true);
      const config: Record<string, string> = {};
      records.forEach(r => {
        const f = r.fields as any;
        if (f.key) config[f.key] = f.value || '';
      });
      return config;
    } catch { return {}; }
  }

  // ─── Users ──────────────────────────────────────────────────
  async loadUserProgress(telegramId: string): Promise<UserProgress | null> {
    try {
      const data = await this.request<AirtableListResponse>(
        `${TABLES.USERS}?filterByFormula={TelegramId}="${telegramId}"`
      );
      if (data.records.length === 0) return null;

      const record = data.records[0];
      const f = record.fields as any;
      const parsed = f.Data ? JSON.parse(String(f.Data)) : {};

      this.setRecordId(TABLES.USERS, String(f.TelegramId), record.id);

      return {
        id: String(f.TelegramId),
        telegramId: String(f.TelegramId),
        name: String(f.Name || 'User'),
        role: (f.Role || 'STUDENT') as any,
        isAuthenticated: true,
        xp: Number(f.XP) || 0,
        level: Number(f.Level) || 1,
        completedLessonIds: parsed.completedLessonIds || [],
        submittedHomeworks: parsed.submittedHomeworks || [],
        chatHistory: parsed.chatHistory || [],
        notebook: parsed.notebook || [],
        habits: parsed.habits || [],
        goals: parsed.goals || [],
        theme: parsed.theme || 'LIGHT',
        notifications: parsed.notifications || { pushEnabled: false, telegramSync: false, deadlineReminders: false, chatNotifications: false },
        airtableRecordId: record.id,
        lastSyncTimestamp: Number(f.LastSync) || Date.now(),
        registrationDate: record.createdTime,
        stats: parsed.stats || { storiesPosted: 0, questionsAsked: {}, referralsCount: 0, streamsVisited: [], homeworksSpeed: {}, initiativesCount: 0 },
      } as UserProgress;
    } catch { return null; }
  }

  async syncUserProgress(user: UserProgress): Promise<boolean> {
    try {
      const telegramId = String(user.telegramId || user.id || '');
      if (!telegramId) return false;

      const userData: Record<string, any> = {
        TelegramId: telegramId,
        Name: user.name,
        Role: user.role,
        XP: user.xp,
        Level: user.level,
        Data: JSON.stringify({
          completedLessonIds: user.completedLessonIds,
          submittedHomeworks: user.submittedHomeworks,
          chatHistory: (user.chatHistory || []).slice(-50), // Limit chat history to last 50
          notebook: user.notebook,
          habits: user.habits,
          goals: user.goals,
          theme: user.theme,
          notifications: user.notifications,
          stats: user.stats,
        }),
        LastSync: Date.now(),
      };

      const recordId = await this.resolveRecordId(TABLES.USERS, telegramId, 'TelegramId');

      if (recordId) {
        await this.request(`${TABLES.USERS}/${recordId}`, {
          method: 'PATCH',
          body: JSON.stringify({ fields: userData }),
        });
      } else {
        const data = await this.request<{ id: string }>(TABLES.USERS, {
          method: 'POST',
          body: JSON.stringify({ fields: userData }),
        });
        this.setRecordId(TABLES.USERS, telegramId, data.id);
      }
      return true;
    } catch (e) {
      Logger.error('User sync failed', e);
      return false;
    }
  }

  async getLeaderboard(): Promise<UserProgress[]> {
    try {
      const records = await this.fetchAll(TABLES.USERS, 'sort%5B0%5D%5Bfield%5D=XP&sort%5B0%5D%5Bdirection%5D=desc&maxRecords=50', true);
      return records.map(r => {
        const f = r.fields as any;
        return {
          id: String(f.TelegramId),
          telegramId: String(f.TelegramId),
          name: String(f.Name || 'Аноним'),
          role: f.Role as any,
          xp: Number(f.XP) || 0,
          level: Number(f.Level) || 1,
          isAuthenticated: false,
        } as UserProgress;
      });
    } catch { return []; }
  }

  // ═════════════════════════════════════════════════════════════
  //                  SAVE / SYNC OPERATIONS
  // ═════════════════════════════════════════════════════════════

  // ─── Generic Upsert for simple entities ─────────────────────
  private async upsertRecord(table: string, appId: string, fields: Record<string, any>, idField = 'id'): Promise<string> {
    const recordId = await this.resolveRecordId(table, appId, idField);

    if (recordId) {
      await this.request(`${table}/${recordId}`, {
        method: 'PATCH',
        body: JSON.stringify({ fields }),
      });
      return recordId;
    } else {
      const data = await this.request<{ id: string }>(table, {
        method: 'POST',
        body: JSON.stringify({ fields }),
      });
      this.setRecordId(table, appId, data.id);
      return data.id;
    }
  }

  // ─── Generic Delete ─────────────────────────────────────────
  async deleteRecord(table: string, appId: string, idField = 'id'): Promise<boolean> {
    try {
      const recordId = await this.resolveRecordId(table, appId, idField);
      if (!recordId) {
        Logger.log(`⚠️ Record not found in ${table} for ${idField}="${appId}"`);
        return false;
      }
      await this.request(`${table}/${recordId}`, { method: 'DELETE' });
      this.recordIdMap.get(table)?.delete(appId);
      Logger.log(`🗑️ Deleted ${table} record: ${appId}`);
      return true;
    } catch (e) {
      Logger.error(`Failed to delete from ${table}`, e);
      return false;
    }
  }

  // ─── Modules ────────────────────────────────────────────────
  async saveModule(module: Module, sortOrder = 0): Promise<void> {
    try {
      await this.upsertRecord(TABLES.MODULES, module.id, {
        id: module.id,
        title: module.title,
        description: module.description,
        category: module.category,
        minLevel: module.minLevel,
        imageUrl: module.imageUrl || '',
        videoUrl: module.videoUrl || '',
        pdfUrl: module.pdfUrl || '',
        sortOrder,
      });
      this.clearCache();
    } catch (e) {
      Logger.error(`Failed to save module ${module.id}`, e);
    }
  }

  async deleteModule(moduleId: string): Promise<void> {
    await this.deleteRecord(TABLES.MODULES, moduleId);
    this.clearCache();
  }

  // ─── Lessons ────────────────────────────────────────────────
  async saveLesson(lesson: Lesson, moduleId: string, sortOrder = 0): Promise<void> {
    try {
      const fields: Record<string, any> = {
        appId: lesson.id,
        title: lesson.title,
        description: lesson.description || '',
        content: lesson.content || '',
        xpReward: lesson.xpReward,
        homeworkType: lesson.homeworkType,
        homeworkTask: lesson.homeworkTask || '',
        aiGradingInstruction: lesson.aiGradingInstruction || '',
        videoUrl: lesson.videoUrl || '',
        order: sortOrder,
      };

      // Resolve module Airtable record ID for linked field
      const moduleRecordId = await this.resolveRecordId(TABLES.MODULES, moduleId);
      if (moduleRecordId) {
        fields.Module = [moduleRecordId];
      }

      await this.upsertRecord(TABLES.LESSONS, lesson.id, fields, 'appId');
      this.clearCache();
    } catch (e) {
      Logger.error(`Failed to save lesson ${lesson.id}`, e);
    }
  }

  async deleteLesson(lessonId: string): Promise<void> {
    await this.deleteRecord(TABLES.LESSONS, lessonId, 'appId');
    this.clearCache();
  }

  // ─── Materials ──────────────────────────────────────────────
  async saveMaterial(material: Material, sortOrder = 0): Promise<void> {
    try {
      await this.upsertRecord(TABLES.MATERIALS, material.id, {
        id: material.id,
        title: material.title,
        description: material.description || '',
        type: material.type,
        url: material.url || '',
        sortOrder,
      });
      this.clearCache();
    } catch (e) {
      Logger.error(`Failed to save material ${material.id}`, e);
    }
  }

  async deleteMaterial(materialId: string): Promise<void> {
    await this.deleteRecord(TABLES.MATERIALS, materialId);
    this.clearCache();
  }

  // ─── Streams ────────────────────────────────────────────────
  async saveStream(stream: Stream): Promise<void> {
    try {
      await this.upsertRecord(TABLES.STREAMS, stream.id, {
        id: stream.id,
        title: stream.title,
        date: stream.date,
        youtubeUrl: stream.youtubeUrl || '',
        status: stream.status,
      });
      this.clearCache();
    } catch (e) {
      Logger.error(`Failed to save stream ${stream.id}`, e);
    }
  }

  async deleteStream(streamId: string): Promise<void> {
    await this.deleteRecord(TABLES.STREAMS, streamId);
    this.clearCache();
  }

  // ─── Scenarios ──────────────────────────────────────────────
  async saveScenario(scenario: ArenaScenario): Promise<void> {
    try {
      await this.upsertRecord(TABLES.SCENARIOS, scenario.id, {
        id: scenario.id,
        title: scenario.title,
        difficulty: scenario.difficulty,
        clientRole: scenario.clientRole,
        objective: scenario.objective || '',
        initialMessage: scenario.initialMessage || '',
      });
      this.clearCache();
    } catch (e) {
      Logger.error(`Failed to save scenario ${scenario.id}`, e);
    }
  }

  async deleteScenario(scenarioId: string): Promise<void> {
    await this.deleteRecord(TABLES.SCENARIOS, scenarioId);
    this.clearCache();
  }

  // ─── Events ─────────────────────────────────────────────────
  async saveEvent(event: CalendarEvent): Promise<void> {
    try {
      const dateStr = event.date instanceof Date ? event.date.toISOString() : event.date;
      await this.upsertRecord(TABLES.EVENTS, event.id, {
        id: event.id,
        title: event.title,
        description: event.description || '',
        date: dateStr,
        type: event.type,
        durationMinutes: event.durationMinutes || 60,
      });
      this.clearCache();
    } catch (e) {
      Logger.error(`Failed to save event ${event.id}`, e);
    }
  }

  async deleteEvent(eventId: string): Promise<void> {
    await this.deleteRecord(TABLES.EVENTS, eventId);
    this.clearCache();
  }

  // ─── Notifications (Broadcast) ──────────────────────────────
  async sendNotification(notif: AppNotification): Promise<void> {
    try {
      await this.request(TABLES.NOTIFICATIONS, {
        method: 'POST',
        body: JSON.stringify({
          fields: {
            title: notif.title,
            message: notif.message,
            type: notif.type,
            date: notif.date || new Date().toISOString(),
            targetRole: notif.targetRole || 'ALL',
            targetUserId: notif.targetUserId || '',
            link: notif.link || '',
          },
        }),
      });
      this.clearCache();
      Logger.log('📨 Notification saved to Airtable');
    } catch (e) {
      Logger.error('Failed to send notification', e);
    }
  }

  // ─── Config ─────────────────────────────────────────────────
  async saveConfig(config: AppConfig): Promise<void> {
    try {
      // Save as key-value pairs in Config table
      const configPairs: Record<string, string> = {
        appName: config.appName,
        appDescription: config.appDescription,
        primaryColor: config.primaryColor,
        systemInstruction: config.systemInstruction,
        welcomeVideoUrl: config.welcomeVideoUrl || '',
        welcomeMessage: config.welcomeMessage || '',
        features: JSON.stringify(config.features),
        aiConfig: JSON.stringify(config.aiConfig),
        integrations: JSON.stringify({
          // Exclude PAT from being saved to a config table for security
          telegramBotToken: config.integrations.telegramBotToken,
          googleDriveFolderId: config.integrations.googleDriveFolderId,
          crmWebhookUrl: config.integrations.crmWebhookUrl,
          aiModelVersion: config.integrations.aiModelVersion,
          inviteBaseUrl: config.integrations.inviteBaseUrl,
        }),
        systemAgent: JSON.stringify(config.systemAgent),
      };

      // Fetch existing config records
      const existing = await this.fetchAll(TABLES.CONFIG);
      const existingMap = new Map<string, string>();
      existing.forEach(r => {
        const f = r.fields as any;
        if (f.key) existingMap.set(f.key, r.id);
      });

      // Batch update existing + create new
      const toUpdate: Array<{ id: string; fields: Record<string, any> }> = [];
      const toCreate: Array<{ fields: Record<string, any> }> = [];

      for (const [key, value] of Object.entries(configPairs)) {
        if (existingMap.has(key)) {
          toUpdate.push({ id: existingMap.get(key)!, fields: { key, value } });
        } else {
          toCreate.push({ fields: { key, value } });
        }
      }

      if (toUpdate.length > 0) await this.batchUpdate(TABLES.CONFIG, toUpdate);
      if (toCreate.length > 0) await this.batchCreate(TABLES.CONFIG, toCreate);

      this.clearCache();
      Logger.log('✅ Config saved to Airtable');
    } catch (e) {
      Logger.error('Failed to save config', e);
    }
  }

  // ═════════════════════════════════════════════════════════════
  //              COLLECTION SYNC (Diff-based)
  // ═════════════════════════════════════════════════════════════

  /**
   * Smart sync: Compares local state with Airtable, performs minimal operations.
   * - Creates new records
   * - Updates changed records
   * - Deletes removed records
   */
  async syncModules(localModules: Module[]): Promise<void> {
    try {
      Logger.log(`🔄 Syncing ${localModules.length} modules to Airtable...`);

      // Save modules with sort order
      await Promise.all(localModules.map((mod, i) => this.saveModule(mod, i)));

      // Sync all lessons per module
      for (const mod of localModules) {
        // Find orphaned lessons in Airtable that are no longer in local state
        const remoteRecords = await this.fetchAll(TABLES.LESSONS,
          `filterByFormula=FIND("${mod.id}",ARRAYJOIN({Module}))`,
        );

        const localLessonIds = new Set(mod.lessons.map(l => l.id));
        const orphanedRecordIds = remoteRecords
          .filter(r => !localLessonIds.has(String((r.fields as any).appId || r.id)))
          .map(r => r.id);

        if (orphanedRecordIds.length > 0) {
          Logger.log(`🗑️ Removing ${orphanedRecordIds.length} orphaned lessons from module ${mod.id}`);
          await this.batchDelete(TABLES.LESSONS, orphanedRecordIds);
        }

        // Save current lessons
        await Promise.all(mod.lessons.map((lesson, li) => this.saveLesson(lesson, mod.id, li)));
      }

      // Check for orphaned modules in Airtable
      const remoteModules = await this.fetchAll(TABLES.MODULES);
      const localModuleIds = new Set(localModules.map(m => m.id));
      const orphanedModuleIds = remoteModules
        .filter(r => !localModuleIds.has(String((r.fields as any).id || r.id)))
        .map(r => r.id);

      if (orphanedModuleIds.length > 0) {
        Logger.log(`🗑️ Removing ${orphanedModuleIds.length} orphaned modules`);
        await this.batchDelete(TABLES.MODULES, orphanedModuleIds);
      }

      Logger.log('✅ Modules sync complete');
    } catch (e) {
      Logger.error('Module sync failed', e);
    }
  }

  async syncCollection<T extends { id: string }>(
    table: string,
    localItems: T[],
    toFields: (item: T, index: number) => Record<string, any>
  ): Promise<void> {
    try {
      Logger.log(`🔄 Syncing ${localItems.length} items to ${table}...`);

      // Save all local items
      for (let i = 0; i < localItems.length; i++) {
        const fields = toFields(localItems[i], i);
        await this.upsertRecord(table, localItems[i].id, fields);
      }

      // Delete orphans
      const remote = await this.fetchAll(table);
      const localIds = new Set(localItems.map(item => item.id));
      const orphans = remote.filter(r => {
        const remoteAppId = String((r.fields as any).id || r.id);
        return !localIds.has(remoteAppId);
      }).map(r => r.id);

      if (orphans.length > 0) {
        Logger.log(`🗑️ Deleting ${orphans.length} orphaned records from ${table}`);
        await this.batchDelete(table, orphans);
      }

      this.clearCache();
      Logger.log(`✅ ${table} sync complete`);
    } catch (e) {
      Logger.error(`${table} sync failed`, e);
    }
  }

  // ═════════════════════════════════════════════════════════════
  //                        UTILITIES
  // ═════════════════════════════════════════════════════════════

  private mapCategory(c: any): any {
    const cat = String(c || '').toUpperCase();
    if (cat === 'SALES' || cat.includes('SALES') || cat.includes('ПРОДАЖ')) return 'SALES';
    if (cat === 'PSYCHOLOGY' || cat.includes('PSYCH') || cat.includes('ПСИХОЛ')) return 'PSYCHOLOGY';
    if (cat === 'TACTICS' || cat.includes('TACTIC') || cat.includes('ТАКТИК')) return 'TACTICS';
    return 'GENERAL';
  }

  // Quick connectivity check
  async healthCheck(): Promise<boolean> {
    try {
      await this.request(`${TABLES.CONFIG}?maxRecords=1`, {}, false);
      return true;
    } catch {
      return false;
    }
  }
}

// Export
export const airtableService = new AirtableService();
export const airtable = airtableService;
