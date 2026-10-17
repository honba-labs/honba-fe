import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    // npm workspaces link @honba/ui-core via a symlink into node_modules;
    // without this Vite resolves imports against the symlink target's own
    // node_modules instead of the app's, which breaks React's singleton.
    preserveSymlinks: true,
  },
  server: {
    port: 5175,
    open: false,
    host: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        // honba serve mounts routes at the root; the browser uses /api[/v1] prefixes
        rewrite: (path) => path.replace(/^\/api(\/v1)?/, ''),
      },
      '/ws': {
        target: 'ws://127.0.0.1:8000',
        ws: true,
      },
    },
  },
});
