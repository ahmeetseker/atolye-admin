import { test, expect } from '@playwright/test'

const FREEZE_ANIM_CSS =
  '*, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important; }'

// Pages screenshotted across every viewport project (desktop / mobile / tablet).
// Playwright project name is suffixed automatically into the snapshot dir, so a
// single `toHaveScreenshot('home.png')` produces:
//   visual.spec.ts-snapshots/home-desktop-darwin.png
//   visual.spec.ts-snapshots/home-mobile-darwin.png
//   visual.spec.ts-snapshots/home-tablet-darwin.png
const PAGES = [
  { path: '/', name: 'home' },
  { path: '/listings', name: 'listings' },
  { path: '/customers', name: 'customers' },
  { path: '/sales', name: 'sales' },
  { path: '/finance', name: 'finance' },
  { path: '/reports', name: 'reports' },
  { path: '/calendar', name: 'calendar' },
  { path: '/messages', name: 'messages' },
  { path: '/profile', name: 'profile' },
  { path: '/settings', name: 'settings' },
  { path: '/help', name: 'help' },
  { path: '/notifications', name: 'notifications' },
  { path: '/search', name: 'search' },
] as const

test.describe('Visual regression', () => {
  for (const { path, name } of PAGES) {
    test(`screenshot: ${name} (${path})`, async ({ page }) => {
      await page.goto(path)
      await page.waitForLoadState('networkidle')
      // Wait extra for hook data + skeletons to settle
      await page.waitForTimeout(500)
      // Hide blinking caret + ms tabular-num animation if any
      await page.addStyleTag({ content: FREEZE_ANIM_CSS })
      await expect(page).toHaveScreenshot(`admin-${name}.png`, {
        fullPage: false,
      })
    })
  }
})
