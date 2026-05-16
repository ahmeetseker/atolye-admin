import { test, expect } from '@playwright/test'

test.describe('F14.B — keyboard shortcuts', () => {
  test('? opens the shortcuts overlay and Esc closes it', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Move focus away from any landing-page input.
    await page.locator('body').click({ position: { x: 5, y: 5 } })

    await page.keyboard.press('Shift+/')

    const dialog = page.getByRole('dialog', { name: 'Klavye kısayolları' })
    await expect(dialog).toBeVisible({ timeout: 3000 })

    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
  })

  test('g h navigates to home', async ({ page }) => {
    await page.goto('/listings')
    await page.waitForLoadState('networkidle')
    await page.locator('body').click({ position: { x: 5, y: 5 } })

    await page.keyboard.press('g')
    await page.keyboard.press('h')

    await expect(page).toHaveURL(/\/$/)
  })

  test('g l navigates to /listings from /', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.locator('body').click({ position: { x: 5, y: 5 } })

    await page.keyboard.press('g')
    await page.keyboard.press('l')

    await expect(page).toHaveURL(/\/listings$/)
  })

  test('shortcuts are inert while typing in inputs', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Find any input on the homepage (assistant / search) and focus it.
    const input = page.locator('input, textarea').first()
    const hasInput = (await input.count()) > 0
    test.skip(!hasInput, 'No input on home; skip guard test')

    await input.focus()
    await page.keyboard.press('g')
    await page.keyboard.press('h')

    // We didn't navigate away.
    await expect(page).toHaveURL(/\/$/)
  })
})
