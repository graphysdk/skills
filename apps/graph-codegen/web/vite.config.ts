import path from 'node:path';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const webRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: webRoot,
  plugins: [react()],
  server: {
    port: 5190,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4315',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: path.join(webRoot, 'dist'),
    emptyOutDir: true,
  },
});
