// Wave F13.E — standalone vitest config. Splits Vitest concerns out of
// vite.config.ts so the shared `./vitest.setup.ts` (in-memory storage shim)
// is wired in addition to the existing `./src/test-setup.ts` (jest-dom).
// Build/dev/proxy settings stay in vite.config.ts; this file owns `test`.

import path from 'node:path'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    // Vitest unit tests only — Playwright E2E specs live in tests/e2e/** and
    // run via `pnpm test:e2e`. Mirrors the include/exclude in vite.config.ts.
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['tests/e2e/**', 'node_modules/**', 'dist/**'],
  },
})
