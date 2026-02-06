
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { Storage } from './storage';
import { UserProgress } from '../types';
import { Logger } from './logger';

class BackendService {
  /**
   * Syncs user profile.
   * Strategy:
   * 1. If Supabase is connected, try to fetch user by Telegram ID.
   * 2. If found, merge cloud data with local (Cloud wins on conflicts usually, or latest).
   * 3. If not found, create new record in Supabase.
   * 4. If Supabase is down/not configured, use LocalStorage only.
   */
  async syncUser(localUser: UserProgress): Promise<UserProgress> {
    if (!isSupabaseConfigured() || !localUser.telegramId) {
      Logger.info('Backend: Offline mode or no Telegram ID. Using local storage.');
      return localUser;
    }

    try {
      // 1. Fetch from Supabase
      const { data, error } = await supabase!
        .from('profiles')
        .select('*')
        .eq('telegram_id', localUser.telegramId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is 'Row not found'
        Logger.error('Backend: Fetch error', error);
        return localUser;
      }

      // 2. Found?
      if (data) {
        Logger.info('Backend: User found, syncing down.');
        // Unpack JSONB data
        const cloudData = data.data || {};
        
        const mergedUser: UserProgress = {
          ...localUser,
          ...cloudData, // Merges notebook, chatHistory, etc.
          xp: data.xp,
          level: data.level,
          role: data.role as any,
          name: data.username || localUser.name,
          isAuthenticated: true
        };
        
        Storage.set('progress', mergedUser);
        return mergedUser;
      } 
      
      // 3. Not Found? Create.
      Logger.info('Backend: User not found, creating.');
      await this.saveUser(localUser);
      return localUser;

    } catch (e) {
      Logger.error('Backend: Sync exception', e);
      return localUser;
    }
  }

  async saveUser(user: UserProgress) {
    Storage.set('progress', user); // Always save local first

    if (!isSupabaseConfigured() || !user.telegramId) return;

    try {
      // Pack heavy/nested fields into 'data' jsonb column
      const { id, telegramId, telegramUsername, xp, level, role, ...rest } = user;
      
      const payload = {
        telegram_id: telegramId,
        username: user.name,
        xp: xp,
        level: level,
        role: role,
        data: rest // Stores completedLessonIds, notebook, theme, avatarUrl, etc.
      };

      const { error } = await supabase!
        .from('profiles')
        .upsert(payload, { onConflict: 'telegram_id' });

      if (error) Logger.error('Backend: Save error', error);
      else Logger.info('Backend: Saved successfully');

    } catch (e) {
      Logger.error('Backend: Save exception', e);
    }
  }

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
             // Map simplified avatar/metadata
             avatarUrl: row.data?.avatarUrl,
             isAuthenticated: true,
             completedLessonIds: [],
             submittedHomeworks: [],
             chatHistory: [],
             notebook: [],
             theme: 'LIGHT',
             notifications: { pushEnabled: false, telegramSync: false, deadlineReminders: false, chatNotifications: false }
         }));
     } catch (e) {
         Logger.error('Backend: Leaderboard error', e);
         return Storage.get<UserProgress[]>('allUsers', []);
     }
  }
}

export const Backend = new BackendService();
