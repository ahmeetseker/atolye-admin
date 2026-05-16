import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { Listing } from '@landx/data'
import { BulkDeleteListingDialog } from '@/components/listings/BulkDeleteListingDialog'

function renderWithClient(node: ReactNode) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  }
  return render(node, { wrapper: Wrapper })
}

const SAMPLE: Listing[] = [
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
    weeklyTrend: [0, 0, 0, 0, 0, 0, 0],
    lastUpdate: new Date().toISOString(),
    tags: [],
    lat: 38,
    lng: 27,
  },
]

describe('BulkDeleteListingDialog', () => {
  it('renders nothing when open=false', () => {
    renderWithClient(
      <BulkDeleteListingDialog
        open={false}
        selectedItems={SAMPLE}
        onClose={vi.fn()}
      />,
    )
    expect(screen.queryByTestId('bulk-delete-listing-dialog')).toBeNull()
  })

  it('disables submit until the confirm word is typed', () => {
    renderWithClient(
      <BulkDeleteListingDialog
        open
        selectedItems={SAMPLE}
        onClose={vi.fn()}
      />,
    )
    const submit = screen.getByTestId('bulk-delete-submit') as HTMLButtonElement
    expect(submit.disabled).toBe(true)

    const input = screen.getByTestId('bulk-delete-confirm-input') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'sil' } })
    expect(submit.disabled).toBe(true) // case-sensitive

    fireEvent.change(input, { target: { value: 'SİL' } })
    expect(submit.disabled).toBe(false)
  })

  it('shows count + affected ids', () => {
    renderWithClient(
      <BulkDeleteListingDialog
        open
        selectedItems={SAMPLE}
        onClose={vi.fn()}
      />,
    )
    expect(screen.getByText(/1 İLAN/i)).toBeInTheDocument()
    expect(screen.getByText(/L-9001/)).toBeInTheDocument()
  })

  it('calls onClose on cancel', () => {
    const onClose = vi.fn()
    renderWithClient(
      <BulkDeleteListingDialog
        open
        selectedItems={SAMPLE}
        onClose={onClose}
      />,
    )
    fireEvent.click(screen.getByTestId('bulk-delete-cancel'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('submits delete with valid confirm word against mock backend', async () => {
    const onSuccess = vi.fn()
    const onClose = vi.fn()
    const { LISTINGS } = await import('@landx/data')
    const item = LISTINGS[0]
    renderWithClient(
      <BulkDeleteListingDialog
        open
        selectedItems={[item]}
        onClose={onClose}
        onSuccess={onSuccess}
      />,
    )
    const input = screen.getByTestId('bulk-delete-confirm-input') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'SİL' } })
    fireEvent.click(screen.getByTestId('bulk-delete-submit'))
    await waitFor(() => expect(onSuccess).toHaveBeenCalled(), { timeout: 3000 })
    expect(onClose).toHaveBeenCalled()
  })
})
