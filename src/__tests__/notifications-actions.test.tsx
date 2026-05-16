import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import type { ReactNode } from 'react'
import {
  __resetNotificationsStore,
  useNotifications,
  useMarkAsRead,
  useMarkAllAsRead,
  useDeleteNotification,
  type Notification,
} from '@landx/data'
import { NotificationRow } from '@/components/notifications/NotificationRow'

/**
 * F10.B note — the legacy `<Notifications />` route now mounts
 * `<NotificationsList />` (backed by `arsam.admin-notifications.v1`) instead
 * of the `@landx/data` query store. Route-level integration tests against the
 * old hooks have been moved to the dedicated NotificationsList E2E spec
 * (`tests/e2e/admin-notifications.spec.ts`). The hook-level unit harnesses
 * below still cover the `@landx/data` mutation contracts, which remain
 * exported from the package for legacy consumers and forthcoming dashboards.
 */

const SAMPLE_UNREAD: Notification = {
  id: 'n-unit-1',
  type: 'info',
  category: 'müşteri',
  title: 'Yeni ilan eklendi (L-1234)',
  body: 'Cunda denize 80m parselini portföye eklendi.',
  timestamp: new Date(Date.now() - 30 * 60_000).toISOString(),
  read: false,
  actionLabel: 'İlanı aç',
  actionHref: '/listings',
}

const SAMPLE_READ: Notification = {
  ...SAMPLE_UNREAD,
  id: 'n-unit-2',
  title: 'Görüşme planı (M-2401)',
  read: true,
}

function makeClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
}

function renderWithProviders(node: ReactNode) {
  const qc = makeClient()
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{node}</MemoryRouter>
    </QueryClientProvider>,
  )
}

const flush = async () => {
  await act(async () => {
    await Promise.resolve()
  })
}

describe('Notifications actions — NotificationRow', () => {
  it('renders unread row with bold title + Yeni badge and aria-label "okunmadı"', () => {
    renderWithProviders(
      <ul>
        <NotificationRow item={SAMPLE_UNREAD} onMarkRead={() => {}} onDelete={() => {}} />
      </ul>,
    )

    const row = screen.getByTestId(`notification-row-${SAMPLE_UNREAD.id}`)
    expect(row).toHaveAttribute('data-read', 'false')
    expect(row).toHaveAttribute(
      'aria-label',
      `${SAMPLE_UNREAD.title}, okunmadı`,
    )
    expect(
      screen.getByTestId(`notification-unread-badge-${SAMPLE_UNREAD.id}`),
    ).toBeInTheDocument()
  })

  it('renders read row without Yeni badge and aria-label "okundu"', () => {
    renderWithProviders(
      <ul>
        <NotificationRow item={SAMPLE_READ} onMarkRead={() => {}} onDelete={() => {}} />
      </ul>,
    )

    const row = screen.getByTestId(`notification-row-${SAMPLE_READ.id}`)
    expect(row).toHaveAttribute('data-read', 'true')
    expect(row).toHaveAttribute('aria-label', `${SAMPLE_READ.title}, okundu`)
    expect(
      screen.queryByTestId(`notification-unread-badge-${SAMPLE_READ.id}`),
    ).not.toBeInTheDocument()
  })

  it('calls onMarkRead when the row activation button is clicked', async () => {
    const onMarkRead = vi.fn()
    renderWithProviders(
      <ul>
        <NotificationRow
          item={SAMPLE_UNREAD}
          onMarkRead={onMarkRead}
          onDelete={() => {}}
        />
      </ul>,
    )

    fireEvent.click(
      screen.getByTestId(`notification-row-activate-${SAMPLE_UNREAD.id}`),
    )
    await flush()

    expect(onMarkRead).toHaveBeenCalledTimes(1)
    expect(onMarkRead).toHaveBeenCalledWith(SAMPLE_UNREAD.id)
  })

  it('does NOT call onMarkRead when row is already read', async () => {
    const onMarkRead = vi.fn()
    renderWithProviders(
      <ul>
        <NotificationRow
          item={SAMPLE_READ}
          onMarkRead={onMarkRead}
          onDelete={() => {}}
        />
      </ul>,
    )

    fireEvent.click(
      screen.getByTestId(`notification-row-activate-${SAMPLE_READ.id}`),
    )
    await flush()

    expect(onMarkRead).not.toHaveBeenCalled()
  })

  it('opens ⋯ menu and triggers onDelete from "Sil"', async () => {
    const onDelete = vi.fn()
    renderWithProviders(
      <ul>
        <NotificationRow
          item={SAMPLE_UNREAD}
          onMarkRead={() => {}}
          onDelete={onDelete}
        />
      </ul>,
    )

    const trigger = screen.getByTestId(
      `notification-row-actions-${SAMPLE_UNREAD.id}`,
    )
    fireEvent.click(trigger)
    await flush()

    const del = screen.getByTestId(`notification-row-delete-${SAMPLE_UNREAD.id}`)
    fireEvent.click(del)
    await flush()

    expect(onDelete).toHaveBeenCalledTimes(1)
    expect(onDelete).toHaveBeenCalledWith(SAMPLE_UNREAD.id)
  })
})

describe('Notifications — empty state', () => {
  it('renders "Bildirim yok" empty state when the store is drained', async () => {
    // Use the hooks directly to avoid coupling to UI button order.
    const qc = makeClient()
    __resetNotificationsStore()

    function Harness() {
      const list = useNotifications()
      const del = useDeleteNotification()

      return (
        <div>
          <button
            data-testid="harness-drain"
            type="button"
            onClick={() => {
              for (const n of list.data ?? []) {
                del.mutate(n.id)
              }
            }}
          />
          <span data-testid="harness-count">{list.data?.length ?? -1}</span>
          {(list.data?.length ?? 0) === 0 && list.isFetched && (
            <p data-testid="harness-empty">Bildirim yok</p>
          )}
        </div>
      )
    }

    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <Harness />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    await waitFor(() => {
      const c = Number(screen.getByTestId('harness-count').textContent)
      expect(c).toBeGreaterThan(0)
    })

    fireEvent.click(screen.getByTestId('harness-drain'))
    await flush()

    await waitFor(() => {
      expect(Number(screen.getByTestId('harness-count').textContent)).toBe(0)
    })
    expect(screen.getByTestId('harness-empty')).toBeInTheDocument()
  })

  it('useMarkAsRead is a no-op on the underlying store when the id is missing', async () => {
    // Sanity check the hook returns an error and doesn't blow up the cache.
    __resetNotificationsStore()
    const qc = makeClient()
    let errorCaught: unknown = null

    function Harness() {
      const m = useMarkAsRead()
      const a = useMarkAllAsRead()
      return (
        <div>
          <button
            type="button"
            data-testid="harness-mark-missing"
            onClick={() => {
              m.mutate('does-not-exist', {
                onError: (err) => {
                  errorCaught = err
                },
              })
            }}
          />
          <button
            type="button"
            data-testid="harness-mark-all"
            onClick={() => a.mutate()}
          />
        </div>
      )
    }

    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <Harness />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    fireEvent.click(screen.getByTestId('harness-mark-missing'))
    await waitFor(() => {
      expect(errorCaught).toBeTruthy()
    })

    fireEvent.click(screen.getByTestId('harness-mark-all'))
    await flush()
  })
})
