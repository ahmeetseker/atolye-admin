import { test, expect } from '@playwright/test'

test.describe('Navigation', () => {
  const ROUTES = [
    { path: '/', heading: /Atölye|Bana sor|hoş geldin/i },
    { path: '/listings', eyebrow: 'MOD · İLANLAR' },
    { path: '/customers', eyebrow: 'MOD · MÜŞTERİLER' },
    { path: '/sales', eyebrow: 'MOD · SATIŞ' },
    { path: '/finance', eyebrow: 'MOD · FİNANS' },
    { path: '/reports', eyebrow: 'MOD · RAPORLAR' },
    { path: '/calendar', eyebrow: 'MOD · TAKVİM' },
    { path: '/messages', eyebrow: 'MOD · MESAJLAR' },
    { path: '/profile', eyebrow: 'MOD · PROFİL' },
  ] as const
  for (const r of ROUTES) {
    test(`direct visit to ${r.path}`, async ({ page }) => {
      await page.goto(r.path)
      await page.waitForLoadState('networkidle')
      if ('heading' in r && r.heading) {
        // Just check page loaded, content visible
        await expect(page.locator('main')).toBeVisible()
      }
      if ('eyebrow' in r && r.eyebrow) {
        await expect(page.getByText(r.eyebrow, { exact: false })).toBeVisible({ timeout: 5000 })
      }
    })
  }
})
