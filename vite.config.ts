import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  // Keep built asset URLs relative so /moneyLog/ on GitHub Pages also works.
  base: './',
  server: { host: '127.0.0.1' },
});
