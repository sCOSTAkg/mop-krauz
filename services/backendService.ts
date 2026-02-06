
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { Storage } from './storage';
import { UserProgress, Module, Material, Stream, CalendarEvent, ArenaScenario, AppNotification, UserRole } from '../types';
import { Logger } from './logger';
import { COURSE_MODULES, MOCK_EVENTS, MOCK_MATERIALS, MOCK_STREAMS } from '../constants';
import { SCENARIOS } from '../components/SalesArena';

type ContentTable = 'modules' | 'materials' | 'streams' | 'events' | 'scenarios' | 'notifications';

class BackendService {
  
  // --- USER SYNC (EXISTING) ---

  async syncUser(localUser: UserProgress): Promise<UserProgress> {
    if (!isSupabaseConfigured() || !localUser.telegramId) {
      return localUser;
    }

    try {
      const { data, error } = await supabase!
        .from('profiles')
        .select('*')
        .eq('telegram_id', localUser.telegramId)
        .single();

      if (error && error.code !== 'PGRST116') { 
        Logger.error('Backend: User fetch error', error);
        return localUser;
      }

      if (data) {
        // Merge cloud data with local
        const mergedUser: UserProgress = {
          ...localUser,
          ...data.data, // JSONB fields
          xp: data.xp,
          level: data.level,
          role: data.role as any,
          name: data.username || localUser.name,
          isAuthenticated: true
        };
        Storage.set('progress', mergedUser);
        return mergedUser;
      } 
      
      // Create if not exists
      await this.saveUser(localUser);
      return localUser;

    } catch (e) {
      Logger.error('Backend: User sync exception', e);
      return localUser;
    }
  }

  async saveUser(user: UserProgress) {
    Storage.set('progress', user);

    if (!isSupabaseConfigured() || !user.telegramId) return;

    try {
      const { id, telegramId, telegramUsername, xp, level, role, ...rest } = user;
      
      const payload = {
        telegram_id: telegramId,
        username: user.name,
        xp: xp,
        level: level,
        role: role,
        data: rest 
      };

      const { error } = await supabase!
        .from('profiles')
        .upsert(payload, { onConflict: 'telegram_id' });

      if (error) Logger.error('Backend: Save user error', error);

    } catch (e) {
      Logger.error('Backend: Save user exception', e);
    }
  }

  // --- CONTENT SYNC (NEW) ---

  /**
   * Fetches all app content. If Cloud is empty, seeds it with Constants.
   */
  async fetchAllContent() {
      if (!isSupabaseConfigured()) return null;

      try {
          const [modules, materials, streams, events, scenarios] = await Promise.all([
              this.fetchCollection<Module>('modules', COURSE_MODULES),
              this.fetchCollection<Material>('materials', MOCK_MATERIALS),
              this.fetchCollection<Stream>('streams', MOCK_STREAMS),
              this.fetchCollection<CalendarEvent>('events', MOCK_EVENTS),
              this.fetchCollection<ArenaScenario>('scenarios', SCENARIOS),
          ]);

          return { modules, materials, streams, events, scenarios };
      } catch (e) {
          Logger.error('Backend: Fetch all content failed', e);
          return null;
      }
  }

  /**
   * Generic fetcher. Handles "Empty Table" by seeding initial data.
   */
  private async fetchCollection<T extends { id: string }>(table: ContentTable, defaultData: T[]): Promise<T[]> {
      try {
          const { data, error } = await supabase!.from(table).select('*');
          
          if (error) {
              // Silent fail for non-critical tables if missing
              if (table === 'notifications' && error.code === '42P01') return [];
              
              console.warn(`Backend: Error fetching ${table}`, error.message);
              return defaultData;
          }

          if (!data || data.length === 0) {
              if (table === 'notifications') return []; // Don't seed notifications
              Logger.info(`Backend: ${table} is empty. Seeding...`);
              await this.saveCollection(table, defaultData);
              return defaultData;
          }

          // Unwrap JSONB 'data' column if using that structure, or map rows
          // Scheme: id (text), data (jsonb)
          return data.map(row => row.data as T);

      } catch (e) {
          return defaultData;
      }
  }

  /**
   * Saves a whole collection (replaces all rows or upserts).
   * Strategy: Upsert based on ID.
   */
  async saveCollection<T extends { id: string }>(table: ContentTable, items: T[]) {
      // Update Local Storage first
      const storageKeyMap: Partial<Record<ContentTable, string>> = {
          'modules': 'courseModules',
          'materials': 'materials',
          'streams': 'streams',
          'events': 'events',
          'scenarios': 'scenarios'
      };
      
      const key = storageKeyMap[table];
      if (key) Storage.set(key, items);

      if (!isSupabaseConfigured()) return;

      try {
          // Prepare payload: Map item to { id: item.id, data: item }
          const payload = items.map(item => ({
              id: item.id,
              data: item
          }));

          const { error } = await supabase!
              .from(table)
              .upsert(payload, { onConflict: 'id' });

          if (error) throw error;

          Logger.info(`Backend: Saved ${items.length} items to ${table}`);

      } catch (e: any) {
          Logger.error(`Backend: Save ${table} failed`, e);
      }
  }

  // --- NOTIFICATIONS ---

  async fetchNotifications(): Promise<AppNotification[]> {
      return this.fetchCollection<AppNotification>('notifications', []);
  }

  async sendBroadcast(notification: AppNotification) {
      if (!isSupabaseConfigured()) {
          // Fallback to local
          const current = Storage.get<AppNotification[]>('local_notifications', []);
          Storage.set('local_notifications', [notification, ...current]);
          return;
      }

      try {
          const payload = {
              id: notification.id,
              data: notification
          };
          const { error } = await supabase!.from('notifications').insert(payload);
          if (error) throw error;
      } catch (e) {
          Logger.error('Backend: Send broadcast failed', e);
          throw e;
      }
  }

  // --- USER MANAGEMENT ---

  async getLeaderboard(): Promise<UserProgress[]> {
     if (!isSupabaseConfigured()) {
         return Storage.get<UserProgress[]>('allUsers', []);
     }

     try {
         const { data, error } = await supabase!
            .from('profiles')
            .select('*')
            .order('xp', { ascending: false })
            .limit(50);
         
         if (error) throw error;

         return data.map((row: any) => ({
             name: row.username,
             xp: row.xp,
             level: row.level,
             role: row.role,
             telegramId: row.telegram_id,
             avatarUrl: row.data?.avatarUrl,
             isAuthenticated: true,
             completedLessonIds: [],
             submittedHomeworks: [],
             chatHistory: [],
             notebook: [],
             theme: 'LIGHT',
             notifications: { pushEnabled: false, telegramSync: false, deadlineReminders: false, chatNotifications: false },
             ...row.data // Spread rest of data
         }));
     } catch (e) {
         Logger.error('Backend: Leaderboard error', e);
         return Storage.get<UserProgress[]>('allUsers', []);
     }
  }
}

export const Backend = new BackendService();
