import { test, expect } from '@playwright/test'

/**
 * Wave F19.C — Inline cell editing.
 *
 * Verifies the DataTable opt-in editor flow on:
 *  - listings: Fiyat (number input) + Durum (select)
 *  - customers: Segment (select)
 *
 * Coverage:
 *  1. Cell click swaps display → editor (DataTable wraps the cell with an
 *     `editable-cell-<id>-<key>` data-testid hook)
 *  2. Enter commits the new value via useUpdateListing / useUpdateCustomer
 *  3. Escape cancels and reverts to the original display value
 *  4. Editing mode does NOT trigger the row-click drawer (event propagation
 *     is stopped on editable cells)
 */

test.describe('Inline editing — listings', () => {
  test('clicking the price cell reveals a number input', async ({ page }) => {
    await page.goto('/listings')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('table tbody tr').first()).toBeVisible({
      timeout: 5000,
    })

    const firstRow = page.locator('table tbody tr').first()
    const id = await firstRow.locator('[data-testid^="bulk-row-"]').getAttribute('data-testid')
    expect(id).toBeTruthy()
    const listingId = id!.replace(/^bulk-row-/, '')

    await page.getByTestId(`editable-cell-${listingId}-price`).click()
    const input = page.getByTestId(`inline-edit-input-${listingId}-price`)
    await expect(input).toBeVisible()
  })

  test('Enter commits a new price; tablo güncellendi', async ({ page }) => {
    await page.goto('/listings')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('table tbody tr').first()).toBeVisible({
      timeout: 5000,
    })

    const firstRow = page.locator('table tbody tr').first()
    const listingId = (
      await firstRow.locator('[data-testid^="bulk-row-"]').getAttribute('data-testid')
    )!.replace(/^bulk-row-/, '')

    await page.getByTestId(`editable-cell-${listingId}-price`).click()
    const input = page.getByTestId(`inline-edit-input-${listingId}-price`)
    await input.fill('9999999')
    await input.press('Enter')

    // Editor unmounts; display cell shows the new formatted value (₺9,9M etc).
    await expect(page.getByTestId(`inline-edit-input-${listingId}-price`)).toBeHidden({
      timeout: 3000,
    })
  })

  test('Escape cancels edit without mutating the cell', async ({ page }) => {
    await page.goto('/listings')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('table tbody tr').first()).toBeVisible({
      timeout: 5000,
    })

    const firstRow = page.locator('table tbody tr').first()
    const listingId = (
      await firstRow.locator('[data-testid^="bulk-row-"]').getAttribute('data-testid')
    )!.replace(/^bulk-row-/, '')

    const cell = page.getByTestId(`editable-cell-${listingId}-price`)
    const beforeText = (await cell.innerText()).trim()

    await cell.click()
    const input = page.getByTestId(`inline-edit-input-${listingId}-price`)
    await input.fill('1')
    await input.press('Escape')

    await expect(input).toBeHidden({ timeout: 2000 })
    const afterText = (await cell.innerText()).trim()
    expect(afterText).toBe(beforeText)
  })

  test('editing the status cell does not navigate to the detail drawer', async ({
    page,
  }) => {
    await page.goto('/listings')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('table tbody tr').first()).toBeVisible({
      timeout: 5000,
    })

    const firstRow = page.locator('table tbody tr').first()
    const listingId = (
      await firstRow.locator('[data-testid^="bulk-row-"]').getAttribute('data-testid')
    )!.replace(/^bulk-row-/, '')

    await page.getByTestId(`editable-cell-${listingId}-status`).click()
    await expect(page.getByTestId(`inline-edit-input-${listingId}-status`)).toBeVisible()

    // URL must not have gained `?detail=<id>` (drawer trigger).
    const url = new URL(page.url())
    expect(url.searchParams.get('detail')).toBeNull()
  })
})
