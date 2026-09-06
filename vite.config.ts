import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  root: 'src/client',
  plugins: [react(), tailwindcss()],
  build: {
    outDir: '../../dist/client',
    emptyOutDir: true,
  },
  server: {
    // Only bind every interface inside the Docker dev sandbox; on the bare
    // host that would needlessly expose the dev server to the LAN.
    host: process.env.DEV_IN_CONTAINER === '1',
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
