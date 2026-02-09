import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      'process.env.DATABASE_URL': JSON.stringify("postgresql://neondb_owner:npg_8gtkumX3BAex@ep-raspy-salad-aiz5pncb-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require"),
      'process.env': {}
    },
    build: {
      outDir: 'dist',
      sourcemap: false,

      // 🚀 AUTOMATIC CODE SPLITTING
      rollupOptions: {
        output: {
          // Автоматическое разделение на chunks
          manualChunks: (id) => {
            // React в отдельный chunk
            if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
              return 'react-vendor';
            }

            // AI библиотеки в отдельный chunk
            if (id.includes('@google/genai')) {
              return 'ai-vendor';
            }

            // Media players в отдельный chunk
            if (id.includes('react-player') || id.includes('react-markdown')) {
              return 'media-vendor';
            }

            // Большие компоненты в отдельные chunks
            if (id.includes('/components/AdminDashboard')) {
              return 'admin-chunk';
            }
            if (id.includes('/components/Profile')) {
              return 'profile-chunk';
            }
            if (id.includes('/components/LessonView')) {
              return 'lesson-chunk';
            }
            if (id.includes('/components/SalesArena') || id.includes('/services/geminiService')) {
              return 'arena-chunk';
            }
            if (id.includes('/components/HabitTracker')) {
              return 'habits-chunk';
            }
            if (id.includes('/components/VideoHub')) {
              return 'video-chunk';
            }
          },

          // Hash-based filenames для кэширования
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]'
        }
      },

      // Увеличиваем лимит для больших chunks
      chunkSizeWarningLimit: 1000,

      // Minification с Terser
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,  // Удаляем console.log в production
          drop_debugger: true,
          pure_funcs: ['console.log', 'console.info', 'console.debug']
        },
        mangle: true  // Обфускация имён переменных
      }
    },

    // Оптимизация зависимостей
    optimizeDeps: {
      include: ['react', 'react-dom']
    },

    server: {
      host: true
    }
  };
});
