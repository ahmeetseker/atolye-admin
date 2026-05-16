import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { Customer } from '@landx/data'
import { BulkDeleteCustomerDialog } from '@/components/customers/BulkDeleteCustomerDialog'

/**
 * Wave F18.B — BulkDeleteCustomerDialog unit tests.
 *
 * Type-to-confirm gate, cancel hand-off, and successful resolution path.
 * Uses fresh QueryClient per render so mutation state is isolated.
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

const FALLBACK: Customer[] = [
  {
    id: 'M-Y001',
    name: 'Mock A',
    segment: 'Sıcak',
    stage: 'İlk temas',
    lastContact: new Date().toISOString(),
    value: 1_000_000,
    source: 'Referans',
    owner: 'Ahmet',
    interestArea: 'Çeşme',
  },
]

describe('BulkDeleteCustomerDialog', () => {
  it('renders nothing when closed', () => {
    renderWithClient(
      <BulkDeleteCustomerDialog
        open={false}
        customers={FALLBACK}
        onClose={vi.fn()}
      />,
    )
    expect(screen.queryByTestId('bulk-delete-customer-dialog')).toBeNull()
  })

  it('keeps the confirm button disabled until phrase matches SİL', () => {
    renderWithClient(
      <BulkDeleteCustomerDialog
        open
        customers={FALLBACK}
        onClose={vi.fn()}
      />,
    )
    const confirm = screen.getByTestId('bulk-delete-customer-confirm') as HTMLButtonElement
    const input = screen.getByTestId('bulk-delete-customer-phrase') as HTMLInputElement
    expect(confirm.disabled).toBe(true)
    fireEvent.change(input, { target: { value: 'sil' } })
    expect(confirm.disabled).toBe(false)
    fireEvent.change(input, { target: { value: 'SİL' } })
    expect(confirm.disabled).toBe(false)
    fireEvent.change(input, { target: { value: 'NOPE' } })
    expect(confirm.disabled).toBe(true)
  })

  it('calls onClose on cancel', () => {
    const onClose = vi.fn()
    renderWithClient(
      <BulkDeleteCustomerDialog
        open
        customers={FALLBACK}
        onClose={onClose}
      />,
    )
    fireEvent.click(screen.getByTestId('bulk-delete-customer-cancel'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('deletes seeded customers and resolves onDeleted', async () => {
    const { CUSTOMERS } = await import('@landx/data')
    const seed = CUSTOMERS.slice(0, 1)
    const onClose = vi.fn()
    const onDeleted = vi.fn()
    renderWithClient(
      <BulkDeleteCustomerDialog
        open
        customers={seed}
        onClose={onClose}
        onDeleted={onDeleted}
      />,
    )
    fireEvent.change(screen.getByTestId('bulk-delete-customer-phrase'), {
      target: { value: 'SİL' },
    })
    fireEvent.click(screen.getByTestId('bulk-delete-customer-confirm'))
    await waitFor(() => expect(onDeleted).toHaveBeenCalled(), { timeout: 3000 })
    expect(onClose).toHaveBeenCalled()
  })
})
