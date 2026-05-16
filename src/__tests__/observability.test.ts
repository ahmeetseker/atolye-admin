/**
 * F25.0 — observability helper tests (run from atolye-admin since the UI
 * package itself has no test runner today).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  captureException,
  captureMessage,
  initSentry,
  resetObservabilityForTests,
  setUser,
} from '@landx/ui/lib'

describe('observability helpers', () => {
  beforeEach(() => {
    resetObservabilityForTests()
  })
  afterEach(() => {
    resetObservabilityForTests()
    vi.restoreAllMocks()
  })

  it('captureException without init falls back to console.error', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    captureException(new Error('boom'), { route: '/x' })
    expect(spy).toHaveBeenCalled()
    expect(String(spy.mock.calls[0])).toContain('observability:no-dsn')
  })

  it('captureMessage routes through console with level mapping', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    captureMessage('hata', 'error')
    captureMessage('uyari', 'warning')
    captureMessage('bilgi', 'info')

    expect(errSpy).toHaveBeenCalled()
    expect(warnSpy).toHaveBeenCalled()
    expect(logSpy).toHaveBeenCalled()
  })

  it('initSentry with no DSN resolves and uses fallback', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await initSentry({ dsn: null, environment: 'development' })
    captureException(new Error('still works'))
    expect(spy).toHaveBeenCalled()
  })

  it('initSentry is idempotent', async () => {
    const a = initSentry({ dsn: '', environment: 'production' })
    const b = initSentry({ dsn: '', environment: 'production' })
    expect(a).toBe(b)
    await Promise.all([a, b])
  })

  it('setUser logs via fallback', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    setUser({ id: 'user_42' })
    expect(spy).toHaveBeenCalled()
  })

  it('setUser(null) clears identity in fallback', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    setUser(null)
    expect(spy).toHaveBeenCalled()
  })
})
