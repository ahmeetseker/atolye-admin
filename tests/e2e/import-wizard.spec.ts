import { test, expect } from '@playwright/test'

/**
 * Wave F18.C — CSV import wizard (5-step) e2e.
 *
 * Drives the wizard end-to-end via a synthesised CSV blob — covers
 * upload → preview → map → validate → confirm and asserts the resulting
 * record lands in the corresponding listing/customer list view.
 */

const LISTING_CSV = [
  'Başlık,İl,İlçe,Tür,Alan,Fiyat',
  'F18 Test Arsası,Balıkesir,Ayvalık,İmarlı,1200,4500000',
  'F18 Tarla,İzmir,Çeşme,Tarla,3000,2200000',
].join('\n')

const CUSTOMER_CSV = [
  'Ad Soyad,Segment,Telefon,E-posta',
  'F18 Müşteri,Sıcak,5551112233,f18@ornek.com',
].join('\n')

async function uploadCsv(page: import('@playwright/test').Page, content: string, filename: string) {
  const buffer = Buffer.from(content, 'utf-8')
  await page.getByTestId('import-file-input').setInputFiles({
    name: filename,
    mimeType: 'text/csv',
    buffer,
  })
}

test.describe('Import wizard — listings', () => {
  test('full flow: upload → preview → map → validate → confirm', async ({ page }) => {
    await page.goto('/panel/listings/import')
    await expect(page.getByTestId('import-wizard')).toBeVisible()
    await expect(page.getByTestId('import-wizard')).toHaveAttribute('data-entity', 'listing')

    // Step 1 — upload
    await expect(page.getByTestId('import-step-1')).toBeVisible()
    await uploadCsv(page, LISTING_CSV, 'listings.csv')

    // Step 2 — preview shows the two data rows
    await expect(page.getByTestId('import-step-2')).toBeVisible()
    await expect(page.getByTestId('import-preview-row-0')).toBeVisible()
    await expect(page.getByTestId('import-preview-row-1')).toBeVisible()
    await page.getByTestId('import-next').click()

    // Step 3 — auto-map: title should be mapped to "title"
    await expect(page.getByTestId('import-step-3')).toBeVisible()
    await expect(page.getByTestId('import-map-select-0')).toHaveValue('title')
    await expect(page.getByTestId('import-map-select-5')).toHaveValue('price')
    await expect(page.getByTestId('import-missing-required')).toHaveCount(0)
    await page.getByTestId('import-next').click()

    // Step 4 — validation: both rows clean
    await expect(page.getByTestId('import-step-4')).toBeVisible()
    await expect(page.getByTestId('import-validate-summary')).toContainText('2')
    await page.getByTestId('import-next').click()

    // Step 5 — confirm + import
    await expect(page.getByTestId('import-step-5')).toBeVisible()
    await page.getByTestId('import-confirm').click()

    await expect(page.getByTestId('import-success')).toBeVisible({ timeout: 5000 })

    // Navigation lands on /listings; the new title shows up in the table.
    await page.waitForURL(/\/listings(\?|$)/, { timeout: 5000 })
    await expect(page.getByText('F18 Test Arsası').first()).toBeVisible({ timeout: 5000 })
  })

  test('blocks Next when CSV has no required-field mapping', async ({ page }) => {
    await page.goto('/panel/listings/import')
    await uploadCsv(page, 'kolon-x,kolon-y\nfoo,bar', 'bad.csv')
    await expect(page.getByTestId('import-step-2')).toBeVisible()
    await page.getByTestId('import-next').click()

    // Step 3 — no required mapped → Next disabled + warning banner
    await expect(page.getByTestId('import-step-3')).toBeVisible()
    await expect(page.getByTestId('import-missing-required')).toBeVisible()
    await expect(page.getByTestId('import-next')).toBeDisabled()
  })
})

test.describe('Import wizard — customers', () => {
  test('imports a customer row', async ({ page }) => {
    await page.goto('/panel/customers/import')
    await expect(page.getByTestId('import-wizard')).toHaveAttribute('data-entity', 'customer')

    await uploadCsv(page, CUSTOMER_CSV, 'customers.csv')

    await expect(page.getByTestId('import-step-2')).toBeVisible()
    await page.getByTestId('import-next').click()

    await expect(page.getByTestId('import-map-select-0')).toHaveValue('name')
    await page.getByTestId('import-next').click()

    await expect(page.getByTestId('import-step-4')).toBeVisible()
    await page.getByTestId('import-next').click()

    await expect(page.getByTestId('import-step-5')).toBeVisible()
    await page.getByTestId('import-confirm').click()

    await expect(page.getByTestId('import-success')).toBeVisible({ timeout: 5000 })
    await page.waitForURL(/\/customers(\?|$)/, { timeout: 5000 })
    await expect(page.getByText('F18 Müşteri').first()).toBeVisible({ timeout: 5000 })
  })
})
