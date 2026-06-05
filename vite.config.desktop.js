import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Desktop-specific config (No PWA, Relative Paths)
export default defineConfig({
  plugins: [react()],
  base: './', // CRITICAL for Electron file:// protocol
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  }
});
