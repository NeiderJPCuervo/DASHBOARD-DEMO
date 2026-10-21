import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Relative paths so the build works on Netlify and on GitHub Pages (/DASHBOARD-DEMO/)
  base: './',
  build: {
    outDir: 'dist',
    assetsInlineLimit: 4096,
  }
});
