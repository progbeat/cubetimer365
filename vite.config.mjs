import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@test-utils': fileURLToPath(new URL('./test-utils', import.meta.url)),
    },
  },
  build: {
    minify: 'terser',
    // Retain the Vite 5 browser baseline instead of narrowing support on upgrade.
    target: ['es2020', 'edge88', 'firefox78', 'chrome87', 'safari14'],
  },
  base: '/cubetimer365/',
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './vitest.setup.mjs',
  },
});
