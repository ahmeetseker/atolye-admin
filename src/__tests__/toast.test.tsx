import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import { Toaster } from '@/components/ui/Toaster'
import {
  MAX_VISIBLE,
  clearToasts,
  dismissToast,
  pushToast,
  useToast,
} from '@/lib/use-toast'

function HookProbe({ onReady }: { onReady: (api: ReturnType<typeof useToast>) => void }) {
  const api = useToast()
  onReady(api)
  return null
}

beforeEach(() => {
  clearToasts()
})

afterEach(() => {
  clearToasts()
  vi.useRealTimers()
})

describe('toast store', () => {
  it('pushToast adds a toast to the queue and renders it via Toaster', () => {
    render(<Toaster />)
    act(() => {
      pushToast('Kaydedildi', { variant: 'success' })
    })
    const card = screen.getByTestId('toast-success')
    expect(card).toBeInTheDocument()
    expect(within(card).getByText('Kaydedildi')).toBeInTheDocument()
  })

  it('caps the visible toast stack at MAX_VISIBLE (3)', () => {
    render(<Toaster />)
    act(() => {
      pushToast('one', { variant: 'info' })
      pushToast('two', { variant: 'info' })
      pushToast('three', { variant: 'info' })
      pushToast('four', { variant: 'info' })
      pushToast('five', { variant: 'info' })
    })
    const cards = screen.getAllByTestId('toast-info')
    expect(cards).toHaveLength(MAX_VISIBLE)
    // Newest on top — the most recent push must be the first card in DOM order
    expect(cards[0]).toHaveTextContent('five')
  })

  it('auto-dismisses after the duration with fake timers', async () => {
    vi.useFakeTimers()
    render(<Toaster />)
    act(() => {
      pushToast('Silindi', { variant: 'success', duration: 4000 })
    })
    expect(screen.getByTestId('toast-success')).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(4001)
    })
    // Store cleared synchronously; framer-motion's AnimatePresence may keep the
    // node mounted briefly for the exit transition. Flush remaining timers, then
    // assert the toast text is gone from the live region.
    await act(async () => {
      vi.runAllTimers()
    })
    vi.useRealTimers()
    await waitFor(() => {
      expect(screen.queryByText('Silindi')).not.toBeInTheDocument()
    })
  })

  it('error variant renders with the destructive testid and an alert role', () => {
    render(<Toaster />)
    act(() => {
      pushToast('Hata: bağlantı yok', { variant: 'error' })
    })
    const card = screen.getByTestId('toast-error')
    expect(card).toBeInTheDocument()
    expect(card).toHaveAttribute('role', 'alert')
    // token-only — must NOT use rose/red literal colors
    expect(card.className).not.toMatch(/(?:^|\s)bg-(?:rose|red)-/)
    expect(card.className).not.toMatch(/(?:^|\s)text-(?:rose|red)-/)
  })

  it('dismiss(id) removes the toast immediately', async () => {
    render(<Toaster />)
    let id = ''
    act(() => {
      id = pushToast('Geçici', { variant: 'info' })
    })
    expect(screen.getByTestId('toast-info')).toBeInTheDocument()
    act(() => {
      dismissToast(id)
    })
    // Same as auto-dismiss — exit animation may linger. Assert the message text
    // is gone (text disappears the moment the card starts unmounting in jsdom).
    await waitFor(() => {
      expect(screen.queryByText('Geçici')).not.toBeInTheDocument()
    })
  })

  it('useToast() returns a stable API and toast() pushes through the hook', () => {
    let api: ReturnType<typeof useToast> | null = null
    render(
      <>
        <HookProbe onReady={(a) => (api = a)} />
        <Toaster />
      </>,
    )
    expect(api).not.toBeNull()
    act(() => {
      api!.toast('Hook yolu', { variant: 'warning' })
    })
    expect(screen.getByTestId('toast-warning')).toBeInTheDocument()
  })
})
