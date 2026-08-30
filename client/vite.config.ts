import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Proxying in development keeps the browser on one origin, so the SSE stream and
      // the REST calls need no CORS negotiation and cookies behave predictably.
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
    },
  },
});
