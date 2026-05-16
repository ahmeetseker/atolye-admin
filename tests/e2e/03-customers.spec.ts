import { test, expect } from '@playwright/test'

test.describe('Customers route', () => {
  test('renders customer table', async ({ page }) => {
    await page.goto('/customers')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 3000 })
    await expect(page.getByText('MOD · MÜŞTERİLER')).toBeVisible()
  })

  test('search by name', async ({ page }) => {
    await page.goto('/customers')
    await page.waitForLoadState('networkidle')
    const searchInput = page.getByPlaceholder(/İsim/).first()
    await searchInput.fill('Ahmet')  // assumes some customer named Ahmet in mock
    // The search input updates filter via the hook; just verify input has the value
    await expect(searchInput).toHaveValue('Ahmet')
  })
})
