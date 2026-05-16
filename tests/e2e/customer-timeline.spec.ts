import { test, expect } from '@playwright/test'

/**
 * Wave F19.A — customer timeline drawer + lead score badge E2E.
 *
 * Flow: open the customers route, verify the new "Skor" column renders a
 * badge per row, click into a customer to open the detail drawer, switch
 * to the "Zaman çizgisi" tab, and confirm the timeline panel paints either
 * the event list or the empty state.
 */

test.describe('Customer timeline — F19.A', () => {
  test('Skor column renders a badge with a numeric score on each row', async ({
    page,
  }) => {
    await page.goto('/customers')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('table tbody tr').first()).toBeVisible({
      timeout: 5000,
    })

    const firstRow = page.locator('table tbody tr').first()
    const scoreBadge = firstRow.locator('[data-testid^="customer-score-"]')
    await expect(scoreBadge).toBeVisible()
    const text = (await scoreBadge.textContent())?.trim() ?? ''
    expect(text).toMatch(/^\d+$/)
  })

  test('clicking a row opens the detail drawer with both tabs', async ({
    page,
  }) => {
    await page.goto('/customers')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('table tbody tr').first()).toBeVisible({
      timeout: 5000,
    })

    // Click the customer name cell (avoids checkbox + action buttons).
    await page.locator('table tbody tr').first().getByRole('cell').nth(1).click()

    await expect(page.getByTestId('customer-detail-drawer')).toBeVisible()
    await expect(page.getByTestId('customer-detail-tab-overview')).toBeVisible()
    await expect(page.getByTestId('customer-detail-tab-timeline')).toBeVisible()
  })

  test('Zaman çizgisi tab reveals the timeline panel with a lead score card', async ({
    page,
  }) => {
    await page.goto('/customers')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('table tbody tr').first()).toBeVisible({
      timeout: 5000,
    })

    await page.locator('table tbody tr').first().getByRole('cell').nth(1).click()
    await expect(page.getByTestId('customer-detail-drawer')).toBeVisible()

    await page.getByTestId('customer-detail-tab-timeline').click()

    await expect(
      page.getByTestId('customer-detail-timeline-panel'),
    ).toBeVisible()
    await expect(page.getByTestId('customer-timeline-score')).toBeVisible()
    await expect(page.getByTestId('customer-timeline-tier')).toBeVisible()
  })

  test('timeline tab shows either the event list or the empty hint', async ({
    page,
  }) => {
    await page.goto('/customers')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('table tbody tr').first()).toBeVisible({
      timeout: 5000,
    })

    await page.locator('table tbody tr').first().getByRole('cell').nth(1).click()
    await page.getByTestId('customer-detail-tab-timeline').click()

    const list = page.getByTestId('customer-timeline-list')
    const empty = page.getByTestId('customer-timeline-empty')
    await expect(list.or(empty)).toBeVisible()
  })
})
