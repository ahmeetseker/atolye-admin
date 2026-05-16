# Admin E2E Tests (Playwright)

## Local çalıştırma

İlk seferde browser binary'leri kur:

```bash
pnpm exec playwright install chromium
```

Sonra:

```bash
pnpm --filter @landx/atolye-admin run test:e2e         # headless run
pnpm --filter @landx/atolye-admin run test:e2e:ui      # interactive UI mode
```

Pre-test build otomatik (`pretest:e2e`).

## CI

CI'da `playwright install --with-deps chromium` çalıştırılmalı sonra `pnpm test:e2e`.

## Webserver stratejisi

`playwright.config.ts` `webServer` config'i `pnpm run preview --port 4173 --strictPort` ile vite preview server'ı spawn eder. Preview server ancak `pnpm build` sonrası `dist/` üzerinden çalışır — bu yüzden `pretest:e2e` scripti otomatik build çalıştırır.

`reuseExistingServer: !process.env.CI` — local'de zaten 4173'te bir preview varsa onu kullanır; CI'da her seferinde fresh server spawn'lar.

## Test dosyaları

- `01-homepage.spec.ts` — homepage yüklenir, Cmd+K modal açılır
- `02-listings.spec.ts` — tablo render, status filter, harita view toggle
- `03-customers.spec.ts` — tablo render, search input
- `04-navigation.spec.ts` — 9 route'a direct visit (eyebrow assertion)
- `05-finance-charts.spec.ts` — lazy-loaded recharts SVG render
