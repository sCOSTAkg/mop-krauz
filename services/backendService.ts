import { UserProgress, AppConfig, Module, Material, Stream, CalendarEvent, ArenaScenario, AppNotification } from '../types';
import { COURSE_MODULES, MOCK_MATERIALS, MOCK_STREAMS, MOCK_EVENTS } from '../constants';
import { Logger } from './logger';
import { airtableService } from './airtableService';

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000,
  timeout: 10000
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

      // Fetch all data with retry logic
      const [modules, materials, streams] = await Promise.all([
        retryWithBackoff(() => airtableService.fetchModules()).catch(e => {
          Logger.log('⚠️ Modules fetch failed, using COURSE_MODULES', e);
          return COURSE_MODULES;
        }),
        retryWithBackoff(() => airtableService.fetchMaterials()).catch(e => {
          Logger.log('⚠️ Materials fetch failed, using MOCK_MATERIALS', e);
          return MOCK_MATERIALS;
        }),
        retryWithBackoff(() => airtableService.fetchStreams()).catch(e => {
          Logger.log('⚠️ Streams fetch failed, using MOCK_STREAMS', e);
          return MOCK_STREAMS;
        })
      ]);

      // Events and scenarios fallback to mocks for now
      const events = MOCK_EVENTS;
      const scenarios = [];

      Logger.log('✅ Content loaded:', {
        modules: modules.length,
        materials: materials.length,
        streams: streams.length,
        events: events.length,
        scenarios: scenarios.length
      });

      return { modules, materials, streams, events, scenarios };

    } catch (error) {
      Logger.log('❌ Failed to fetch content, using all fallbacks', error);

      return {
        modules: COURSE_MODULES,
        materials: MOCK_MATERIALS,
        streams: MOCK_STREAMS,
        events: MOCK_EVENTS,
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
    // getLeaderboard doesn't exist in airtableService
    Logger.log('📦 getLeaderboard not implemented in Airtable service');
    return [];
  },

  async saveCollection(type: string, data: any): Promise<void> {
    // saveCollection doesn't exist in airtableService
    Logger.log(`📦 saveCollection(\"${type}\") not implemented - using LocalStorage only`);
  },

  async fetchNotifications(): Promise<AppNotification[]> {
    // fetchNotifications doesn't exist in airtableService  
    Logger.log('📦 fetchNotifications not implemented in Airtable service');
    return [];
  },

  async sendBroadcast(notification: AppNotification): Promise<void> {
    // sendBroadcast doesn't exist in airtableService
    Logger.log('📦 sendBroadcast not implemented in Airtable service');
  },

  async saveGlobalConfig(config: AppConfig): Promise<void> {
    // saveGlobalConfig doesn't exist in airtableService
    Logger.log('📦 saveGlobalConfig not implemented - using LocalStorage only');
  },

  // Health check для диагностики
  async healthCheck(): Promise<{
    airtable: boolean;
    supabase: boolean;
    timestamp: string;
  }> {
    const health = {
      airtable: false,
      supabase: false,
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