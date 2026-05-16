/**
 * Conditionally start MSW.
 * Opt-in via VITE_USE_MSW=1 (set in .env.local or runtime).
 * Returns a Promise that the app should await before render.
 */
export async function setupMockServiceWorker(): Promise<void> {
  if (!import.meta.env.DEV) return
  if (import.meta.env.VITE_USE_MSW !== '1') return

  const { worker } = await import('./browser')
  await worker.start({
    onUnhandledRequest: 'bypass', // let asset/HMR requests through
    quiet: true,
  })

  // eslint-disable-next-line no-console
  console.info('[MSW] Mock Service Worker active — /api/v1/* intercepted.')
}
