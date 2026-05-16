import { test, expect } from '@playwright/test'

test.describe('Finance charts (lazy-loaded)', () => {
  test('cashflow chart renders after lazy load', async ({ page }) => {
    await page.goto('/finance')
    await page.waitForLoadState('networkidle')
    // LazyChart wraps recharts components — wait for SVG
    await expect(page.locator('svg').first()).toBeVisible({ timeout: 5000 })
    // KPI cards
    await expect(page.getByText(/Bu ay tahsilat/i)).toBeVisible()
  })
})
