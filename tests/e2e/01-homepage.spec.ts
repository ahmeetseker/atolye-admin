import { test, expect } from '@playwright/test'

test.describe('Homepage', () => {
  test('loads and renders hero', async ({ page }) => {
    await page.goto('/')
    // Wait for app shell
    await expect(page.locator('main')).toBeVisible()
    // Atölye logo / brand in header pill
    await expect(page.getByText('Atölye').first()).toBeVisible()
    // Some KPI cards should appear after data loads (TanStack mock has ~120ms delay)
    await page.waitForLoadState('networkidle')
  })

  test('Cmd+K opens assistant modal', async ({ page }) => {
    await page.goto('/')
    await page.keyboard.press('Meta+k')
    // Modal should appear — look for "Sohbet" or modules grid
    await expect(page.getByText(/Atölye asistanı|Sohbet/i)).toBeVisible({ timeout: 2000 })
    // Close via Esc
    await page.keyboard.press('Escape')
  })
})
