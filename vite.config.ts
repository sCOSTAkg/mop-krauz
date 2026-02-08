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
      sourcemap: false
    },
    server: {
      host: true
    }
  };
});
