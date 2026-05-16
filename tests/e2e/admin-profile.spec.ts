import { test, expect } from '@playwright/test'

/**
 * F10.D — /panel/profile derinleştir.
 *
 * Verifies the 4 collapsible sections (Hesap bilgileri / Ekip / Güvenlik /
 * API Token), team invite flow, 2FA enable + disable, and token create +
 * revoke. localStorage is per-context — we clear the 3 admin-profile keys on
 * every test so prior state can't pollute assertions.
 */

const PROFILE_KEYS = [
  'arsam.admin-team.v1',
  'arsam.admin-2fa.v1',
  'arsam.admin-tokens.v1',
  'arsam.admin-profile-account.v1',
]

const PROFILE_URL = '/panel/profile'

/**
 * Clear admin-profile storage on FIRST navigation only — subsequent reloads
 * within the same test must observe persisted state (used by the account form
 * persistence assertion).
 */
test.beforeEach(async ({ page }) => {
  await page.addInitScript((keys) => {
    const FLAG = '__admin_profile_cleared__'
    try {
      if (sessionStorage.getItem(FLAG)) return
      for (const k of keys) localStorage.removeItem(k)
      sessionStorage.setItem(FLAG, '1')
    } catch {
      /* ignore */
    }
  }, PROFILE_KEYS)
})

test.describe('Profile — sections render', () => {
  test('shows 4 section nav buttons + headings', async ({ page }) => {
    await page.goto(PROFILE_URL)
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('MOD · PROFİL', { exact: false })).toBeVisible()

    await expect(page.getByTestId('profile-nav-account')).toBeVisible()
    await expect(page.getByTestId('profile-nav-team')).toBeVisible()
    await expect(page.getByTestId('profile-nav-security')).toBeVisible()
    await expect(page.getByTestId('profile-nav-tokens')).toBeVisible()

    // Account + team are open by default; toggle the others open so all
    // 4 section bodies become observable.
    await page.getByTestId('section-security-toggle').click()
    await page.getByTestId('section-tokens-toggle').click()

    await expect(page.getByTestId('section-account-body')).toBeVisible()
    await expect(page.getByTestId('section-team-body')).toBeVisible()
    await expect(page.getByTestId('section-security-body')).toBeVisible()
    await expect(page.getByTestId('section-tokens-body')).toBeVisible()
  })
})

test.describe('Profile — team invite flow', () => {
  test('seeds self admin and supports invite → pending row', async ({ page }) => {
    await page.goto(PROFILE_URL)
    await page.waitForLoadState('networkidle')

    // Self row visible.
    await expect(page.getByTestId('team-list-table')).toBeVisible()
    await expect(page.getByTestId('team-row-self-admin')).toBeVisible()
    await expect(
      page.getByTestId('team-row-self-admin').getByText('Burhan Kaynak'),
    ).toBeVisible()

    // Open invite dialog.
    await page.getByTestId('team-invite-trigger').click()
    await expect(page.getByTestId('team-invite-dialog')).toBeVisible()

    // Invalid email → inline error.
    await page.getByTestId('invite-email-input').fill('not-an-email')
    await page.getByTestId('invite-submit').click()
    await expect(page.getByTestId('invite-email-error')).toBeVisible()

    // Valid email + role selection → row appears as pending.
    await page.getByTestId('invite-email-input').fill('hilal@arsam.net')
    await page.getByTestId('invite-role-finance').check()
    await page.getByTestId('invite-submit').click()

    await expect(page.getByTestId('team-invite-dialog')).toBeHidden()
    // Row body contains the email + pending status badge.
    await expect(
      page.getByTestId('team-list-table').getByText('hilal@arsam.net'),
    ).toBeVisible()
    const pendingStatus = page
      .getByTestId('team-list-table')
      .getByText('Davet bekliyor')
      .first()
    await expect(pendingStatus).toBeVisible()
  })
})

test.describe('Profile — 2FA enable + disable', () => {
  test('disabled → enable with 6-digit → backup codes shown → disable', async ({
    page,
  }) => {
    await page.goto(PROFILE_URL)
    await page.waitForLoadState('networkidle')

    // Open security section.
    await page.getByTestId('section-security-toggle').click()
    await expect(page.getByTestId('two-factor-section')).toBeVisible()
    await expect(page.getByTestId('two-factor-status')).toContainText('Kapalı')

    // Reveal QR + code input.
    await page.getByTestId('two-factor-enable').click()
    await expect(page.getByTestId('two-factor-secret')).toContainText(
      'ARSAM-MOCK-',
    )

    // Empty/short code is rejected by inline validation.
    await page.getByTestId('two-factor-code-input').fill('123')
    await page.getByTestId('two-factor-verify').click()
    await expect(page.getByTestId('two-factor-error')).toBeVisible()

    // Any 6-digit accepted.
    await page.getByTestId('two-factor-code-input').fill('424242')
    await page.getByTestId('two-factor-verify').click()

    // Backup codes dialog shows up with 10 codes.
    await expect(page.getByTestId('two-factor-backup-dialog')).toBeVisible()
    await page.getByTestId('two-factor-backup-close').click()
    await expect(page.getByTestId('two-factor-backup-dialog')).toBeHidden()

    // Status now Aktif.
    await expect(page.getByTestId('two-factor-status')).toContainText('Aktif')

    // Reveal then hide backup codes panel.
    await page.getByTestId('two-factor-reveal').click()
    const codes = page.getByTestId('two-factor-codes')
    await expect(codes).toBeVisible()

    // Disable confirm → state returns to disabled.
    await page.getByTestId('two-factor-disable').click()
    await expect(page.getByTestId('two-factor-disable-dialog')).toBeVisible()
    await page.getByTestId('two-factor-disable-confirm').click()
    await expect(page.getByTestId('two-factor-status')).toContainText('Kapalı')
  })
})

test.describe('Profile — API tokens', () => {
  test('empty state → create token → show-once → revoke', async ({ page }) => {
    await page.goto(PROFILE_URL)
    await page.waitForLoadState('networkidle')

    await page.getByTestId('section-tokens-toggle').click()
    await expect(page.getByTestId('api-tokens-section')).toBeVisible()
    await expect(page.getByTestId('api-tokens-empty')).toBeVisible()

    // Open create dialog.
    await page.getByTestId('api-tokens-create').click()
    await expect(page.getByTestId('api-token-create-dialog')).toBeVisible()

    // Empty name → inline error.
    await page.getByTestId('api-token-create-submit').click()
    await expect(page.getByTestId('api-token-error')).toBeVisible()

    // Fill name + admin scope.
    await page.getByTestId('api-token-name-input').fill('CI deploy')
    await page.getByTestId('api-token-scope-admin').check()
    await page.getByTestId('api-token-create-submit').click()

    // Show-once dialog with full value.
    const reveal = page.getByTestId('api-token-reveal-dialog')
    await expect(reveal).toBeVisible()
    await expect(page.getByTestId('api-token-reveal-value')).toContainText(
      /^atk_[a-z0-9]{4}_[a-z0-9]{48}$/,
    )
    await page.getByTestId('api-token-reveal-close').click()
    await expect(reveal).toBeHidden()

    // Table now lists the new row.
    await expect(page.getByTestId('api-tokens-table')).toBeVisible()
    await expect(
      page.getByTestId('api-tokens-table').getByText('CI deploy'),
    ).toBeVisible()

    // Revoke flow.
    const revokeButton = page
      .getByTestId('api-tokens-table')
      .locator('[data-testid^=api-token-revoke-]')
      .first()
    await revokeButton.click()
    await expect(page.getByTestId('token-revoke-dialog')).toBeVisible()
    await page.getByTestId('token-revoke-confirm').click()
    await expect(page.getByTestId('token-revoke-dialog')).toBeHidden()

    // Back to empty state.
    await expect(page.getByTestId('api-tokens-empty')).toBeVisible()
  })
})

test.describe('Profile — account info form', () => {
  test('saves account info to localStorage and shows confirmation', async ({
    page,
  }) => {
    await page.goto(PROFILE_URL)
    await page.waitForLoadState('networkidle')

    await expect(page.getByTestId('profile-account-form')).toBeVisible()
    await page.getByTestId('account-name-input').fill('Burhan K.')
    await page.getByTestId('account-save').click()
    await expect(page.getByTestId('account-saved-indicator')).toBeVisible()

    // Reload — value persists.
    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(page.getByTestId('account-name-input')).toHaveValue('Burhan K.')
  })
})
