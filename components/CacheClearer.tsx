
import React, { useState } from 'react';
import { Storage } from '../services/storage';
import { airtable } from '../services/airtableService';
import { Logger } from '../services/logger';

interface CacheClearerProps {
  onCacheCleared?: () => void;
}

export const CacheClearer: React.FC<CacheClearerProps> = ({ onCacheCleared }) => {
  const [isClearing, setIsClearing] = useState(false);
  const [message, setMessage] = useState('');

  const clearAllCache = async () => {
    setIsClearing(true);
    setMessage('Очистка кэша...');

    try {
      // 1. Clear Airtable cache
      airtable.clearCache();
      Logger.log('✅ Airtable cache cleared');

      // 2. Clear LocalStorage cache (keep user data)
      const progress = Storage.get('progress', null);
      const allUsers = Storage.get('allUsers', []);

      Storage.remove('courseModules');
      Storage.remove('materials');
      Storage.remove('streams');
      Storage.remove('events');
      Storage.remove('scenarios');
      Storage.remove('local_notifications');
      Storage.remove('appConfig');

      Logger.log('✅ LocalStorage cache cleared');

      // 3. Clear browser cache if possible
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        Logger.log('✅ Browser cache cleared');
      }

      setMessage('✅ Кэш успешно очищен! Перезагружаем данные...');

      // 4. Trigger reload
      setTimeout(() => {
        if (onCacheCleared) {
          onCacheCleared();
        }
        window.location.reload();
      }, 1000);

    } catch (error) {
      Logger.error('Cache clear error', error);
      setMessage('❌ Ошибка очистки кэша');
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="p-4 bg-card rounded-2xl island-blur">
      <h3 className="text-lg font-bold text-text-primary mb-4">🧹 Очистка кэша</h3>
      <p className="text-sm text-text-secondary mb-4">
        Если данные не обновляются или есть проблемы с загрузкой, очистите кэш.
        Это обновит все модули, уроки и другие данные из Airtable.
      </p>

      <button
        onClick={clearAllCache}
        disabled={isClearing}
        className={`w-full px-6 py-3 rounded-xl font-semibold transition-all ${
          isClearing
            ? 'bg-text-secondary cursor-not-allowed'
            : 'bg-[#FF3B30] hover:shadow-lg active:scale-95'
        } text-white`}
      >
        {isClearing ? '⏳ Очищаем...' : '🧹 Очистить кэш и перезагрузить'}
      </button>

      {message && (
        <div className={`mt-4 p-3 rounded-lg text-sm ${
          message.includes('✅') ? 'bg-[#34C759]/10 text-[#34C759]' : 'bg-[#FF3B30]/10 text-[#FF3B30]'
        }`}>
          {message}
        </div>
      )}
    </div>
  );
};
