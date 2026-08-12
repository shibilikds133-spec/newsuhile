import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Workbox writes absolute module paths into the generated service worker.
// An apostrophe in the project path breaks those generated JS imports because
// Workbox quotes them with single quotes. Keep the normal PWA build everywhere
// else, but disable generation for this unsafe local path so production builds
// remain reproducible without touching application data.
const disablePwaForUnsafePath = process.cwd().includes("'");

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      disable: disablePwaForUnsafePath,
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,woff,woff2}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        // Raise precache size limit to 5 MB (default 2 MB is too small for this bundle)
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
      manifest: {
        name: 'MAKHDOOMIYYA Dashboard',
        short_name: 'DawaTrust',
        description: 'Office Management Dashboard',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: '/image/logo.png', // Assuming logo is in public folder
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/image/logo.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
});
