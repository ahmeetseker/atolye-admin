import { expect, test } from '@playwright/test'

/**
 * Wave F10.C — /panel/settings (4 collapsible section + KVKK m.11).
 *
 * Covers the localStorage-only SettingsForm React route:
 *   - All 4 sections render and the first (Ekip bildirimleri) is open by
 *     default.
 *   - Toggling a notification debounces (~500ms) and persists into
 *     `arsam.admin-settings.v1` with deep-merge (sibling rows untouched).
 *   - "Veri indir (KVKK m.11)" triggers an actual download (JSON).
 *   - "Hesabımı sil" requires BOTH the acknowledgement checkbox AND the
 *     literal "SİL" text before the confirm button enables, then clears
 *     every `arsam.admin-*.v1` key and leaves non-admin keys alone.
 */

const ADMIN_SETTINGS_KEY = 'arsam.admin-settings.v1'

test.describe('/panel/settings — Wave F10.C', () => {
  test.beforeEach(async ({ context }) => {
    // Clear admin-scoped storage so each test starts from defaults.
    await context.addInitScript(() => {
      try {
        const toDelete: string[] = []
        for (let i = 0; i < window.localStorage.length; i++) {
          const k = window.localStorage.key(i)
          if (k && /^arsam\.admin-.+\.v\d+$/.test(k)) toDelete.push(k)
        }
        for (const k of toDelete) window.localStorage.removeItem(k)
      } catch {
        /* ignore */
      }
    })
  })

  test('4 collapsible sections render; Ekip bildirimleri open by default', async ({
    page,
  }) => {
    await page.goto('/panel/settings')

    const form = page.locator('[data-settings-form]')
    await expect(form).toBeVisible({ timeout: 5000 })
    await expect(form).toHaveAttribute('data-mounted', 'true')

    await expect(
      page.locator('[data-settings-section="team-notifications"]'),
    ).toBeVisible()
    await expect(page.locator('[data-settings-section="integrations"]')).toBeVisible()
    await expect(page.locator('[data-settings-section="security"]')).toBeVisible()
    await expect(page.locator('[data-settings-section="account"]')).toBeVisible()

    await expect(
      page.locator('[data-settings-section="team-notifications"]'),
    ).toHaveAttribute('data-open', 'true')
    await expect(
      page.locator('[data-settings-section="integrations"]'),
    ).toHaveAttribute('data-open', 'false')

    // Expand integrations.
    await page.locator('[data-settings-toggle="integrations"]').click()
    await expect(
      page.locator('[data-settings-section="integrations"]'),
    ).toHaveAttribute('data-open', 'true')
  })

  test('toggling a team notification autosaves + deep-merges into localStorage', async ({
    page,
  }) => {
    await page.goto('/panel/settings')
    await expect(page.locator('[data-settings-form]')).toHaveAttribute(
      'data-mounted',
      'true',
    )

    const cell = page.locator('[data-settings-notif="yeni-musteri.email"]')
    await expect(cell).toBeChecked()
    await cell.uncheck()

    // Wait for the 500ms debounce + autosave write.
    await expect
      .poll(
        async () =>
          page.evaluate(
            (k) => window.localStorage.getItem(k),
            ADMIN_SETTINGS_KEY,
          ),
        { timeout: 3000 },
      )
      .not.toBeNull()

    const stored = await page.evaluate(
      (k) => window.localStorage.getItem(k),
      ADMIN_SETTINGS_KEY,
    )
    expect(stored).toBeTruthy()
    const parsed = JSON.parse(stored!)
    expect(parsed.teamNotifications['yeni-musteri'].email).toBe(false)
    // Sibling channel for the same row stays ON.
    expect(parsed.teamNotifications['yeni-musteri'].push).toBe(true)
    // Sibling rows untouched.
    expect(parsed.teamNotifications['yeni-ilan'].email).toBe(true)
    expect(parsed.teamNotifications['mesaj'].push).toBe(true)
  })

  test('KVKK m.11 data export triggers JSON file download', async ({ page }) => {
    await page.goto('/panel/settings')
    await expect(page.locator('[data-settings-form]')).toHaveAttribute(
      'data-mounted',
      'true',
    )

    // Open the Account section.
    await page.locator('[data-settings-toggle="account"]').click()

    const downloadPromise = page.waitForEvent('download', { timeout: 5000 })
    await page.locator('[data-settings-export]').click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(
      /^arsam-admin-veri-\d{4}-\d{2}-\d{2}\.json$/,
    )
  })

  test('delete account requires ack + "SİL" then clears arsam.admin-*.v1 keys', async ({
    page,
  }) => {
    await page.goto('/panel/settings')
    await expect(page.locator('[data-settings-form]')).toHaveAttribute(
      'data-mounted',
      'true',
    )

    // Seed two admin keys + a non-admin key.
    await page.evaluate(() => {
      window.localStorage.setItem(
        'arsam.admin-team.v1',
        JSON.stringify([{ id: 'm1' }]),
      )
      // Force the settings store to exist by writing a stub.
      window.localStorage.setItem(
        'arsam.admin-settings.v1',
        JSON.stringify({ account: { companyName: 'X' } }),
      )
      // Non-admin key — should survive.
      window.localStorage.setItem('arsam.favorites.v1', JSON.stringify(['lst-1']))
      window.localStorage.setItem('theme', 'dark')
    })

    await page.locator('[data-settings-toggle="account"]').click()
    await page.locator('[data-settings-delete]').click()

    const dialog = page.locator('[data-settings-delete-dialog]')
    await expect(dialog).toBeVisible()

    const confirmBtn = page.locator('[data-settings-delete-confirm]')
    await expect(confirmBtn).toBeDisabled()

    await page.locator('[data-settings-delete-ack]').check()
    await expect(confirmBtn).toBeDisabled() // still needs the typed word

    await page.locator('[data-settings-delete-input]').fill('SİL')
    await expect(confirmBtn).toBeEnabled()

    // Click + read cleared state synchronously before the navigation drops
    // the page context.
    const cleared = await page.evaluate(() => {
      const btn = document.querySelector(
        '[data-settings-delete-confirm]',
      ) as HTMLButtonElement | null
      btn?.click()
      return {
        settings: window.localStorage.getItem('arsam.admin-settings.v1'),
        team: window.localStorage.getItem('arsam.admin-team.v1'),
        favorites: window.localStorage.getItem('arsam.favorites.v1'),
        theme: window.localStorage.getItem('theme'),
      }
    })

    expect(cleared.settings).toBeNull()
    expect(cleared.team).toBeNull()
    // Non-admin keys must survive.
    expect(cleared.favorites).toBe(JSON.stringify(['lst-1']))
    expect(cleared.theme).toBe('dark')
  })
})
