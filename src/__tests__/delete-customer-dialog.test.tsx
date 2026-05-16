import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { DeleteCustomerDialog } from '@/components/customer-edit/DeleteCustomerDialog'
import type { Customer } from '@landx/data'

const SAMPLE: Customer = {
  id: 'M-2401',
  name: 'Burhan Kaynak',
  segment: 'Sıcak',
  stage: 'Görüşme',
  lastContact: '2026-05-01T10:00:00.000Z',
  value: 8_400_000,
  source: 'Sahibinden',
  owner: 'Ahmet',
  interestArea: 'Ayvalık · Cunda',
}

function renderWithClient(node: ReactNode) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(<QueryClientProvider client={qc}>{node}</QueryClientProvider>)
}

describe('DeleteCustomerDialog', () => {
  it('renders nothing when closed', () => {
    const { container } = renderWithClient(
      <DeleteCustomerDialog open={false} customer={SAMPLE} onClose={() => {}} />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('shows the customer id and a "Geri alınamaz" warning copy when open', () => {
    renderWithClient(
      <DeleteCustomerDialog open customer={SAMPLE} onClose={() => {}} />,
    )
    expect(screen.getByText(/M-2401 müşteri silinecek\. Geri alınamaz\./)).toBeInTheDocument()
    expect(screen.getByText('Burhan Kaynak')).toBeInTheDocument()
  })

  it('calls onClose when cancel is clicked', async () => {
    let closed = false
    renderWithClient(
      <DeleteCustomerDialog
        open
        customer={SAMPLE}
        onClose={() => {
          closed = true
        }}
      />,
    )
    fireEvent.click(screen.getByTestId('delete-customer-cancel'))
    await waitFor(() => expect(closed).toBe(true))
  })

  it('fires delete and resolves onClose + onDeleted on success', async () => {
    let closed = false
    let deleted = false
    renderWithClient(
      <DeleteCustomerDialog
        open
        customer={SAMPLE}
        onClose={() => {
          closed = true
        }}
        onDeleted={() => {
          deleted = true
        }}
      />,
    )
    fireEvent.click(screen.getByTestId('delete-customer-confirm'))
    await waitFor(() => {
      expect(deleted).toBe(true)
      expect(closed).toBe(true)
    }, { timeout: 2000 })
  })
})
