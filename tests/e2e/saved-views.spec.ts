import { test, expect } from '@playwright/test'

/**
 * F6.C — Saved filter views.
 *
 * Flow per spec:
 *  1. Apply a filter (status=Aktif)
 *  2. Save the view with a name
 *  3. Navigate away, return — view appears in dropdown
 *  4. Picking the view pushes the params back into the URL
 *
 * localStorage is per-context in Playwright; we clear before each test so
 * stale views from a previous run don't poison the dropdown.
 */

test.beforeEach(async ({ page }) => {
  // Clear once on first navigation so saved-view persistence can be observed
  // across subsequent goto() calls within the same test.
  await page.addInitScript(() => {
    const FLAG = '__f6c_cleared__'
    if (sessionStorage.getItem(FLAG)) return
    try {
      // F6.C legacy store
      localStorage.removeItem('arsam.admin-views.v1')
      // F19.0 SavedViewsMenu store
      localStorage.removeItem('arsam.admin-saved-views.v1')
      sessionStorage.setItem(FLAG, '1')
    } catch {
      /* ignore */
    }
  })
})

test.describe('Saved views — listings', () => {
  test('dropdown lists system defaults (Tümü / Aktif / Pasif / Bu hafta)', async ({
    page,
  }) => {
    await page.goto('/panel/listings')
    await page.waitForLoadState('networkidle')

    await page.getByTestId('saved-views-trigger').click()
    const menu = page.getByTestId('saved-views-menu')
    await expect(menu).toBeVisible()
    await expect(menu).toContainText('Tümü')
    await expect(menu).toContainText('Aktif')
    await expect(menu).toContainText('Pasif')
    await expect(menu).toContainText('Bu hafta')
  })

  test('saving a view persists it and re-applies on click', async ({ page }) => {
    await page.goto('/panel/listings?status=Aktif')
    await page.waitForLoadState('networkidle')

    // Open dropdown → Save current view
    await page.getByTestId('saved-views-trigger').click()
    await page.getByTestId('saved-view-save-trigger').click()
    await expect(page.getByTestId('save-view-dialog')).toBeVisible()

    await page.getByLabel('Ad').fill('Sadece Aktif')
    await page.getByTestId('save-view-confirm').click()
    await expect(page.getByTestId('save-view-dialog')).toBeHidden()

    // Navigate elsewhere and come back.
    await page.goto('/panel/listings')
    await page.waitForLoadState('networkidle')
    // URL is now /listings (no status), so trigger label should not be the saved view.

    await page.getByTestId('saved-views-trigger').click()
    const userRow = page.getByText('Sadece Aktif', { exact: true })
    await expect(userRow).toBeVisible()
    await userRow.click()

    await expect(page).toHaveURL(/status=Aktif/)
  })

  test('Sistem "Aktif" görünümü tıklanınca URL\'e status=Aktif yazılır', async ({
    page,
  }) => {
    await page.goto('/panel/listings')
    await page.waitForLoadState('networkidle')

    await page.getByTestId('saved-views-trigger').click()
    await page.getByTestId('saved-view-system-sys-aktif').click()
    await expect(page).toHaveURL(/status=Aktif/)
  })
})

/**
 * F19.B — `SavedViewsMenu` (F19.0 shared component) wired into both
 * `/listings` and `/customers` filter rows. Backed by `useFilterParams`
 * → URL state round-trips (shareable + reload-safe).
 *
 * Storage key: `arsam.admin-saved-views.v1` (separate from legacy F6.C
 * `arsam.admin-views.v1`, so the two systems can coexist while F6.C is
 * deprecated).
 */
test.describe('F19.B — SavedViewsMenu (URL filter state)', () => {
  test('"Görünümler" buton listings + customers filter row\'unda görünür', async ({
    page,
  }) => {
    await page.goto('/panel/listings')
    await page.waitForLoadState('networkidle')
    await expect(page.getByTestId('saved-views-toggle')).toBeVisible()

    await page.goto('/panel/customers')
    await page.waitForLoadState('networkidle')
    await expect(page.getByTestId('saved-views-toggle')).toBeVisible()
  })

  test('listings: status tab → URL ?status=Aktif (reload-safe)', async ({ page }) => {
    await page.goto('/panel/listings')
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: /^Aktif\s/ }).first().click()
    await expect(page).toHaveURL(/status=Aktif/)

    // Reload → state survives (URL is source of truth).
    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/status=Aktif/)
  })

  test('listings: görünüm kaydet → menüde görünür → uygula → URL set + tablo filtreli', async ({
    page,
  }) => {
    // Set a filter we want to snapshot
    await page.goto('/panel/listings?status=Pasif')
    await page.waitForLoadState('networkidle')

    // Open the new menu via its toggle, create a new view
    await page.getByTestId('saved-views-toggle').click()
    await page.getByTestId('saved-view-new').click()
    await page.getByTestId('saved-view-name-input').fill('Pasif Portföy')
    await page.getByTestId('saved-view-save').click()

    // Clear filter, then re-apply via the saved view
    await page.goto('/panel/listings')
    await page.waitForLoadState('networkidle')
    await expect(page).not.toHaveURL(/status=Pasif/)

    await page.getByTestId('saved-views-toggle').click()
    await page.getByText('Pasif Portföy', { exact: true }).click()
    await expect(page).toHaveURL(/status=Pasif/)
  })

  test('customers: görünüm kaydet → sil → menüden kaybolur', async ({ page }) => {
    await page.goto('/panel/customers?segment=Sıcak')
    await page.waitForLoadState('networkidle')

    await page.getByTestId('saved-views-toggle').click()
    await page.getByTestId('saved-view-new').click()
    await page.getByTestId('saved-view-name-input').fill('Sıcak Adaylar')
    await page.getByTestId('saved-view-save').click()

    // Re-open menu — view should be listed
    await page.getByTestId('saved-views-toggle').click()
    const row = page.getByText('Sıcak Adaylar', { exact: true })
    await expect(row).toBeVisible()

    // Delete it via its trash button
    await page
      .getByRole('button', { name: /Sıcak Adaylar görünümünü sil/i })
      .click()

    await expect(page.getByText('Sıcak Adaylar', { exact: true })).toHaveCount(0)
    await expect(page.getByText(/Henüz kayıtlı görünüm yok/i)).toBeVisible()
  })

  test('filter clear (Tümü tab) → URL\'den status temizlenir', async ({ page }) => {
    await page.goto('/panel/listings?status=Aktif')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/status=Aktif/)

    // "Tümü" tab clears the status filter (empty string → delete from URL)
    await page.getByRole('button', { name: /^Tümü\s/ }).first().click()
    await expect(page).not.toHaveURL(/status=/)
  })
})
