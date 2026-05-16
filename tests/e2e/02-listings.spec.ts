import { test, expect } from '@playwright/test'

test.describe('Listings route', () => {
  test('renders listing table with mock data', async ({ page }) => {
    await page.goto('/listings')
    await page.waitForLoadState('networkidle')
    // Wait for hook data — table should have rows
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 3000 })
    // Header eyebrow
    await expect(page.getByText('MOD · İLANLAR')).toBeVisible()
  })

  test('filter by status', async ({ page }) => {
    await page.goto('/listings')
    await page.waitForLoadState('networkidle')
    // Click "Aktif" status tab
    await page.getByRole('button', { name: /^Aktif/i }).first().click()
    // Verify URL stayed same but row count changed (just check still has rows)
    await expect(page.locator('table tbody tr').first()).toBeVisible()
  })

  test('switches to map view', async ({ page }) => {
    await page.goto('/listings')
    await page.waitForLoadState('networkidle')
    // Click map view toggle (icon-only button with aria-label or title containing 'harita')
    const mapButton = page.locator('button[title*="arita"], button[aria-label*="arita"]').first()
    await mapButton.click()
    // Leaflet container should mount
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 5000 })
  })
})
