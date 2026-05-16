import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { Customer } from '@landx/data'
import { BulkUpdateCustomerModal } from '@/components/customers/BulkUpdateCustomerModal'

/**
 * Wave F18.B — BulkUpdateCustomerModal unit tests.
 *
 * Verifies the form renders, gates the submit button until at least one
 * field is filled, and emits onUpdated after a successful round-trip
 * against the mock seed.
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

const FALLBACK_CUSTOMERS: Customer[] = [
  {
    id: 'M-X001',
    name: 'Test A',
    segment: 'Sıcak',
    stage: 'İlk temas',
    lastContact: new Date().toISOString(),
    value: 1_000_000,
    source: 'Referans',
    owner: 'Ahmet',
    interestArea: 'Çeşme',
  },
  {
    id: 'M-X002',
    name: 'Test B',
    segment: 'Soğuk',
    stage: 'Görüşme',
    lastContact: new Date().toISOString(),
    value: 2_000_000,
    source: 'Sahibinden',
    owner: 'Ayşe',
    interestArea: 'Foça',
  },
]

describe('BulkUpdateCustomerModal', () => {
  it('renders nothing when open=false', () => {
    renderWithClient(
      <BulkUpdateCustomerModal
        open={false}
        customers={FALLBACK_CUSTOMERS}
        onClose={vi.fn()}
      />,
    )
    expect(screen.queryByTestId('bulk-update-customer-modal')).toBeNull()
  })

  it('shows count badge and disables submit until a field changes', () => {
    renderWithClient(
      <BulkUpdateCustomerModal
        open
        customers={FALLBACK_CUSTOMERS}
        onClose={vi.fn()}
      />,
    )
    expect(screen.getByTestId('bulk-update-customer-modal')).toBeInTheDocument()
    expect(screen.getByText(/2 MÜŞTERİ/)).toBeInTheDocument()
    expect(
      (screen.getByTestId('bulk-update-customer-confirm') as HTMLButtonElement).disabled,
    ).toBe(true)
  })

  it('enables submit after picking a segment', () => {
    renderWithClient(
      <BulkUpdateCustomerModal
        open
        customers={FALLBACK_CUSTOMERS}
        onClose={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByTestId('bulk-update-segment-Sıcak'))
    expect(
      (screen.getByTestId('bulk-update-customer-confirm') as HTMLButtonElement).disabled,
    ).toBe(false)
  })

  it('calls onClose when cancel is clicked', () => {
    const onClose = vi.fn()
    renderWithClient(
      <BulkUpdateCustomerModal
        open
        customers={FALLBACK_CUSTOMERS}
        onClose={onClose}
      />,
    )
    fireEvent.click(screen.getByTestId('bulk-update-customer-cancel'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('submits segment patch and calls onUpdated for seeded customers', async () => {
    const { CUSTOMERS } = await import('@landx/data')
    const seed = CUSTOMERS.slice(0, 2)
    const onClose = vi.fn()
    const onUpdated = vi.fn()
    renderWithClient(
      <BulkUpdateCustomerModal
        open
        customers={seed}
        onClose={onClose}
        onUpdated={onUpdated}
      />,
    )
    fireEvent.click(screen.getByTestId('bulk-update-segment-Ilık'))
    fireEvent.click(screen.getByTestId('bulk-update-customer-confirm'))
    await waitFor(() => expect(onUpdated).toHaveBeenCalled(), { timeout: 3000 })
    expect(onClose).toHaveBeenCalled()
  })
})
