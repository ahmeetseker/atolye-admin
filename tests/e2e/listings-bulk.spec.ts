import { test, expect } from '@playwright/test'

/**
 * Wave F18.A — Bulk listing operations E2E.
 *
 * Asserts the new F18.0 shared infrastructure on the listings page:
 *  - per-row checkboxes + header indeterminate select-all
 *  - BulkActionsBar appears above the table when count > 0
 *  - bulk delete via type-to-confirm "SİL"
 *  - bulk CSV export triggers a download
 */

test.describe('Bulk listings — F18.A', () => {
  test('selecting a row reveals the bulk actions bar', async ({ page }) => {
    await page.goto('/listings')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 5000 })

    // Bulk bar hidden before any selection.
    await expect(page.getByTestId('bulk-actions-bar')).toBeHidden()

    // Pick the first 2 rows via per-row checkboxes.
    const rowBoxes = page.locator('table tbody tr input[type=checkbox]')
    await rowBoxes.nth(0).check()
    await rowBoxes.nth(1).check()

    await expect(page.getByTestId('bulk-actions-bar')).toBeVisible()
    await expect(page.getByTestId('bulk-count')).toHaveText('2')
    await expect(page.getByTestId('bulk-action-edit')).toBeVisible()
    await expect(page.getByTestId('bulk-action-export')).toBeVisible()
    await expect(page.getByTestId('bulk-action-delete')).toBeVisible()
  })

  test('select-all header toggles every visible row', async ({ page }) => {
    await page.goto('/listings')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 5000 })

    const selectAll = page.getByTestId('bulk-select-all')
    await selectAll.check()

    const rowCount = await page.locator('table tbody tr').count()
    await expect(page.getByTestId('bulk-count')).toHaveText(String(rowCount))

    // Clear via header click again.
    await selectAll.uncheck()
    await expect(page.getByTestId('bulk-actions-bar')).toBeHidden()
  })

  test('bulk delete with type-to-confirm closes dialog and clears selection', async ({
    page,
  }) => {
    await page.goto('/listings')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 5000 })

    const rowsBefore = await page.locator('table tbody tr').count()
    expect(rowsBefore).toBeGreaterThan(2)

    await page.locator('table tbody tr input[type=checkbox]').nth(0).check()
    await page.locator('table tbody tr input[type=checkbox]').nth(1).check()
    await expect(page.getByTestId('bulk-count')).toHaveText('2')

    await page.getByTestId('bulk-action-delete').click()
    const dialog = page.getByTestId('bulk-delete-listing-dialog')
    await expect(dialog).toBeVisible()

    const submit = page.getByTestId('bulk-delete-submit')
    await expect(submit).toBeDisabled()

    await page.getByTestId('bulk-delete-confirm-input').fill('SİL')
    await expect(submit).toBeEnabled()
    await submit.click()

    await expect(dialog).toBeHidden({ timeout: 5000 })
    await expect(page.getByTestId('bulk-actions-bar')).toBeHidden()
  })

  test('Esc cancels the bulk delete dialog without losing selection', async ({
    page,
  }) => {
    await page.goto('/listings')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 5000 })

    await page.locator('table tbody tr input[type=checkbox]').first().check()
    await page.getByTestId('bulk-action-delete').click()
    await expect(page.getByTestId('bulk-delete-listing-dialog')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('bulk-delete-listing-dialog')).toBeHidden()
    await expect(page.getByTestId('bulk-count')).toHaveText('1')
  })

  test('bulk CSV export triggers a download', async ({ page }) => {
    await page.goto('/listings')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 5000 })

    await page.locator('table tbody tr input[type=checkbox]').nth(0).check()
    await page.locator('table tbody tr input[type=checkbox]').nth(1).check()

    const downloadPromise = page.waitForEvent('download')
    await page.getByTestId('bulk-action-export').click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/^ilanlar_\d{8}\.csv$/)
  })

  test('bulk edit modal opens, validates, and toggles via cancel', async ({
    page,
  }) => {
    await page.goto('/listings')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 5000 })

    await page.locator('table tbody tr input[type=checkbox]').nth(0).check()
    await page.getByTestId('bulk-action-edit').click()
    const modal = page.getByTestId('bulk-edit-listing-modal')
    await expect(modal).toBeVisible()

    // Submit is disabled without any change.
    await expect(page.getByTestId('bulk-edit-submit')).toBeDisabled()

    // Pick a status — submit becomes enabled.
    await page.getByTestId('bulk-edit-status').selectOption('Pasif')
    await expect(page.getByTestId('bulk-edit-submit')).toBeEnabled()

    await page.getByTestId('bulk-edit-cancel').click()
    await expect(modal).toBeHidden()
  })
})
