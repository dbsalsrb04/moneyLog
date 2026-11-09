import { execFileSync } from 'node:child_process';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

function commitNumber() {
  try {
    const count = execFileSync('git', ['rev-list', '--first-parent', '--count', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    return /^\d+$/.test(count) ? count.padStart(2, '0') : '';
  } catch {
    return '';
  }
}

export default defineConfig({
  plugins: [react()],
  define: { __COMMIT_NUMBER__: JSON.stringify(commitNumber()) },
  // Keep built asset URLs relative so /moneyLog/ on GitHub Pages also works.
  base: './',
  server: { host: '127.0.0.1' },
});
