
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Загружаем все env переменные (третий аргумент '' разрешает загрузку переменных без префикса VITE_)
  const env = loadEnv(mode, '.', '');

  return {
    plugins: [react()],
    define: {
      // Явный маппинг переменных окружения для Vercel и локальной разработки.
      // Это заменяет process.env.KEY на реальное значение строки при сборке.
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      'process.env.SUPABASE_URL': JSON.stringify(env.SUPABASE_URL),
      'process.env.SUPABASE_ANON_KEY': JSON.stringify(env.SUPABASE_ANON_KEY),
      
      // Заглушка для остальных вызовов process.env, чтобы избежать ошибок "process is not defined" в браузере
      'process.env': {}
    },
    build: {
      outDir: 'dist',
      sourcemap: false
    },
    server: {
      host: true
    }
  };
});
