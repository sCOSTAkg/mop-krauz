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

      // 🚀 CODE SPLITTING CONFIGURATION
      rollupOptions: {
        output: {
          manualChunks: {
            // React core in separate chunk (~130 KB)
            'react-vendor': ['react', 'react-dom'],

            // Google Gemini AI in separate chunk (~50 KB)
            'ai-vendor': ['@google/genai'],

            // Media players in separate chunk (~120 KB)
            'media-vendor': ['react-player', 'react-markdown']
          },

          // Generate readable chunk names with hashes for caching
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]'
        }
      },

      // Increase chunk size warning limit
      chunkSizeWarningLimit: 1000,

      // Minification with Terser
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,  // Remove console.log in production
          drop_debugger: true
        }
      }
    },

    // Optimize dependencies
    optimizeDeps: {
      include: ['react', 'react-dom'],
      exclude: []
    },

    server: {
      host: true
    }
  };
});
