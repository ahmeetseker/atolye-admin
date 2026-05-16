import { expect, test } from '@playwright/test'

/**
 * Wave F14.A — dark mode (`@landx/ui/theme`).
 *
 * Covers the runtime theme layer mounted on RootLayout:
 *   - ThemeToggle button (top-right, sun/moon/monitor dropdown) flips the
 *     `<html class="dark">` token + persists into `arsam.theme.v1`.
 *   - Reload restores the previous choice (no FOUC — the inline bootstrap
 *     script in index.html toggles the class before first paint).
 *   - `system` mode reacts to the OS `prefers-color-scheme` change via
 *     Playwright's `emulateMedia({ colorScheme })` API.
 */

const STORAGE_KEY = 'arsam.theme.v1'

test.describe('/ theme toggle — Wave F14.A', () => {
  test.beforeEach(async ({ context }) => {
    await context.addInitScript(() => {
      try {
        window.localStorage.removeItem('arsam.theme.v1')
      } catch {
        /* ignore */
      }
    })
  })

  test('clicking the toggle sets <html class="dark"> and persists', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto('/')

    // First paint: stored = null, system = light → no .dark class.
    await expect(page.locator('html')).not.toHaveClass(/(^|\s)dark(\s|$)/)

    // Open the dropdown via the trigger button (aria-label="Tema seçici").
    const trigger = page.getByRole('button', { name: 'Tema seçici' })
    await expect(trigger).toBeVisible()
    await trigger.click()

    // Pick "Karanlık".
    await page.getByRole('menuitemradio', { name: 'Karanlık' }).click()

    await expect(page.locator('html')).toHaveClass(/(^|\s)dark(\s|$)/)
    const stored = await page.evaluate((k) => window.localStorage.getItem(k), STORAGE_KEY)
    expect(stored).toBe('dark')
  })

  test('preference persists across reload (no FOUC)', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto('/')

    const trigger = page.getByRole('button', { name: 'Tema seçici' })
    await trigger.click()
    await page.getByRole('menuitemradio', { name: 'Karanlık' }).click()
    await expect(page.locator('html')).toHaveClass(/(^|\s)dark(\s|$)/)

    await page.reload()
    // Immediately after reload, before any React hydration, the inline script
    // in index.html must already have applied the dark class.
    await expect(page.locator('html')).toHaveClass(/(^|\s)dark(\s|$)/)
    const themeAttr = await page.locator('html').getAttribute('data-theme')
    expect(themeAttr).toBe('dark')
  })

  test('system mode reacts to prefers-color-scheme change', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto('/')

    const trigger = page.getByRole('button', { name: 'Tema seçici' })
    await trigger.click()
    await page.getByRole('menuitemradio', { name: 'Sistem' }).click()

    // System = light → no .dark.
    await expect(page.locator('html')).not.toHaveClass(/(^|\s)dark(\s|$)/)

    // Flip OS preference to dark; useTheme listens on the media query.
    await page.emulateMedia({ colorScheme: 'dark' })
    await expect(page.locator('html')).toHaveClass(/(^|\s)dark(\s|$)/)

    // Back to light.
    await page.emulateMedia({ colorScheme: 'light' })
    await expect(page.locator('html')).not.toHaveClass(/(^|\s)dark(\s|$)/)
  })
})
