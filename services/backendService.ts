
import { Storage } from './storage';
import { UserProgress, Module, Material, Stream, CalendarEvent, ArenaScenario, AppNotification, AppConfig } from '../types';
import { Logger } from './logger';
import { COURSE_MODULES, MOCK_EVENTS, MOCK_MATERIALS, MOCK_STREAMS } from '../constants';
import { SCENARIOS } from '../components/SalesArena';
import { airtable } from './airtableService';

type ContentTable = 'modules' | 'materials' | 'streams' | 'events' | 'scenarios' | 'notifications' | 'app_settings';

const SYNC_CHANNEL_NAME = 'salespro_sync_channel';

class BackendService {
  private channel: BroadcastChannel;

  constructor() {
      this.channel = new BroadcastChannel(SYNC_CHANNEL_NAME);
  }

  public onSync(callback: () => void) {
      this.channel.onmessage = (event) => {
          if (event.data && event.data.type === 'SYNC_UPDATE') {
              callback();
          }
      };
  }

  private notifySync() {
      this.channel.postMessage({ type: 'SYNC_UPDATE', timestamp: Date.now() });
  }

  // --- CACHE MANAGEMENT ---

  clearAllCache() {
      Logger.log('🧹 Clearing all cache...');

      // Clear Airtable service cache
      airtable.clearCache();

      // Clear LocalStorage cache (keep user data)
      Storage.remove('courseModules');
      Storage.remove('materials');
      Storage.remove('streams');
      Storage.remove('events');
      Storage.remove('scenarios');
      Storage.remove('local_notifications');

      Logger.log('✅ All cache cleared');
      this.notifySync();
  }

  // --- USER SYNC ---

  async syncUser(localUser: UserProgress): Promise<UserProgress> {
    try {
        const success = await airtable.syncUserProgress(localUser);
        if (success) {
            Logger.log('✅ User synced successfully');
            return localUser;
        }
        return localUser;
    } catch (e) {
        Logger.warn('Backend: User Sync failed, using local.', e);
        return localUser;
    }
  }

  async saveUser(user: UserProgress) {
      const updatedUser = { ...user, lastSyncTimestamp: Date.now() };
      this.saveUserLocal(updatedUser);

      // Background sync to Airtable
      airtable.syncUserProgress(updatedUser)
        .then(success => {
          if (success) {
              Logger.log('✅ User synced to Airtable');
          }
        })
        .catch(e => Logger.error("BG Sync Error", e));
  }

  private saveUserLocal(user: UserProgress) {
    Storage.set('progress', user);
    const allUsers = Storage.get<UserProgress[]>('allUsers', []);
    const idx = allUsers.findIndex(u => u.telegramId === user.telegramId);
    const newAllUsers = [...allUsers];
    if (idx >= 0) newAllUsers[idx] = user;
    else newAllUsers.push(user);
    Storage.set('allUsers', newAllUsers);
    this.notifySync(); 
  }

  // --- CONFIG SYNC ---

  async fetchGlobalConfig(defaultConfig: AppConfig): Promise<AppConfig> {
      return Storage.get('appConfig', defaultConfig);
  }

  async saveGlobalConfig(config: AppConfig) {
      Storage.set('appConfig', config);
      this.notifySync();
  }

  // --- CONTENT SYNC (READ) - FIXED FOR NEW USERS ---

  async fetchAllContent() {
      try {
          Logger.log('🔄 Fetching all content from Airtable...');
          const startTime = Date.now();

          // Parallel fetch from Airtable
          const [mods, mats, strs] = await Promise.all([
              airtable.fetchModules(),
              airtable.fetchMaterials(),
              airtable.fetchStreams()
          ]);

          const loadTime = Date.now() - startTime;
          Logger.log(`✅ Content loaded in ${loadTime}ms: ${mods.length} modules, ${mats.length} materials, ${strs.length} streams`);

          // Log module details
          mods.forEach(mod => {
              const lessonCount = mod.lessons?.length || 0;
              const status = lessonCount > 0 ? '✅' : '⚠️';
              Logger.log(`  ${status} ${mod.title}: ${lessonCount} уроков`);
          });

          // 🔥 FIX: ALWAYS use Airtable data (even if empty [])
          // Only fallback to cache/constants if Airtable request FAILED (catch block)
          const content = {
              modules: mods,  // ✅ Always use Airtable data
              materials: mats, // ✅ Always use Airtable data
              streams: strs,   // ✅ Always use Airtable data
              events: Storage.get('events', MOCK_EVENTS),
              scenarios: Storage.get('scenarios', SCENARIOS),
          };

          // Cache locally for offline access
          Storage.set('courseModules', content.modules);
          Storage.set('materials', content.materials);
          Storage.set('streams', content.streams);

          this.notifySync();
          return content;

      } catch (e) {
          Logger.error('❌ Airtable fetch failed, using cached data', e);

          // 🔥 FIX: Only use cache/constants if Airtable is UNAVAILABLE
          return {
              modules: Storage.get('courseModules', COURSE_MODULES),
              materials: Storage.get('materials', MOCK_MATERIALS),
              streams: Storage.get('streams', MOCK_STREAMS),
              events: Storage.get('events', MOCK_EVENTS),
              scenarios: Storage.get('scenarios', SCENARIOS),
          };
      }
  }

  // --- CONTENT SYNC (WRITE) ---

  async saveCollection<T extends { id: string }>(table: ContentTable, items: T[]) {
      const storageKeyMap: Partial<Record<ContentTable, string>> = {
          'modules': 'courseModules',
          'materials': 'materials',
          'streams': 'streams',
          'events': 'events',
          'scenarios': 'scenarios',
          'notifications': 'local_notifications'
      };

      const key = storageKeyMap[table];
      if (key) {
          Storage.set(key, items);
          this.notifySync();
          Logger.log(`💾 Saved ${items.length} ${table} to local storage`);
      }
  }

  // --- NOTIFICATIONS ---

  async fetchNotifications(): Promise<AppNotification[]> {
      return Storage.get<AppNotification[]>('local_notifications', []);
  }

  async sendBroadcast(notification: AppNotification) {
      const current = Storage.get<AppNotification[]>('local_notifications', []);
      Storage.set('local_notifications', [notification, ...current]);
      this.notifySync();
  }

  // --- CRM ---

  async getLeaderboard(): Promise<UserProgress[]> {
    return Storage.get<UserProgress[]>('allUsers', []);
  }
}

export const Backend = new BackendService();
