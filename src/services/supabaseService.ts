
import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { UserProgress, Module, Material, Stream, CalendarEvent, ArenaScenario, AppNotification } from '../types';
import { Logger } from './logger';

// ─── Configuration ──────────────────────────────────────────────
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const ENABLE_REALTIME = import.meta.env.VITE_ENABLE_REALTIME_SYNC === 'true';

// ─── Types ──────────────────────────────────────────────────────
export type RealtimeEventType = 'INSERT' | 'UPDATE' | 'DELETE';

export interface RealtimePayload<T = any> {
  eventType: RealtimeEventType;
  new: T;
  old: T;
  table: string;
}

export type RealtimeCallback = (payload: RealtimePayload) => void;

// ─── Main Service ───────────────────────────────────────────────
class SupabaseService {
  private client: SupabaseClient | null = null;
  private channels: Map<string, RealtimeChannel> = new Map();
  private isConfigured = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      Logger.log('⚠️ Supabase not configured - real-time sync disabled');
      return;
    }

    if (SUPABASE_URL.includes('XXXX') || SUPABASE_ANON_KEY.includes('XXXX')) {
      Logger.log('⚠️ Supabase credentials are placeholders - real-time sync disabled');
      return;
    }

    if (!ENABLE_REALTIME) {
      Logger.log('⚠️ Real-time sync disabled in config');
      return;
    }

    try {
      this.client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        realtime: {
          params: {
            eventsPerSecond: 10,
          },
        },
      });
      this.isConfigured = true;
      Logger.log('✅ Supabase real-time initialized');
    } catch (error) {
      Logger.error('Failed to initialize Supabase', error);
    }
  }

  /**
   * Check if service is properly configured
   */
  isReady(): boolean {
    return this.isConfigured && this.client !== null;
  }

  /**
   * Subscribe to real-time changes on a table
   */
  subscribe(
    table: string,
    callback: RealtimeCallback,
    filter?: { column: string; value: string }
  ): () => void {
    if (!this.isReady()) {
      Logger.log(`⚠️ Cannot subscribe to ${table} - Supabase not ready`);
      return () => {};
    }

    const channelName = filter
      ? `${table}:${filter.column}=eq.${filter.value}`
      : table;

    // Remove existing channel if any
    if (this.channels.has(channelName)) {
      this.unsubscribe(channelName);
    }

    try {
      const channel = this.client!
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: table,
            ...(filter && { filter: `${filter.column}=eq.${filter.value}` }),
          },
          (payload: any) => {
            Logger.log(`📡 Real-time update on ${table}:`, payload.eventType);
            callback({
              eventType: payload.eventType as RealtimeEventType,
              new: payload.new,
              old: payload.old,
              table: table,
            });
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            Logger.log(`✅ Subscribed to ${table} changes`);
          } else if (status === 'CHANNEL_ERROR') {
            Logger.error(`❌ Failed to subscribe to ${table}`);
          }
        });

      this.channels.set(channelName, channel);

      // Return unsubscribe function
      return () => this.unsubscribe(channelName);
    } catch (error) {
      Logger.error(`Failed to subscribe to ${table}`, error);
      return () => {};
    }
  }

  /**
   * Unsubscribe from a channel
   */
  unsubscribe(channelName: string) {
    const channel = this.channels.get(channelName);
    if (channel) {
      this.client!.removeChannel(channel);
      this.channels.delete(channelName);
      Logger.log(`🔌 Unsubscribed from ${channelName}`);
    }
  }

  /**
   * Unsubscribe from all channels
   */
  unsubscribeAll() {
    this.channels.forEach((_, channelName) => {
      this.unsubscribe(channelName);
    });
    Logger.log('🔌 Unsubscribed from all channels');
  }

  /**
   * Get the Supabase client for direct queries
   */
  getClient(): SupabaseClient | null {
    return this.client;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    if (!this.isReady()) {
      return false;
    }

    try {
      // Try to fetch from a table to verify connection
      const { error } = await this.client!.from('modules').select('id').limit(1);
      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Sync user data to Supabase
   */
  async syncUser(user: UserProgress): Promise<void> {
    if (!this.isReady()) return;

    try {
      const { error } = await this.client!
        .from('users')
        .upsert({
          telegram_id: user.telegramId,
          username: user.username,
          first_name: user.firstName,
          last_name: user.lastName,
          xp: user.xp,
          level: user.level,
          role: user.role,
          completed_lesson_ids: user.completedLessonIds,
          last_sync: new Date().toISOString(),
        }, {
          onConflict: 'telegram_id',
        });

      if (error) {
        Logger.error('Failed to sync user to Supabase', error);
      } else {
        Logger.log('✅ User synced to Supabase');
      }
    } catch (error) {
      Logger.error('Failed to sync user to Supabase', error);
    }
  }

  /**
   * Fetch user data from Supabase
   */
  async fetchUser(telegramId: string): Promise<UserProgress | null> {
    if (!this.isReady()) return null;

    try {
      const { data, error } = await this.client!
        .from('users')
        .select('*')
        .eq('telegram_id', telegramId)
        .single();

      if (error) {
        Logger.error('Failed to fetch user from Supabase', error);
        return null;
      }

      return data as UserProgress;
    } catch (error) {
      Logger.error('Failed to fetch user from Supabase', error);
      return null;
    }
  }
}

// ─── Singleton Export ───────────────────────────────────────────
export const supabaseService = new SupabaseService();
