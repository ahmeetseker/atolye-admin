import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { EditCustomerDrawer } from '@/components/customer-edit/EditCustomerDrawer'
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
  notes: 'KVKK rıza alındı.',
}

function renderWithClient(node: ReactNode) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(<QueryClientProvider client={qc}>{node}</QueryClientProvider>)
}

describe('EditCustomerDrawer', () => {
  it('renders nothing when closed', () => {
    const { container } = renderWithClient(
      <EditCustomerDrawer open={false} customer={SAMPLE} onClose={() => {}} />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('prefills inputs from the current customer when opened', () => {
    renderWithClient(
      <EditCustomerDrawer open customer={SAMPLE} onClose={() => {}} />,
    )
    const nameInput = screen.getByTestId('customer-edit-name') as HTMLInputElement
    const ownerInput = screen.getByTestId('customer-edit-owner') as HTMLInputElement
    const valueInput = screen.getByTestId('customer-edit-value') as HTMLInputElement
    const segmentSelect = screen.getByTestId('customer-edit-segment') as HTMLSelectElement
    expect(nameInput.value).toBe('Burhan Kaynak')
    expect(ownerInput.value).toBe('Ahmet')
    expect(valueInput.value).toBe('8400000')
    expect(segmentSelect.value).toBe('Sıcak')
  })

  it('shows source as read-only context (not a form field)', () => {
    renderWithClient(
      <EditCustomerDrawer open customer={SAMPLE} onClose={() => {}} />,
    )
    expect(screen.queryByTestId('customer-edit-source')).toBeNull()
    expect(screen.getByText('Sahibinden')).toBeInTheDocument()
  })

  it('disables save when required fields are emptied', () => {
    renderWithClient(
      <EditCustomerDrawer open customer={SAMPLE} onClose={() => {}} />,
    )
    const nameInput = screen.getByTestId('customer-edit-name') as HTMLInputElement
    fireEvent.change(nameInput, { target: { value: '' } })
    const saveBtn = screen.getByTestId('customer-edit-save') as HTMLButtonElement
    expect(saveBtn.disabled).toBe(true)
  })

  it('calls onClose when the cancel button is clicked', async () => {
    let closed = false
    renderWithClient(
      <EditCustomerDrawer
        open
        customer={SAMPLE}
        onClose={() => {
          closed = true
        }}
      />,
    )
    fireEvent.click(screen.getByTestId('customer-edit-cancel'))
    await waitFor(() => expect(closed).toBe(true))
  })
})
