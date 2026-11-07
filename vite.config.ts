import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Dev: vite (5173) chuyển /api và /img sang wrangler dev (8787).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8787',
      '/img': 'http://localhost:8787',
    },
  },
});
