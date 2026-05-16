/**
 * Wave F25.A — ErrorBoundary integration test (atolye-admin host).
 *
 * Validates the @landx/ui/feedback ErrorBoundary contract used by all three
 * apps: it catches a render-time throw, exposes the default alert fallback,
 * forwards the error through `onError`, and the "Yeniden dene" button resets
 * state so a healthy subtree can re-render.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { ReactElement } from 'react'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { ErrorBoundary } from '@landx/ui/feedback'

function Boom(): ReactElement {
  throw new Error('test boom')
}

describe('ErrorBoundary integration', () => {
  beforeEach(() => {
    // React logs a noisy "The above error..." block whenever an ErrorBoundary
    // catches — silence it so test output stays readable.
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('catches errors and shows the default fallback', () => {
    const onError = vi.fn()
    render(
      <ErrorBoundary onError={onError}>
        <Boom />
      </ErrorBoundary>,
    )
    expect(screen.getByRole('alert')).toBeTruthy()
    expect(onError).toHaveBeenCalledTimes(1)
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error)
  })

  it('reset button restores children after the throw goes away', () => {
    let shouldThrow = true
    function MaybeBoom(): ReactElement {
      if (shouldThrow) throw new Error('once')
      return <div data-testid="ok">ok</div>
    }
    render(
      <ErrorBoundary>
        <MaybeBoom />
      </ErrorBoundary>,
    )
    // Fallback rendered first.
    expect(screen.getByRole('alert')).toBeTruthy()
    shouldThrow = false
    fireEvent.click(screen.getByRole('button', { name: /yeniden/i }))
    expect(screen.getByTestId('ok')).toBeTruthy()
  })
})
