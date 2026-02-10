import { useCallback, useEffect } from 'react';
import { UserProgress } from '../types';
import { Backend } from '../services/backendService';
import { telegram } from '../services/telegramService';

interface UseAuthOptions {
  userProgress: UserProgress;
  setUserProgress: React.Dispatch<React.SetStateAction<UserProgress>>;
  syncData: () => Promise<void>;
  addToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

export function useAuth({ userProgress, setUserProgress, syncData, addToast }: UseAuthOptions) {
  const handleLogin = useCallback(async (userData: any) => {
    addToast('info', 'Синхронизация данных...');
    const tempUser = { ...userProgress, ...userData, isAuthenticated: true };
    const syncedUser = await Backend.syncUser(tempUser);
    setUserProgress(syncedUser);
    Backend.saveUser(syncedUser);
    await syncData();
    addToast('success', 'С возвращением, боец!');
  }, [userProgress, setUserProgress, syncData, addToast]);

  // ─── Auto-login via Telegram TWA ────────────────────────────
  useEffect(() => {
    if (userProgress.isAuthenticated) return;
    if (!telegram.isTWA) return;

    const authData = telegram.getAuthData();
    if (!authData) return;

    // Auto-login with Telegram user data
    const tgUser = {
      name: authData.name || 'Спартанец',
      telegramId: authData.telegramId,
      username: authData.username,
      photoUrl: authData.photoUrl,
      isPremium: authData.isPremium,
      authSource: 'telegram_twa' as const,
    };

    handleLogin(tgUser).catch(err => {
      console.error('TWA auto-login failed:', err);
    });
  }, [userProgress.isAuthenticated, handleLogin]);

  return { handleLogin };
}
