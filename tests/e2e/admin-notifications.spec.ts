import { test, expect } from '@playwright/test'

/**
 * F10.B — /panel/notifications derinleştirme.
 *
 * The route now mounts `<NotificationsList />` backed by
 * `arsam.admin-notifications.v1`. On first visit `seedIfEmpty()` populates 10
 * deterministic admin mocks (mix of types + read/unread). These specs verify:
 *  - List renders with seeded rows
 *  - Filter chips (Okunmadı / Okundu) narrow the visible feed
 *  - Per-type chip filters narrow the feed
 *  - Per-row mark-read flips the visible state
 *  - Bulk select + bulk delete removes the selected rows
 *
 * Storage is cleared once per test context so seed is deterministic.
 */

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      localStorage.removeItem('arsam.admin-notifications.v1')
    } catch {
      /* ignore */
    }
  })
})

test.describe('Admin notifications list', () => {
  test('list renders with 10 seeded rows on first visit', async ({ page }) => {
    await page.goto('/panel/notifications')
    await page.waitForLoadState('networkidle')

    const list = page.getByTestId('admin-notifications-list')
    await expect(list).toBeVisible()

    const feed = page.getByTestId('admin-notifications-feed')
    await expect(feed).toBeVisible()
    const rows = page.locator('[data-testid^="admin-notification-row-"]')
    await expect(rows).toHaveCount(10)
  })

  test('Okunmadı filter narrows the feed to unread rows', async ({ page }) => {
    await page.goto('/panel/notifications')
    await page.waitForLoadState('networkidle')

    const totalRows = page.locator('[data-testid^="admin-notification-row-"]')
    await expect(totalRows).toHaveCount(10)

    await page.getByTestId('admin-notification-filter-unread').click()
    // Wait for transition to settle.
    await expect(
      page.getByTestId('admin-notification-filter-unread'),
    ).toHaveAttribute('data-active', 'true')

    const visible = page.locator(
      '[data-testid^="admin-notification-row-"][data-notification-read="false"]',
    )
    const visibleCount = await visible.count()
    const allCount = await page
      .locator('[data-testid^="admin-notification-row-"]')
      .count()
    expect(allCount).toBe(visibleCount)
    expect(visibleCount).toBeGreaterThan(0)
  })

  test('Type chip "Mesaj" narrows the feed to type=mesaj rows', async ({
    page,
  }) => {
    await page.goto('/panel/notifications')
    await page.waitForLoadState('networkidle')

    await page.getByTestId('admin-notification-type-filter-mesaj').click()
    await expect(
      page.getByTestId('admin-notification-type-filter-mesaj'),
    ).toHaveAttribute('data-active', 'true')

    const rows = page.locator('[data-testid^="admin-notification-row-"]')
    const count = await rows.count()
    expect(count).toBeGreaterThan(0)
    const types = await rows.evaluateAll((nodes) =>
      nodes.map((n) => (n as HTMLElement).dataset.notificationType),
    )
    for (const t of types) expect(t).toBe('mesaj')
  })

  test('per-row mark-read flips the row to read state', async ({ page }) => {
    await page.goto('/panel/notifications')
    await page.waitForLoadState('networkidle')

    // Find the first unread row.
    const unread = page
      .locator(
        '[data-testid^="admin-notification-row-"][data-notification-read="false"]',
      )
      .first()
    await expect(unread).toBeVisible()
    const id = await unread.getAttribute('data-notification-id')
    expect(id).toBeTruthy()

    await page.getByTestId(`admin-notification-mark-read-${id}`).click()

    const row = page.locator(`[data-notification-id="${id}"]`)
    await expect(row).toHaveAttribute('data-notification-read', 'true')
  })

  test('bulk delete removes the selected rows', async ({ page }) => {
    await page.goto('/panel/notifications')
    await page.waitForLoadState('networkidle')

    const initialRows = page.locator('[data-testid^="admin-notification-row-"]')
    await expect(initialRows).toHaveCount(10)

    // Pick the first 3 visible rows and select each.
    const ids: string[] = []
    for (let i = 0; i < 3; i += 1) {
      const row = initialRows.nth(i)
      const id = await row.getAttribute('data-notification-id')
      if (id) ids.push(id)
    }
    expect(ids).toHaveLength(3)

    for (const id of ids) {
      await page.getByTestId(`admin-notification-select-${id}`).check()
    }

    await expect(page.getByTestId('admin-notifications-bulk-bar')).toBeVisible()
    await expect(page.getByTestId('admin-notifications-bulk-count')).toContainText(
      '3',
    )

    await page.getByTestId('admin-notifications-bulk-delete').click()

    await expect(initialRows).toHaveCount(7)
    for (const id of ids) {
      await expect(
        page.locator(`[data-notification-id="${id}"]`),
      ).toHaveCount(0)
    }
  })

  test('"Tümünü okundu işaretle" zeroes the unread count', async ({ page }) => {
    await page.goto('/panel/notifications')
    await page.waitForLoadState('networkidle')

    const markAll = page.getByTestId('admin-notifications-mark-all-read')
    await expect(markAll).toBeEnabled()
    await markAll.click()

    const unreadRows = page.locator(
      '[data-testid^="admin-notification-row-"][data-notification-read="false"]',
    )
    await expect(unreadRows).toHaveCount(0)

    // Filter chip count badge updates to 0.
    await page.getByTestId('admin-notification-filter-unread').click()
    await expect(page.getByTestId('admin-notifications-empty')).toBeVisible()
  })
})
