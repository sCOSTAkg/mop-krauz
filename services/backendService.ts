import { UserProgress, AppConfig, Module, Material, Stream, CalendarEvent, ArenaScenario, AppNotification } from '../types';
import { Logger } from './logger';
import { airtableService } from './airtableService';
import { Storage } from './storage';

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 1,
  retryDelay: 500,
  timeout: 8000
};

// Helper function for retry logic
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries: number = RETRY_CONFIG.maxRetries,
  delay: number = RETRY_CONFIG.retryDelay
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0) throw error;

    Logger.log(`⚠️ Retry attempt remaining: ${retries}, waiting ${delay}ms...`);
    await new Promise(resolve => setTimeout(resolve, delay));

    return retryWithBackoff(fn, retries - 1, delay * 1.5);
  }
}

export const Backend = {
  async fetchGlobalConfig(fallback: AppConfig): Promise<AppConfig> {
    // fetchGlobalConfig doesn't exist in airtableService - using fallback
    Logger.log('📦 Using fallback config (Airtable config not implemented)');
    return fallback;
  },

  async fetchAllContent(): Promise<{
    modules: Module[];
    materials: Material[];
    streams: Stream[];
    events: CalendarEvent[];
    scenarios: ArenaScenario[];
  } | null> {
    try {
      Logger.log('📄 Fetching all content from Airtable...');

      // Fetch all data with retry logic — each fetch is independent
      const [modsResult, matsResult, strsResult, evtsResult, scensResult] = await Promise.allSettled([
        retryWithBackoff(() => airtableService.fetchModules()),
        retryWithBackoff(() => airtableService.fetchMaterials()),
        retryWithBackoff(() => airtableService.fetchStreams()),
        retryWithBackoff(() => airtableService.fetchEvents()),
        retryWithBackoff(() => airtableService.fetchScenarios())
      ]);

      const mods = modsResult.status === 'fulfilled' ? modsResult.value : [];
      const mats = matsResult.status === 'fulfilled' ? matsResult.value : [];
      const strs = strsResult.status === 'fulfilled' ? strsResult.value : [];
      const evts = evtsResult.status === 'fulfilled' ? evtsResult.value : [];
      const scens = scensResult.status === 'fulfilled' ? scensResult.value : [];

      if (modsResult.status === 'rejected') Logger.log('⚠️ Modules fetch failed', modsResult.reason);
      if (matsResult.status === 'rejected') Logger.log('⚠️ Materials fetch failed', matsResult.reason);
      if (strsResult.status === 'rejected') Logger.log('⚠️ Streams fetch failed', strsResult.reason);

      // Always prefer remote data, fall back to cache (never to hardcoded constants)
      const modules = mods.length > 0 ? mods : Storage.get<Module[]>('courseModules', []);
      const materials = mats.length > 0 ? mats : Storage.get<Material[]>('materials', []);
      const streams = strs.length > 0 ? strs : Storage.get<Stream[]>('streams', []);
      const events = evts.length > 0 ? evts : Storage.get<CalendarEvent[]>('events', []);
      const scenarios = scens.length > 0 ? scens : Storage.get<ArenaScenario[]>('scenarios', []);

      Logger.log('✅ Content loaded:', {
        modules: modules.length,
        materials: materials.length,
        streams: streams.length,
        events: events.length,
        scenarios: scenarios.length
      });

      return { modules, materials, streams, events, scenarios };

    } catch (error) {
      Logger.log('❌ Failed to fetch content, using cache fallback', error);

      return {
        modules: Storage.get<Module[]>('courseModules', []),
        materials: Storage.get<Material[]>('materials', []),
        streams: Storage.get<Stream[]>('streams', []),
        events: Storage.get<CalendarEvent[]>('events', []),
        scenarios: []
      };
    }
  },

  async syncUser(user: UserProgress): Promise<UserProgress> {
    try {
      Logger.log('📄 Syncing user with backend...', { id: user.telegramId, name: user.name });

      // Use syncUserProgress instead of syncUser
      const success = await retryWithBackoff(() => 
        airtableService.syncUserProgress(user)
      );

      if (success) {
        Logger.log('✅ User synced successfully');
        // Try to load fresh data
        if (user.telegramId) {
          const freshUser = await airtableService.loadUserProgress(user.telegramId);
          if (freshUser) return freshUser;
        }
      }
    } catch (error) {
      Logger.log('⚠️ User sync failed, using local data', error);
    }

    return user;
  },

  async saveUser(user: UserProgress): Promise<void> {
    try {
      await retryWithBackoff(() => 
        airtableService.syncUserProgress(user)
      );
      Logger.log('✅ User saved to backend');
    } catch (error) {
      Logger.log('⚠️ Failed to save user to backend', error);
      // Data is still in LocalStorage, so not critical
    }
  },

  async getLeaderboard(): Promise<UserProgress[]> {
    try {
      return await retryWithBackoff(() => airtableService.getLeaderboard());
    } catch (error) {
      Logger.log('⚠️ Failed to fetch leaderboard from Airtable', error);
      return [];
    }
  },

  async saveCollection(type: string, data: any[]): Promise<void> {
    Logger.log(`📦 saveCollection("${type}") - saving ${data.length} items`);

    // Always persist to localStorage first
    Storage.set(type === 'modules' ? 'courseModules' : type, data);

    try {
      switch (type) {
        case 'modules': {
          // Save all modules in parallel
          await Promise.all(data.map((mod, i) =>
            airtableService.saveModule(mod as Module, i)
          ));
          // Save all lessons in parallel
          const lessonPromises = data.flatMap((mod, i) => {
            const m = mod as Module;
            return (m.lessons || []).map((lesson, li) =>
              airtableService.saveLesson(lesson, m.id, li)
            );
          });
          if (lessonPromises.length > 0) await Promise.all(lessonPromises);
          Logger.log('✅ Modules + lessons saved to Airtable');
          break;
        }
        default:
          Logger.log(`📦 saveCollection("${type}") - Airtable save not implemented, localStorage only`);
      }
    } catch (error) {
      Logger.error(`Failed to save collection "${type}" to Airtable`, error);
    }
  },

  async fetchNotifications(): Promise<AppNotification[]> {
    try {
      return await retryWithBackoff(() => airtableService.fetchNotifications());
    } catch (error) {
      Logger.log('⚠️ Failed to fetch notifications from Airtable', error);
      return [];
    }
  },

  async sendBroadcast(notification: AppNotification): Promise<void> {
    Logger.log('📦 sendBroadcast - not fully implemented for Airtable yet');
  },

  async saveGlobalConfig(config: AppConfig): Promise<void> {
    Logger.log('📦 saveGlobalConfig - using LocalStorage fallback');
  },

  // Health check для диагностики
  async healthCheck(): Promise<{
    airtable: boolean;
    timestamp: string;
  }> {
    const health = {
      airtable: false,
      timestamp: new Date().toISOString()
    };

    try {
      await airtableService.fetchModules();
      health.airtable = true;
    } catch (e) {
      Logger.log('❌ Airtable health check failed');
    }

    Logger.log('🏥 Health check:', health);
    return health;
  }
};