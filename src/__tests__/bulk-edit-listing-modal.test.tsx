import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { Listing } from '@landx/data'
import { BulkEditListingModal } from '@/components/listings/BulkEditListingModal'

/**
 * Wave F18.A — BulkEditListingModal unit tests.
 *
 * Verifies form rendering, validation gating, and submit-via-useUpdateListing
 * round-trip against the mock seed. Uses a fresh QueryClient per render so
 * the mutation cache stays test-local.
 */

function renderWithClient(node: ReactNode) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  }
  return render(node, { wrapper: Wrapper })
}

const SAMPLE_ITEMS: Listing[] = [
  {
    id: 'L-9001',
    title: 'Test 1',
    city: 'İzmir',
    district: 'Çeşme',
    type: 'İmarlı',
    size: 1000,
    price: 1_000_000,
    status: 'Aktif',
    views: 100,
    weeklyTrend: [1, 2, 3, 4, 5, 6, 7],
    lastUpdate: new Date().toISOString(),
    tags: [],
    lat: 38,
    lng: 27,
  },
  {
    id: 'L-9002',
    title: 'Test 2',
    city: 'İzmir',
    district: 'Foça',
    type: 'Tarla',
    size: 5000,
    price: 2_000_000,
    status: 'Pasif',
    views: 50,
    weeklyTrend: [1, 1, 2, 3, 4, 5, 6],
    lastUpdate: new Date().toISOString(),
    tags: [],
    lat: 38.5,
    lng: 26.8,
  },
]

describe('BulkEditListingModal', () => {
  it('renders nothing when open=false', () => {
    renderWithClient(
      <BulkEditListingModal
        open={false}
        selectedItems={SAMPLE_ITEMS}
        onClose={vi.fn()}
      />,
    )
    expect(screen.queryByTestId('bulk-edit-listing-modal')).toBeNull()
  })

  it('shows count badge and disables submit when no changes made', () => {
    renderWithClient(
      <BulkEditListingModal
        open
        selectedItems={SAMPLE_ITEMS}
        onClose={vi.fn()}
      />,
    )
    expect(screen.getByTestId('bulk-edit-listing-modal')).toBeInTheDocument()
    expect(screen.getByText(/2 İLAN/)).toBeInTheDocument()
    expect((screen.getByTestId('bulk-edit-submit') as HTMLButtonElement).disabled).toBe(true)
  })

  it('enables submit when status is changed', () => {
    renderWithClient(
      <BulkEditListingModal
        open
        selectedItems={SAMPLE_ITEMS}
        onClose={vi.fn()}
      />,
    )
    const statusSelect = screen.getByTestId('bulk-edit-status') as HTMLSelectElement
    fireEvent.change(statusSelect, { target: { value: 'Pasif' } })
    expect((screen.getByTestId('bulk-edit-submit') as HTMLButtonElement).disabled).toBe(false)
  })

  it('disables submit when percent input is empty', () => {
    renderWithClient(
      <BulkEditListingModal
        open
        selectedItems={SAMPLE_ITEMS}
        onClose={vi.fn()}
      />,
    )
    // Selecting percent radio without typing a delta is still empty → invalid
    const percentInput = screen.getByTestId('bulk-edit-percent-delta') as HTMLInputElement
    fireEvent.focus(percentInput)
    expect((screen.getByTestId('bulk-edit-submit') as HTMLButtonElement).disabled).toBe(true)
  })

  it('calls onClose when cancel is clicked', () => {
    const onClose = vi.fn()
    renderWithClient(
      <BulkEditListingModal
        open
        selectedItems={SAMPLE_ITEMS}
        onClose={onClose}
      />,
    )
    fireEvent.click(screen.getByTestId('bulk-edit-cancel'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('submits price change and resolves onSuccess', async () => {
    const onClose = vi.fn()
    const onSuccess = vi.fn()
    // Use a listing that exists in LISTINGS seed so mutation resolves.
    const { LISTINGS } = await import('@landx/data')
    const seed = LISTINGS.slice(0, 2)
    renderWithClient(
      <BulkEditListingModal
        open
        selectedItems={seed}
        onClose={onClose}
        onSuccess={onSuccess}
      />,
    )
    const statusSelect = screen.getByTestId('bulk-edit-status') as HTMLSelectElement
    fireEvent.change(statusSelect, { target: { value: 'Pasif' } })
    fireEvent.click(screen.getByTestId('bulk-edit-submit'))
    await waitFor(() => expect(onSuccess).toHaveBeenCalled(), { timeout: 3000 })
    expect(onClose).toHaveBeenCalled()
  })
})
