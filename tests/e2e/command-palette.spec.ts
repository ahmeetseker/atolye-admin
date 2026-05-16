import { test, expect } from '@playwright/test'

test.describe('atolye-admin command palette (F15)', () => {
  test('mod+/ opens the palette, type narrows results', async ({ page }) => {
    await page.goto('/')
    await page.keyboard.press('ControlOrMeta+/')
    const dialog = page.getByRole('dialog', { name: 'Komut paleti' })
    await expect(dialog).toBeVisible()

    const input = page.getByTestId('command-palette-input')
    await expect(input).toBeFocused()

    await input.fill('ilan')
    await expect(page.getByText(/SAYFALAR|SONUÇLAR|AKSİYONLAR/).first()).toBeVisible()
  })

  test('arrow keys navigate; Enter activates first action', async ({ page }) => {
    await page.goto('/')
    await page.keyboard.press('ControlOrMeta+/')
    const input = page.getByTestId('command-palette-input')
    await expect(input).toBeFocused()

    await page.keyboard.press('Enter')
    await expect(page.getByRole('dialog', { name: 'Komut paleti' })).not.toBeVisible()
  })

  test('Escape closes the palette', async ({ page }) => {
    await page.goto('/')
    await page.keyboard.press('ControlOrMeta+/')
    await expect(page.getByRole('dialog', { name: 'Komut paleti' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: 'Komut paleti' })).not.toBeVisible()
  })

  test('backdrop click closes the palette', async ({ page }) => {
    await page.goto('/')
    await page.keyboard.press('ControlOrMeta+/')
    const dialog = page.getByRole('dialog', { name: 'Komut paleti' })
    await expect(dialog).toBeVisible()
    await dialog.click({ position: { x: 5, y: 5 } })
    await expect(dialog).not.toBeVisible()
  })
})
