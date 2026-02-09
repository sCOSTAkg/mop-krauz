
import { UserProgress, Module, Lesson, Material, Stream, CalendarEvent, ArenaScenario, AppNotification } from '../types';
import { Logger } from './logger';

// Configuration
const DEFAULT_PAT = import.meta.env.VITE_AIRTABLE_PAT || '';
const DEFAULT_BASE_ID = import.meta.env.VITE_AIRTABLE_BASE_ID || '';

// Table names
const TABLES = {
  MODULES: import.meta.env.VITE_AIRTABLE_MODULES_TABLE || 'Modules',
  LESSONS: import.meta.env.VITE_AIRTABLE_LESSONS_TABLE || 'Lessons',
  MATERIALS: import.meta.env.VITE_AIRTABLE_MATERIALS_TABLE || 'Materials',
  STREAMS: import.meta.env.VITE_AIRTABLE_STREAMS_TABLE || 'Streams',
  USERS: import.meta.env.VITE_AIRTABLE_USERS_TABLE || 'Users',
  NOTIFICATIONS: import.meta.env.VITE_AIRTABLE_NOTIFICATIONS_TABLE || 'Notifications',
  SCENARIOS: import.meta.env.VITE_AIRTABLE_SCENARIOS_TABLE || 'Scenarios',
  EVENTS: import.meta.env.VITE_AIRTABLE_EVENTS_TABLE || 'Events',
  CONFIG: import.meta.env.VITE_AIRTABLE_CONFIG_TABLE || 'Config'
};

class AirtableService {
  private baseUrl = 'https://api.airtable.com/v0';
  private baseId: string;
  private pat: string;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 2 * 60 * 1000; // 2 minutes cache (matches sync interval)

  constructor() {
    this.baseId = DEFAULT_BASE_ID;
    this.pat = DEFAULT_PAT;
  }

  // Update config dynamically if needed
  updateConfig(pat: string, baseId: string) {
    this.pat = pat;
    this.baseId = baseId;
    this.clearCache();
  }

  // Clear cache manually
  clearCache() {
    this.cache.clear();
    Logger.log('🧹 Airtable cache cleared');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}, useCache = false): Promise<T> {
    if (!this.pat || !this.baseId) {
      throw new Error('Airtable configuration missing (PAT or Base ID)');
    }

    // Check cache
    if (useCache && this.cache.has(endpoint)) {
      const cached = this.cache.get(endpoint)!;
      if (Date.now() - cached.timestamp < this.CACHE_TTL) {
        Logger.log(`📦 Using cached data for ${endpoint}`);
        return cached.data;
      }
    }

    const url = `${this.baseUrl}/${this.baseId}/${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${this.pat}`,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    try {
      const response = await fetch(url, { ...options, headers });
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`🚨 Airtable API Error [${response.status}]:`, errorText);
        throw new Error(`Airtable API error: ${response.status} - ${errorText}`);
      }
      const data = await response.json();

      // Cache the response
      if (useCache) {
        this.cache.set(endpoint, { data, timestamp: Date.now() });
      }

      return data;
    } catch (error) {
      Logger.error(`Airtable request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // Fetch all modules with lessons - OPTIMIZED
  async fetchModules(): Promise<Module[]> {
    try {
      Logger.log('🔄 Fetching modules with lessons from Airtable...');
      const startTime = Date.now();

      // Fetch modules and lessons in parallel
      const [modulesResponse, lessonsResponse] = await Promise.all([
        this.request<{ records: any[] }>(
          `${TABLES.MODULES}?sort%5B0%5D%5Bfield%5D=sortOrder&sort%5B0%5D%5Bdirection%5D=asc`,
          {},
          true
        ),
        this.request<{ records: any[] }>(
          `${TABLES.LESSONS}?sort%5B0%5D%5Bfield%5D=order&sort%5B0%5D%5Bdirection%5D=asc`,
          {},
          true
        )
      ]);

      Logger.log(`✅ Loaded ${modulesResponse.records.length} modules, ${lessonsResponse.records.length} lessons in ${Date.now() - startTime}ms`);

      // Create lessons map by Airtable Record ID of the Module
      const lessonsMap = new Map<string, Lesson[]>();

      lessonsResponse.records.forEach(lessonRecord => {
        const fields = lessonRecord.fields;

        const lesson: Lesson = {
          id: String(fields.appId || lessonRecord.id),
          title: fields.title || 'Урок без названия',
          description: fields.description || '',
          content: fields.content || '',
          xpReward: Number(fields.xpReward) || 100,
          homeworkType: (fields.homeworkType || 'TEXT') as any,
          homeworkTask: fields.homeworkTask || '',
          aiGradingInstruction: fields.aiGradingInstruction || '',
          videoUrl: fields.videoUrl || ''
        };

        // Get module record IDs from the link field
        const moduleLinks = fields.Module || [];
        const links = Array.isArray(moduleLinks) ? moduleLinks : [moduleLinks];

        links.forEach((moduleRecordId: string) => {
          if (!lessonsMap.has(moduleRecordId)) {
            lessonsMap.set(moduleRecordId, []);
          }
          lessonsMap.get(moduleRecordId)!.push(lesson);
        });
      });

      // Also build reverse lookup: Modules table has a "Lessons" linked field auto-created
      const moduleLessonsLinkMap = new Map<string, Lesson[]>();
      modulesResponse.records.forEach(moduleRecord => {
        const lessonLinks = moduleRecord.fields.Lessons || [];
        if (Array.isArray(lessonLinks) && lessonLinks.length > 0) {
          const lessons: Lesson[] = [];
          lessonLinks.forEach((lessonRecordId: string) => {
            const lessonRecord = lessonsResponse.records.find(l => l.id === lessonRecordId);
            if (lessonRecord) {
              const f = lessonRecord.fields;
              lessons.push({
                id: String(f.appId || lessonRecordId),
                title: f.title || 'Урок',
                description: f.description || '',
                content: f.content || '',
                xpReward: Number(f.xpReward) || 100,
                homeworkType: (f.homeworkType || 'TEXT') as any,
                homeworkTask: f.homeworkTask || '',
                aiGradingInstruction: f.aiGradingInstruction || '',
                videoUrl: f.videoUrl || ''
              });
            }
          });
          moduleLessonsLinkMap.set(moduleRecord.id, lessons);
        }
      });

      // Build modules with lessons
      const modules: Module[] = [];

      modulesResponse.records.forEach(moduleRecord => {
        const fields = moduleRecord.fields;
        const airtableRecordId = moduleRecord.id;

        // Primary: lessons linked via Module field on Lessons table
        let moduleLessons = lessonsMap.get(airtableRecordId) || [];

        // Fallback: reverse link from Modules table
        if (moduleLessons.length === 0) {
          moduleLessons = moduleLessonsLinkMap.get(airtableRecordId) || [];
        }

        const module: Module = {
          id: String(fields.id || airtableRecordId),
          title: fields.title || 'Модуль',
          description: fields.description || '',
          category: this.mapCategory(fields.category),
          minLevel: Number(fields.minLevel) || 1,
          imageUrl: fields.imageUrl || '',
          videoUrl: fields.videoUrl || '',
          pdfUrl: fields.pdfUrl || '',
          lessons: moduleLessons
        };

        modules.push(module);
      });

      return modules;
    } catch (error) {
      Logger.error('❌ Failed to fetch modules', error);
      return [];
    }
  }

  // Fetch materials
  async fetchMaterials(): Promise<Material[]> {
    try {
      const data = await this.request<{ records: any[] }>(TABLES.MATERIALS, {}, true);
      return data.records.map(record => ({
        id: String(record.fields.id || record.id),
        title: record.fields.title || '',
        description: record.fields.description || '',
        type: (record.fields.type || 'LINK') as any,
        url: record.fields.url || ''
      }));
    } catch (error) {
      return [];
    }
  }

  // Fetch streams
  async fetchStreams(): Promise<Stream[]> {
    try {
      const data = await this.request<{ records: any[] }>(TABLES.STREAMS, {}, true);
      return data.records.map(record => ({
        id: String(record.fields.id || record.id),
        title: record.fields.title || '',
        date: record.fields.date || new Date().toISOString(),
        youtubeUrl: record.fields.youtubeUrl || '',
        status: (record.fields.status || 'UPCOMING') as any
      }));
    } catch (error) {
      return [];
    }
  }

  // Fetch scenarios for Arena
  async fetchScenarios(): Promise<ArenaScenario[]> {
    try {
      const data = await this.request<{ records: any[] }>(TABLES.SCENARIOS, {}, true);
      return data.records.map(record => ({
        id: String(record.fields.id || record.id),
        title: record.fields.title || '',
        difficulty: (record.fields.difficulty || 'Medium') as any,
        clientRole: record.fields.clientRole || '',
        objective: record.fields.objective || '',
        initialMessage: record.fields.initialMessage || ''
      }));
    } catch (error) {
      return [];
    }
  }

  // Fetch calendar events
  async fetchEvents(): Promise<CalendarEvent[]> {
    try {
      const data = await this.request<{ records: any[] }>(TABLES.EVENTS, {}, true);
      return data.records.map(record => ({
        id: String(record.fields.id || record.id),
        title: record.fields.title || '',
        description: record.fields.description || '',
        date: record.fields.date || new Date().toISOString(),
        type: (record.fields.type || 'OTHER') as any,
        durationMinutes: Number(record.fields.durationMinutes) || 60
      }));
    } catch (error) {
      return [];
    }
  }

  // Fetch app config
  async fetchConfig(): Promise<Record<string, string>> {
    try {
      const data = await this.request<{ records: any[] }>(TABLES.CONFIG, {}, true);
      const config: Record<string, string> = {};
      data.records.forEach(record => {
        const key = record.fields.key;
        const value = record.fields.value;
        if (key) config[key] = value || '';
      });
      return config;
    } catch (error) {
      return {};
    }
  }

  // Sync user progress
  async syncUserProgress(user: UserProgress): Promise<boolean> {
    try {
      const telegramId = String(user.telegramId || user.id || '');
      if (!telegramId) return false;

      const checkUrl = `${TABLES.USERS}?filterByFormula={TelegramId}="${telegramId}"`;
      const checkData = await this.request<{ records: any[] }>(checkUrl);

      const userData = {
        TelegramId: telegramId,
        Name: user.name,
        Role: user.role,
        XP: user.xp,
        Level: user.level,
        Data: JSON.stringify({
          completedLessonIds: user.completedLessonIds,
          submittedHomeworks: user.submittedHomeworks,
          chatHistory: user.chatHistory,
          notebook: user.notebook,
          habits: user.habits,
          goals: user.goals,
          theme: user.theme,
          notifications: user.notifications
        }),
        LastSync: Date.now()
      };

      if (checkData.records.length > 0) {
        const recordId = checkData.records[0].id;
        await this.request(`${TABLES.USERS}/${recordId}`, {
          method: 'PATCH',
          body: JSON.stringify({ fields: userData })
        });
      } else {
        await this.request(TABLES.USERS, {
          method: 'POST',
          body: JSON.stringify({ fields: userData })
        });
      }
      return true;
    } catch (error) {
      return false;
    }
  }

  // Load user progress
  async loadUserProgress(telegramId: string): Promise<UserProgress | null> {
    try {
      const data = await this.request<{ records: any[] }>(
        `${TABLES.USERS}?filterByFormula={TelegramId}="${telegramId}"`
      );

      if (data.records.length === 0) return null;

      const record = data.records[0];
      const fields = record.fields;
      const parsedData = fields.Data ? JSON.parse(String(fields.Data)) : {};

      return {
        id: String(fields.TelegramId),
        telegramId: String(fields.TelegramId),
        name: String(fields.Name || 'User'),
        role: (fields.Role || 'STUDENT') as any,
        isAuthenticated: true,
        xp: Number(fields.XP) || 0,
        level: Number(fields.Level) || 1,
        completedLessonIds: parsedData.completedLessonIds || [],
        submittedHomeworks: parsedData.submittedHomeworks || [],
        chatHistory: parsedData.chatHistory || [],
        notebook: parsedData.notebook || [],
        habits: parsedData.habits || [],
        goals: parsedData.goals || [],
        theme: parsedData.theme || 'LIGHT',
        notifications: parsedData.notifications || {
          pushEnabled: false,
          telegramSync: false,
          deadlineReminders: false,
          chatNotifications: false
        },
        airtableRecordId: record.id,
        lastSyncTimestamp: Number(fields.LastSync) || Date.now(),
        registrationDate: record.createdTime
      } as UserProgress;
    } catch (error) {
      return null;
    }
  }

  // Get Leaderboard
  async getLeaderboard(): Promise<UserProgress[]> {
    try {
      const data = await this.request<{ records: any[] }>(
        `${TABLES.USERS}?sort%5B0%5D%5Bfield%5D=XP&sort%5B0%5D%5Bdirection%5D=desc&maxRecords=50`,
        {},
        true
      );

      return data.records.map(record => ({
        id: String(record.fields.TelegramId),
        telegramId: String(record.fields.TelegramId),
        name: String(record.fields.Name || 'Аноним'),
        role: record.fields.Role as any,
        xp: Number(record.fields.XP) || 0,
        level: Number(record.fields.Level) || 1,
        isAuthenticated: false
      } as UserProgress));
    } catch (error) {
      return [];
    }
  }

  // Fetch Notifications
  async fetchNotifications(): Promise<AppNotification[]> {
    try {
      const data = await this.request<{ records: any[] }>(
        `${TABLES.NOTIFICATIONS}?sort%5B0%5D%5Bfield%5D=date&sort%5B0%5D%5Bdirection%5D=desc&maxRecords=20`,
        {},
        true
      );

      return data.records.map(record => ({
        id: record.id,
        title: record.fields.title || '',
        message: record.fields.message || '',
        type: (record.fields.type || 'INFO') as any,
        date: record.fields.date || record.createdTime,
        link: record.fields.link,
        targetUserId: record.fields.targetUserId,
        targetRole: record.fields.targetRole
      }));
    } catch (error) {
      return [];
    }
  }

  // Save a single module (upsert by custom 'id' field)
  async saveModule(module: Module, sortOrder: number = 0): Promise<void> {
    try {
      const fields: Record<string, any> = {
        id: module.id,
        title: module.title,
        description: module.description,
        category: module.category,
        minLevel: module.minLevel,
        imageUrl: module.imageUrl || '',
        videoUrl: module.videoUrl || '',
        pdfUrl: module.pdfUrl || '',
        sortOrder: sortOrder
      };

      // Check if record exists
      const checkData = await this.request<{ records: any[] }>(
        `${TABLES.MODULES}?filterByFormula={id}="${module.id}"`
      );

      if (checkData.records.length > 0) {
        const recordId = checkData.records[0].id;
        await this.request(`${TABLES.MODULES}/${recordId}`, {
          method: 'PATCH',
          body: JSON.stringify({ fields })
        });
      } else {
        await this.request(TABLES.MODULES, {
          method: 'POST',
          body: JSON.stringify({ fields })
        });
      }
      this.clearCache();
    } catch (error) {
      Logger.error(`Failed to save module ${module.id}`, error);
    }
  }

  // Get the Airtable record ID of a module by its app-level 'id' field
  private async getModuleRecordId(moduleAppId: string): Promise<string | null> {
    try {
      const data = await this.request<{ records: any[] }>(
        `${TABLES.MODULES}?filterByFormula={id}="${moduleAppId}"`
      );
      return data.records.length > 0 ? data.records[0].id : null;
    } catch {
      return null;
    }
  }

  // Save a single lesson (upsert by 'appId' field, link to Module via record ID)
  async saveLesson(lesson: Lesson, moduleId: string, sortOrder: number = 0): Promise<void> {
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
        order: sortOrder
      };

      // Resolve module's Airtable record ID for the linked record field
      const moduleRecordId = await this.getModuleRecordId(moduleId);
      if (moduleRecordId) {
        fields.Module = [moduleRecordId];
      }

      // Check if lesson record exists by appId
      const checkData = await this.request<{ records: any[] }>(
        `${TABLES.LESSONS}?filterByFormula={appId}="${lesson.id}"`
      );

      if (checkData.records.length > 0) {
        const recordId = checkData.records[0].id;
        await this.request(`${TABLES.LESSONS}/${recordId}`, {
          method: 'PATCH',
          body: JSON.stringify({ fields })
        });
      } else {
        await this.request(TABLES.LESSONS, {
          method: 'POST',
          body: JSON.stringify({ fields })
        });
      }
      this.clearCache();
    } catch (error) {
      Logger.error(`Failed to save lesson ${lesson.id}`, error);
    }
  }

  // Helper methods
  private mapCategory(airtableCategory: any): any {
    const category = String(airtableCategory || '').toUpperCase();
    if (category === 'SALES' || category.includes('SALES') || category.includes('ПРОДАЖ')) return 'SALES';
    if (category === 'PSYCHOLOGY' || category.includes('PSYCH') || category.includes('ПСИХОЛ')) return 'PSYCHOLOGY';
    if (category === 'TACTICS' || category.includes('TACTIC') || category.includes('ТАКТИК')) return 'TACTICS';
    return 'GENERAL';
  }
}

// Export both for backward compatibility
export const airtableService = new AirtableService();
export const airtable = airtableService;
