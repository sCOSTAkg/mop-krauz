
import { useEffect, useRef, useCallback } from 'react';
import { UserProgress, Module, Material, Stream, CalendarEvent, ArenaScenario, AppNotification } from '../types';
import { Backend } from '../services/backendService';
import { Logger } from '../services/logger';
import { supabaseService, RealtimePayload } from '../services/supabaseService';

// ─── Config ─────────────────────────────────────────────────────
const SYNC_INTERVAL = 120_000;       // 2 minutes (fallback for when realtime is not available)
const FAST_SYNC_INTERVAL = 30_000;   // 30s after user action
const MAX_CONSECUTIVE_ERRORS = 3;

interface UseSyncOptions {
  userProgressRef: React.MutableRefObject<UserProgress>;
  setModules: (m: Module[]) => void;
  setMaterials: (m: Material[]) => void;
  setStreams: (s: Stream[]) => void;
  setEvents: (e: CalendarEvent[]) => void;
  setScenarios: (s: ArenaScenario[]) => void;
  setNotifications: (n: AppNotification[]) => void;
  setAllUsers: (u: UserProgress[]) => void;
  setUserProgress: React.Dispatch<React.SetStateAction<UserProgress>>;
}

// Quick content hash for delta detection
function contentHash(data: any): string {
  const str = JSON.stringify(data);
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return h.toString(36);
}

export function useSync(opts: UseSyncOptions) {
  const syncingRef = useRef(false);
  const errorCountRef = useRef(0);
  const lastHashRef = useRef<Record<string, string>>({});
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const syncData = useCallback(async (force = false) => {
    if (syncingRef.current) return;
    syncingRef.current = true;

    try {
      // ─── 1. Fetch all content ──────────────────────────────
      const content = await Backend.fetchAllContent();
      if (content) {
        // Only update state if data actually changed (delta detection)
        const updates: Array<[string, any[], (d: any) => void]> = [
          ['modules', content.modules, opts.setModules],
          ['materials', content.materials, opts.setMaterials],
          ['streams', content.streams, opts.setStreams],
          ['events', content.events, opts.setEvents],
          ['scenarios', content.scenarios, opts.setScenarios],
        ];

        for (const [key, data, setter] of updates) {
          if (data.length === 0 && !force) continue; // Don't wipe with empty on non-forced sync

          const hash = contentHash(data);
          if (hash !== lastHashRef.current[key] || force) {
            setter(data);
            lastHashRef.current[key] = hash;
          }
        }
      }

      // ─── 2. Fetch notifications ────────────────────────────
      const rawNotifs = await Backend.fetchNotifications();
      if (rawNotifs.length > 0) {
        const user = opts.userProgressRef.current;
        const myNotifs = rawNotifs.filter(n => {
          if (n.targetUserId && n.targetUserId !== user.telegramId) return false;
          if (n.targetRole && n.targetRole !== 'ALL' && n.targetRole !== user.role) return false;
          return true;
        });

        const notifHash = contentHash(myNotifs);
        if (notifHash !== lastHashRef.current['notifications']) {
          opts.setNotifications(myNotifs);
          lastHashRef.current['notifications'] = notifHash;
        }
      }

      // ─── 3. Fetch leaderboard / all users ──────────────────
      const remoteUsers = await Backend.getLeaderboard();
      if (remoteUsers.length > 0) {
        const usersHash = contentHash(remoteUsers);
        if (usersHash !== lastHashRef.current['users']) {
          opts.setAllUsers(remoteUsers);
          lastHashRef.current['users'] = usersHash;
        }
      }

      // ─── 4. Sync current user ──────────────────────────────
      const currentUser = opts.userProgressRef.current;
      if (currentUser.isAuthenticated) {
        const freshUser = await Backend.syncUser(currentUser);
        // Only update if remote has different critical data
        if (
          freshUser.xp !== currentUser.xp ||
          freshUser.level !== currentUser.level ||
          freshUser.role !== currentUser.role
        ) {
          opts.setUserProgress(prev => ({
            ...prev,
            xp: freshUser.xp,
            level: freshUser.level,
            role: freshUser.role,
          }));
        }
      }

      // Reset error count on success
      errorCountRef.current = 0;
    } catch (error) {
      errorCountRef.current++;
      Logger.error(`Sync failed (${errorCountRef.current}/${MAX_CONSECUTIVE_ERRORS})`, error);

      // Back off if too many errors
      if (errorCountRef.current >= MAX_CONSECUTIVE_ERRORS) {
        Logger.log('⛔ Too many sync errors — pausing sync for 5 minutes');
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          setTimeout(() => {
            errorCountRef.current = 0;
            startInterval(SYNC_INTERVAL);
          }, 5 * 60_000);
        }
      }
    } finally {
      syncingRef.current = false;
    }
  }, [opts]);

  // ─── Interval management ────────────────────────────────────
  const startInterval = useCallback((ms: number) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => syncData(), ms);
  }, [syncData]);

  // ─── Real-time sync setup ───────────────────────────────────
  useEffect(() => {
    const unsubscribers: Array<() => void> = [];

    if (supabaseService.isReady()) {
      Logger.log('🚀 Setting up real-time sync...');

      // Handle real-time updates
      const handleRealtimeUpdate = (payload: RealtimePayload) => {
        Logger.log(`📡 Real-time ${payload.eventType} on ${payload.table}`);
        // Trigger immediate sync when data changes
        syncData(true);
      };

      // Subscribe to all relevant tables
      const tables = ['modules', 'materials', 'streams', 'events', 'scenarios', 'notifications'];
      tables.forEach(table => {
        const unsub = supabaseService.subscribe(table, handleRealtimeUpdate);
        unsubscribers.push(unsub);
      });

      // Subscribe to user-specific updates
      const currentUser = opts.userProgressRef.current;
      if (currentUser.isAuthenticated && currentUser.telegramId) {
        const unsub = supabaseService.subscribe(
          'users',
          handleRealtimeUpdate,
          { column: 'telegram_id', value: currentUser.telegramId }
        );
        unsubscribers.push(unsub);
      }

      Logger.log('✅ Real-time subscriptions active');
    } else {
      Logger.log('⚠️ Real-time sync not available - using polling mode');
    }

    return () => {
      // Cleanup all subscriptions
      unsubscribers.forEach(unsub => unsub());
    };
  }, [opts.userProgressRef.current.telegramId, syncData]);

  // ─── Initial sync + periodic (fallback) ─────────────────────
  useEffect(() => {
    syncData(true); // Force full sync on mount

    // If real-time is not available, use polling as fallback
    if (!supabaseService.isReady()) {
      Logger.log('📊 Starting polling mode (interval: 2 min)');
      startInterval(SYNC_INTERVAL);
    } else {
      Logger.log('✅ Real-time mode active - polling disabled');
    }

    // Sync when tab becomes visible again
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        Logger.log('👁 Tab visible — triggering sync');
        syncData();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Sync before tab close (user data only)
    const handleBeforeUnload = () => {
      const user = opts.userProgressRef.current;
      if (user.isAuthenticated) {
        // Sync to both Airtable and Supabase
        try {
          navigator.sendBeacon?.('/api/sync', JSON.stringify({ user }));
          supabaseService.syncUser(user);
        } catch { /* fallback is localStorage, already saved */ }
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [syncData, startInterval, opts]);

  // ─── Public API ─────────────────────────────────────────────
  /** Trigger immediate sync (e.g., after admin changes) */
  const triggerSync = useCallback(() => {
    syncData(true);
    // Temporarily speed up sync interval after user action
    startInterval(FAST_SYNC_INTERVAL);
    setTimeout(() => startInterval(SYNC_INTERVAL), FAST_SYNC_INTERVAL * 3);
  }, [syncData, startInterval]);

  return { syncData, triggerSync };
}
