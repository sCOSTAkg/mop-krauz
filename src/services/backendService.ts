
import { UserProgress, AppConfig, Module, Material, Stream, CalendarEvent, ArenaScenario, AppNotification } from '../types';
import { Logger } from './logger';
import { airtableService } from './airtableService';
import { Storage } from './storage';

// ─── Retry helper ───────────────────────────────────────────────
async function withRetry<T>(fn: () => Promise<T>, retries = 1, delay = 500): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0) throw error;
    Logger.log(`⚠️ Retry (${retries} left), waiting ${delay}ms...`);
    await new Promise(r => setTimeout(r, delay));
    return withRetry(fn, retries - 1, delay * 1.5);
  }
}

// ─── Content hash for delta detection ───────────────────────────
function quickHash(obj: any): string {
  const str = JSON.stringify(obj);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + ch;
    hash |= 0;
  }
  return hash.toString(36);
}

// ═══════════════════════════════════════════════════════════════
//                        BACKEND SERVICE
// ═══════════════════════════════════════════════════════════════

export const Backend = {
  // ─── Content Fetching ────────────────────────────────────────
  async fetchAllContent(): Promise<{
    modules: Module[];
    materials: Material[];
    streams: Stream[];
    events: CalendarEvent[];
    scenarios: ArenaScenario[];
  } | null> {
    try {
      if (!airtableService.isConfigured()) {
        Logger.log('⚠️ Airtable not configured, using local cache');
        return this._getCachedContent();
      }

      Logger.log('📄 Fetching all content from Airtable...');

      const [modsR, matsR, strsR, evtsR, scensR] = await Promise.allSettled([
        withRetry(() => airtableService.fetchModules()),
        withRetry(() => airtableService.fetchMaterials()),
        withRetry(() => airtableService.fetchStreams()),
        withRetry(() => airtableService.fetchEvents()),
        withRetry(() => airtableService.fetchScenarios()),
      ]);

      const resolve = <T>(r: PromiseSettledResult<T[]>, key: string, fallbackKey: string): T[] => {
        if (r.status === 'fulfilled' && r.value.length > 0) {
          Storage.set(fallbackKey, r.value);
          return r.value;
        }
        if (r.status === 'rejected') Logger.log(`⚠️ ${key} fetch failed`, r.reason);
        return Storage.get<T[]>(fallbackKey, []);
      };

      const modules = resolve(modsR, 'Modules', 'courseModules');
      const materials = resolve(matsR, 'Materials', 'materials');
      const streams = resolve(strsR, 'Streams', 'streams');
      const events = resolve(evtsR, 'Events', 'events');
      const scenarios = resolve(scensR, 'Scenarios', 'scenarios');

      Logger.log('✅ Content loaded:', { modules: modules.length, materials: materials.length, streams: streams.length, events: events.length, scenarios: scenarios.length });
      return { modules, materials, streams, events, scenarios };
    } catch (error) {
      Logger.log('❌ Content fetch failed, using cache', error);
      return this._getCachedContent();
    }
  },

  _getCachedContent() {
    return {
      modules: Storage.get<Module[]>('courseModules', []),
      materials: Storage.get<Material[]>('materials', []),
      streams: Storage.get<Stream[]>('streams', []),
      events: Storage.get<CalendarEvent[]>('events', []),
      scenarios: Storage.get<ArenaScenario[]>('scenarios', []),
    };
  },

  // ─── Config ──────────────────────────────────────────────────
  async fetchGlobalConfig(fallback: AppConfig): Promise<AppConfig> {
    if (!airtableService.isConfigured()) return fallback;
    try {
      const remote = await airtableService.fetchConfig();
      if (Object.keys(remote).length === 0) return fallback;

      const merged: AppConfig = { ...fallback };
      if (remote.appName) merged.appName = remote.appName;
      if (remote.appDescription) merged.appDescription = remote.appDescription;
      if (remote.primaryColor) merged.primaryColor = remote.primaryColor;
      if (remote.systemInstruction) merged.systemInstruction = remote.systemInstruction;
      if (remote.welcomeVideoUrl) merged.welcomeVideoUrl = remote.welcomeVideoUrl;
      if (remote.welcomeMessage) merged.welcomeMessage = remote.welcomeMessage;
      if (remote.features) {
        try { merged.features = { ...merged.features, ...JSON.parse(remote.features) }; } catch {}
      }
      if (remote.aiConfig) {
        try { merged.aiConfig = { ...merged.aiConfig, ...JSON.parse(remote.aiConfig) }; } catch {}
      }
      if (remote.systemAgent) {
        try { merged.systemAgent = { ...merged.systemAgent, ...JSON.parse(remote.systemAgent) }; } catch {}
      }

      Storage.set('appConfig', merged);
      Logger.log('✅ Config loaded from Airtable');
      return merged;
    } catch (e) {
      Logger.log('⚠️ Config fetch failed, using fallback');
      return fallback;
    }
  },

  async saveGlobalConfig(config: AppConfig): Promise<void> {
    Storage.set('appConfig', config);

    if (!airtableService.isConfigured()) {
      Logger.log('📦 Config saved to localStorage (Airtable not configured)');
      return;
    }

    try {
      await withRetry(() => airtableService.saveConfig(config));
      Logger.log('✅ Config saved to Airtable');
    } catch (e) {
      Logger.error('Failed to save config to Airtable', e);
    }
  },

  // ─── User Sync ──────────────────────────────────────────────
  async syncUser(user: UserProgress): Promise<UserProgress> {
    try {
      if (!airtableService.isConfigured()) return user;

      const success = await withRetry(() => airtableService.syncUserProgress(user));
      if (success && user.telegramId) {
        const fresh = await airtableService.loadUserProgress(user.telegramId);
        if (fresh) return fresh;
      }
    } catch (e) {
      Logger.log('⚠️ User sync failed, using local', e);
    }
    return user;
  },

  async saveUser(user: UserProgress): Promise<void> {
    try {
      if (airtableService.isConfigured()) {
        await withRetry(() => airtableService.syncUserProgress(user));
      }
    } catch (e) {
      Logger.log('⚠️ Failed to save user to Airtable', e);
    }
  },

  async getLeaderboard(): Promise<UserProgress[]> {
    try {
      if (!airtableService.isConfigured()) return [];
      return await withRetry(() => airtableService.getLeaderboard());
    } catch { return []; }
  },

  // ─── Notifications ──────────────────────────────────────────
  async fetchNotifications(): Promise<AppNotification[]> {
    try {
      if (!airtableService.isConfigured()) return [];
      return await withRetry(() => airtableService.fetchNotifications());
    } catch { return []; }
  },

  async sendBroadcast(notification: AppNotification): Promise<void> {
    if (!airtableService.isConfigured()) {
      Logger.log('📦 Broadcast saved locally only (Airtable not configured)');
      return;
    }
    try {
      await withRetry(() => airtableService.sendNotification(notification));
      Logger.log('✅ Broadcast saved to Airtable');
    } catch (e) {
      Logger.error('Failed to save broadcast', e);
    }
  },

  // ═══════════════════════════════════════════════════════════
  //              COLLECTION SAVE (All entity types)
  // ═══════════════════════════════════════════════════════════

  async saveCollection(type: string, data: any[]): Promise<void> {
    // Always persist to localStorage first (offline-first)
    const storageKey = type === 'modules' ? 'courseModules' : type;
    Storage.set(storageKey, data);

    if (!airtableService.isConfigured()) {
      Logger.log(`📦 ${type} saved to localStorage (Airtable not configured)`);
      return;
    }

    // Background sync — don't block UI
    this._syncToAirtable(type, data).catch(e =>
      Logger.error(`Background sync failed for ${type}`, e)
    );
  },

  async _syncToAirtable(type: string, data: any[]): Promise<void> {
    Logger.log(`📤 Syncing ${data.length} ${type} to Airtable...`);

    try {
      switch (type) {
        case 'modules':
          await airtableService.syncModules(data as Module[]);
          break;

        case 'materials':
          await airtableService.syncCollection(
            'Materials',
            data as Material[],
            (mat, i) => ({
              id: mat.id,
              title: mat.title,
              description: mat.description || '',
              type: mat.type,
              url: mat.url || '',
              sortOrder: i,
            })
          );
          break;

        case 'streams':
          await airtableService.syncCollection(
            'Streams',
            data as Stream[],
            (s) => ({
              id: s.id,
              title: s.title,
              date: s.date,
              youtubeUrl: s.youtubeUrl || '',
              status: s.status,
            })
          );
          break;

        case 'events':
          await airtableService.syncCollection(
            'Events',
            data as CalendarEvent[],
            (ev) => {
              const dateStr = ev.date instanceof Date ? ev.date.toISOString() : ev.date;
              return {
                id: ev.id,
                title: ev.title,
                description: ev.description || '',
                date: dateStr,
                type: ev.type,
                durationMinutes: ev.durationMinutes || 60,
              };
            }
          );
          break;

        case 'scenarios':
          await airtableService.syncCollection(
            'Scenarios',
            data as ArenaScenario[],
            (sc) => ({
              id: sc.id,
              title: sc.title,
              difficulty: sc.difficulty,
              clientRole: sc.clientRole,
              objective: sc.objective || '',
              initialMessage: sc.initialMessage || '',
            })
          );
          break;

        case 'notifications':
          // Notifications are append-only, no sync needed
          Logger.log('📦 Notifications: local storage only');
          break;

        default:
          Logger.log(`📦 Unknown type "${type}" — localStorage only`);
      }
    } catch (e) {
      Logger.error(`Airtable sync failed for ${type}`, e);
    }
  },

  // ─── Health Check ───────────────────────────────────────────
  async healthCheck(): Promise<{ airtable: boolean; configured: boolean; timestamp: string }> {
    const health = {
      airtable: false,
      configured: airtableService.isConfigured(),
      timestamp: new Date().toISOString(),
    };

    if (health.configured) {
      health.airtable = await airtableService.healthCheck();
    }

    Logger.log('🏥 Health check:', health);
    return health;
  },
};
