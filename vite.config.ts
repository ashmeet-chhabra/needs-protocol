import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    // NOTE: GEMINI_API_KEY is NO LONGER injected into the client bundle.
    // All AI calls go through the Express backend at /api/* endpoints.
    // Only Firebase public config (VITE_FIREBASE_*) is exposed, which is safe.
    define: {},
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify — file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Proxy API requests to the Express backend during development
      proxy: {
        '/api': {
          target: `http://localhost:${env.PORT || 3001}`,
          changeOrigin: true,
        },
      },
    },
  };
});
