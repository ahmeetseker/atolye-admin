import { describe, it, expect, vi } from 'vitest'
import { useState } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, useSearchParams, Routes, Route } from 'react-router'
import { CustomerDetailDrawer } from '@/components/customer-edit/CustomerDetailDrawer'
import type { Customer } from '@landx/data'

const sample: Customer = {
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
  phone: '+90 532 401 24 01',
  email: 'burhan.kaynak@example.com',
}

describe('CustomerDetailDrawer', () => {
  it('opens with prefilled customer data across all sections', () => {
    render(
      <CustomerDetailDrawer
        open
        customer={sample}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    )

    expect(screen.getByTestId('customer-detail-drawer')).toBeInTheDocument()
    expect(screen.getByText(/M-2401/)).toBeInTheDocument()
    expect(screen.getByText('Burhan Kaynak')).toBeInTheDocument()
    expect(screen.getByText('+90 532 401 24 01')).toBeInTheDocument()
    expect(screen.getByText('burhan.kaynak@example.com')).toBeInTheDocument()
    expect(screen.getByText('Sahibinden')).toBeInTheDocument()
    expect(screen.getByText('Ayvalık · Cunda')).toBeInTheDocument()
    expect(screen.getByText('KVKK rıza alındı.')).toBeInTheDocument()
  })

  it('fires onEdit when the Düzenle CTA is clicked', () => {
    const onEdit = vi.fn()
    render(
      <CustomerDetailDrawer
        open
        customer={sample}
        onClose={vi.fn()}
        onEdit={onEdit}
        onDelete={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByTestId('customer-detail-edit'))
    expect(onEdit).toHaveBeenCalledTimes(1)
  })

  it('fires onDelete when the Sil CTA is clicked', () => {
    const onDelete = vi.fn()
    render(
      <CustomerDetailDrawer
        open
        customer={sample}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDelete={onDelete}
      />,
    )

    fireEvent.click(screen.getByTestId('customer-detail-delete'))
    expect(onDelete).toHaveBeenCalledTimes(1)
  })

  it('closes and drops ?detail from the URL when ✕ is clicked', () => {
    function Harness() {
      const [params, setParams] = useSearchParams()
      const [customer, setCustomer] = useState<Customer | null>(sample)
      const detailId = params.get('detail')

      return (
        <>
          <div data-testid="current-search">{params.toString()}</div>
          <CustomerDetailDrawer
            open={detailId === sample.id && customer !== null}
            customer={customer}
            onClose={() => {
              setCustomer(null)
              setParams(
                (prev) => {
                  const next = new URLSearchParams(prev)
                  next.delete('detail')
                  return next
                },
                { replace: true },
              )
            }}
            onEdit={vi.fn()}
            onDelete={vi.fn()}
          />
        </>
      )
    }

    render(
      <MemoryRouter initialEntries={['/customers?detail=M-2401']}>
        <Routes>
          <Route path="/customers" element={<Harness />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByTestId('current-search').textContent).toBe('detail=M-2401')
    expect(screen.getByTestId('customer-detail-drawer')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('customer-detail-close'))

    expect(screen.getByTestId('current-search').textContent).toBe('')
    expect(screen.queryByTestId('customer-detail-drawer')).not.toBeInTheDocument()
  })

  it('renders nothing when open=false', () => {
    render(
      <CustomerDetailDrawer
        open={false}
        customer={sample}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    )
    expect(screen.queryByTestId('customer-detail-drawer')).not.toBeInTheDocument()
  })
})
