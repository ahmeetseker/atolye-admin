/**
 * Listing-new — foto upload + harita picker (Wave F10.A)
 *
 * Verifies the F10.A integration in /listings/new:
 *   • Step 1 "Haritada seç" opens MapPicker modal, click→pin→confirm
 *     populates the form's lat/lng hidden inputs and the visible coord chip.
 *   • Step 4 FotoUpload accepts an image via the file input, surfaces a tile
 *     in the photo grid, then the remove × button clears it.
 *   • Full happy path: fill steps 1→5 with lat/lng + 1 photo, submit Taslak,
 *     navigation lands on /listings?highlight=…
 */
import { test, expect } from '@playwright/test'

/** 1x1 transparent PNG — well-formed image, ~70 bytes. */
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABAQMAAAAl21bKAAAAA1BMVEUAAACnej3aAAAACklEQVR4nGNgAAAAAgABc3UBGAAAAABJRU5ErkJggg==',
  'base64',
)

test.describe('Listing-new foto + map (F10.A)', () => {
  test('Step1 map picker drops a pin and surfaces coords on the form', async ({ page }) => {
    await page.goto('/panel/listings/new')
    await page.waitForLoadState('networkidle')

    // Step 1 is the default landing step.
    await expect(page.getByText('ADIM 1 · KONUM')).toBeVisible()
    await expect(page.getByTestId('map-picker-block')).toBeVisible()

    // Coords chip absent until a pin is picked.
    await expect(page.getByTestId('map-picker-coords')).toHaveCount(0)

    // Open MapPicker modal.
    await page.getByTestId('map-picker-open').click()
    const canvas = page.getByTestId('map-picker-canvas')
    await expect(canvas).toBeVisible({ timeout: 5_000 })
    // Wait for Leaflet init (`data-ready=true`).
    await expect(page.locator('[data-map-picker]')).toHaveAttribute('data-ready', 'true', {
      timeout: 5_000,
    })

    // Confirm disabled before any pin.
    await expect(page.getByTestId('map-confirm')).toHaveAttribute('data-can-confirm', 'false')

    // Click in the map canvas to drop a pin (mid-canvas).
    const box = await canvas.boundingBox()
    expect(box).not.toBeNull()
    await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2)

    // Confirm now enabled.
    await expect(page.getByTestId('map-confirm')).toHaveAttribute('data-can-confirm', 'true', {
      timeout: 3_000,
    })
    await page.getByTestId('map-confirm').click()

    // Modal closes + form chip appears.
    await expect(page.getByTestId('map-picker-canvas')).toHaveCount(0)
    await expect(page.getByTestId('map-picker-coords')).toBeVisible()
    // Hidden inputs populated.
    const lat = await page.getByTestId('listing-field-lat').inputValue()
    const lng = await page.getByTestId('listing-field-lng').inputValue()
    expect(Number.isFinite(Number(lat))).toBe(true)
    expect(Number.isFinite(Number(lng))).toBe(true)
  })

  test('Step1 map picker can be cancelled without setting coords', async ({ page }) => {
    await page.goto('/panel/listings/new')
    await page.waitForLoadState('networkidle')

    await page.getByTestId('map-picker-open').click()
    await expect(page.getByTestId('map-picker-canvas')).toBeVisible({ timeout: 5_000 })
    await page.getByTestId('map-cancel').click()
    await expect(page.getByTestId('map-picker-canvas')).toHaveCount(0)
    await expect(page.getByTestId('map-picker-coords')).toHaveCount(0)
  })

  test('Step4 FotoUpload accepts a file, shows a tile, then removes it', async ({ page }) => {
    await page.goto('/panel/listings/new')
    await page.waitForLoadState('networkidle')

    // Step 1 → Step 2.
    await page.getByTestId('listing-field-city').selectOption('Balıkesir')
    await page.getByTestId('listing-field-district').fill('Ayvalık')
    await page.getByTestId('wizard-next').click()
    // Step 2 → Step 3.
    await page.getByTestId('listing-field-size').fill('1000')
    await page.getByTestId('wizard-next').click()
    // Step 3 → Step 4.
    await page.getByTestId('listing-field-price').fill('1000000')
    await page.getByTestId('wizard-next').click()
    await expect(page.getByText('ADIM 4 · GÖRSEL & AÇIKLAMA')).toBeVisible()

    // Upload via the hidden file input.
    await page.getByTestId('foto-input').setInputFiles({
      name: 'arsa.png',
      mimeType: 'image/png',
      buffer: TINY_PNG,
    })
    // Tile appears.
    const tile = page.locator('[data-foto-tile]')
    await expect(tile).toHaveCount(1)
    // Counter says 1 / 8.
    await expect(page.locator('[data-foto-grid]')).toHaveAttribute('data-count', '1')

    // Remove via × button.
    await tile.locator('[data-foto-remove]').click()
    await expect(page.locator('[data-foto-tile]')).toHaveCount(0)
  })

  test('Full wizard: pick map + upload photo + submit lands on /listings', async ({ page }) => {
    await page.goto('/panel/listings/new')
    await page.waitForLoadState('networkidle')

    // Step 1 — fill city/district + map pin.
    await page.getByTestId('listing-field-city').selectOption('İzmir')
    await page.getByTestId('listing-field-district').fill('Çeşme')
    await page.getByTestId('map-picker-open').click()
    await expect(page.getByTestId('map-picker-canvas')).toBeVisible({ timeout: 5_000 })
    await expect(page.locator('[data-map-picker]')).toHaveAttribute('data-ready', 'true', {
      timeout: 5_000,
    })
    const canvas = page.getByTestId('map-picker-canvas')
    const box = await canvas.boundingBox()
    await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2)
    await page.getByTestId('map-confirm').click()
    await expect(page.getByTestId('map-picker-coords')).toBeVisible()
    await page.getByTestId('wizard-next').click()

    // Step 2.
    await page.getByTestId('listing-field-size').fill('1240')
    await page.getByTestId('wizard-next').click()

    // Step 3.
    await page.getByTestId('listing-field-price').fill('8400000')
    await page.getByTestId('wizard-next').click()

    // Step 4 — upload photo.
    await page.getByTestId('foto-input').setInputFiles({
      name: 'arsa.png',
      mimeType: 'image/png',
      buffer: TINY_PNG,
    })
    await expect(page.locator('[data-foto-tile]')).toHaveCount(1)
    await page.getByTestId('wizard-next').click()

    // Step 5 — accept KVKK + submit Taslak.
    await expect(page.getByText('ADIM 5 · YAYIN')).toBeVisible()
    await page.getByTestId('listing-field-kvkk-accept').check()
    await page.getByTestId('wizard-submit').click()

    // Lands on /listings with highlight query param.
    await page.waitForURL(/\/listings\?highlight=/, { timeout: 8_000 })
  })
})
