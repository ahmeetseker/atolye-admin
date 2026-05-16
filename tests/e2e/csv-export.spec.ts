import { test, expect } from '@playwright/test'

/**
 * F6.C — CSV export.
 *
 * Uses Playwright's `download` event to assert the anchor click triggers a
 * download with the right filename pattern. We also peek into the file payload
 * to make sure the BOM survives the Blob → object-URL round trip.
 */

test.describe('CSV export — listings', () => {
  test('clicking the CSV button triggers a listings-*.csv download with BOM', async ({
    page,
  }) => {
    await page.goto('/panel/listings')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 5000 })

    const button = page.getByTestId('export-csv-button')
    await expect(button).toBeVisible()

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      button.click(),
    ])

    expect(download.suggestedFilename()).toMatch(
      /^listings-\d{4}-\d{2}-\d{2}\.csv$/,
    )

    const path = await download.path()
    expect(path).toBeTruthy()
    if (path) {
      const fs = await import('node:fs/promises')
      const buf = await fs.readFile(path)
      // UTF-8 BOM (0xEF 0xBB 0xBF) must lead the payload.
      expect(buf[0]).toBe(0xef)
      expect(buf[1]).toBe(0xbb)
      expect(buf[2]).toBe(0xbf)
      // Header line in TR.
      const text = buf.toString('utf-8')
      expect(text).toContain('"ID"')
      expect(text).toContain('"Başlık"')
    }
  })
})

test.describe('CSV export — customers', () => {
  test('clicking the CSV button on customers downloads customers-*.csv', async ({
    page,
  }) => {
    await page.goto('/panel/customers')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 5000 })

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('export-csv-button').click(),
    ])

    expect(download.suggestedFilename()).toMatch(
      /^customers-\d{4}-\d{2}-\d{2}\.csv$/,
    )
  })
})
