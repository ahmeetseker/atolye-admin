import path from 'node:path'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? (process.env.NODE_ENV === 'production' ? '/panel/' : '/'),
  plugins: ([
    react(),
    tailwindcss(),
    // Bundle analyzer: only when ANALYZE=1 — emits dist/stats.html treemap.
    process.env.ANALYZE === '1' && visualizer({
      filename: 'dist/stats.html',
      template: 'treemap',
      gzipSize: true,
      brotliSize: true,
      open: false,
    }),
  ] as any[]).filter(Boolean),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET || 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
  build: {
    // Wave-13/A65: explicit — Vite defaults to true, but pin it so future
    // config rewrites can't silently regress per-route CSS chunks
    // (e.g., listings-*.css is split out today and we want to keep it that way).
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('react-router')) {
            return 'vendor-router'
          }
          if (id.includes('react-dom') || id.match(/[\\/]node_modules[\\/](react|scheduler)[\\/]/)) {
            return 'vendor-react'
          }
          if (id.includes('framer-motion') || id.includes('motion-dom') || id.includes('motion-utils')) {
            return 'vendor-motion'
          }
          if (id.includes('recharts') || id.includes('d3-') || id.includes('victory-vendor')) {
            return 'vendor-charts'
          }
          if (id.includes('lucide-react')) {
            return 'vendor-icons'
          }
          if (id.includes('leaflet')) {
            return 'vendor-leaflet'
          }
          return undefined
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    // Vitest unit tests only — Playwright E2E specs live in tests/e2e/** and run via `pnpm test:e2e`.
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['tests/e2e/**', 'node_modules/**', 'dist/**'],
  },
})
