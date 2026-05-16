import { test, expect } from '@playwright/test'

/**
 * Wave F18.B — Bulk customer operations E2E.
 *
 * Mirrors the listings-bulk spec but targets the customers route. The
 * three custom actions covered here are: bulk segment update, bulk message
 * template send (mock — writes to localStorage), and type-to-confirm bulk
 * delete. CSV export download is checked separately.
 */

test.describe('Bulk customers — F18.B', () => {
  test('selecting a row reveals the bulk actions bar', async ({ page }) => {
    await page.goto('/customers')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 5000 })

    await expect(page.getByTestId('bulk-actions-bar')).toBeHidden()

    const rowBoxes = page.locator('table tbody tr input[type=checkbox]')
    await rowBoxes.nth(0).check()
    await rowBoxes.nth(1).check()

    await expect(page.getByTestId('bulk-actions-bar')).toBeVisible()
    await expect(page.getByTestId('bulk-count')).toHaveText('2')
    await expect(page.getByTestId('bulk-action-segment')).toBeVisible()
    await expect(page.getByTestId('bulk-action-message')).toBeVisible()
    await expect(page.getByTestId('bulk-action-export')).toBeVisible()
    await expect(page.getByTestId('bulk-action-delete')).toBeVisible()
  })

  test('select-all header toggles every visible row', async ({ page }) => {
    await page.goto('/customers')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 5000 })

    const selectAll = page.getByTestId('customer-select-all')
    await selectAll.check()

    const rowCount = await page.locator('table tbody tr').count()
    await expect(page.getByTestId('bulk-count')).toHaveText(String(rowCount))

    await selectAll.uncheck()
    await expect(page.getByTestId('bulk-actions-bar')).toBeHidden()
  })

  test('bulk segment modal updates selected customers', async ({ page }) => {
    await page.goto('/customers')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 5000 })

    await page.locator('table tbody tr input[type=checkbox]').nth(0).check()
    await page.locator('table tbody tr input[type=checkbox]').nth(1).check()
    await page.getByTestId('bulk-action-segment').click()

    const modal = page.getByTestId('bulk-update-customer-modal')
    await expect(modal).toBeVisible()
    await expect(page.getByTestId('bulk-update-customer-confirm')).toBeDisabled()
    await page.getByTestId('bulk-update-segment-Ilık').click()
    await expect(page.getByTestId('bulk-update-customer-confirm')).toBeEnabled()
    await page.getByTestId('bulk-update-customer-confirm').click()

    await expect(modal).toBeHidden({ timeout: 5000 })
    await expect(page.getByTestId('bulk-actions-bar')).toBeHidden()
  })

  test('bulk message modal queues a mock history entry', async ({ page }) => {
    await page.goto('/customers')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 5000 })

    await page.locator('table tbody tr input[type=checkbox]').nth(0).check()
    await page.getByTestId('bulk-action-message').click()

    const modal = page.getByTestId('bulk-message-modal')
    await expect(modal).toBeVisible()
    await expect(page.getByTestId('bulk-message-preview')).toBeVisible()

    await page.getByTestId('bulk-message-confirm').click()
    await expect(modal).toBeHidden({ timeout: 5000 })

    const stored = await page.evaluate(() =>
      window.localStorage.getItem('arsam.admin-bulk-messages.v1'),
    )
    expect(stored).not.toBeNull()
    const history = JSON.parse(stored!) as Array<{ customerIds: string[] }>
    expect(history.length).toBeGreaterThanOrEqual(1)
    expect(history[history.length - 1]!.customerIds.length).toBe(1)
  })

  test('bulk delete with type-to-confirm SİL clears selection', async ({ page }) => {
    await page.goto('/customers')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 5000 })

    const rowsBefore = await page.locator('table tbody tr').count()
    expect(rowsBefore).toBeGreaterThan(1)

    await page.locator('table tbody tr input[type=checkbox]').nth(0).check()
    await page.getByTestId('bulk-action-delete').click()

    const dialog = page.getByTestId('bulk-delete-customer-dialog')
    await expect(dialog).toBeVisible()
    await expect(page.getByTestId('bulk-delete-customer-confirm')).toBeDisabled()

    await page.getByTestId('bulk-delete-customer-phrase').fill('SİL')
    await expect(page.getByTestId('bulk-delete-customer-confirm')).toBeEnabled()
    await page.getByTestId('bulk-delete-customer-confirm').click()

    await expect(dialog).toBeHidden({ timeout: 5000 })
    await expect(page.getByTestId('bulk-actions-bar')).toBeHidden()
  })

  test('Esc cancels the bulk delete dialog without losing selection', async ({ page }) => {
    await page.goto('/customers')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 5000 })

    await page.locator('table tbody tr input[type=checkbox]').first().check()
    await page.getByTestId('bulk-action-delete').click()
    await expect(page.getByTestId('bulk-delete-customer-dialog')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('bulk-delete-customer-dialog')).toBeHidden()
    await expect(page.getByTestId('bulk-count')).toHaveText('1')
  })

  test('bulk CSV export triggers a download', async ({ page }) => {
    await page.goto('/customers')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 5000 })

    await page.locator('table tbody tr input[type=checkbox]').nth(0).check()
    await page.locator('table tbody tr input[type=checkbox]').nth(1).check()

    const downloadPromise = page.waitForEvent('download')
    await page.getByTestId('bulk-action-export').click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/^musteriler_\d{8}\.csv$/)
  })
})
