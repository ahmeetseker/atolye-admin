import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CustomerTimeline } from '@/components/customers/CustomerTimeline'
import type { Customer } from '@landx/data'

function makeCustomer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: 'M-9999',
    name: 'Lonely Lead',
    segment: 'Soğuk',
    stage: 'İlk temas',
    lastContact: '2026-01-01T00:00:00Z',
    value: 0,
    source: 'Sahibinden',
    owner: 'Burhan',
    interestArea: 'Test',
    ...overrides,
  }
}

describe('CustomerTimeline', () => {
  it('renders the lead score summary card with tier label', () => {
    render(<CustomerTimeline customer={makeCustomer()} />)
    expect(screen.getByTestId('customer-timeline-score')).toBeTruthy()
    const tier = screen.getByTestId('customer-timeline-tier')
    expect(['Sıcak', 'Ilık', 'Soğuk']).toContain(tier.textContent)
  })

  it('shows the empty state when there is no activity and no notes', () => {
    render(<CustomerTimeline customer={makeCustomer()} />)
    expect(screen.getByTestId('customer-timeline-empty')).toBeTruthy()
    expect(screen.queryByTestId('customer-timeline-list')).toBeNull()
  })

  it('renders a month-grouped event list for an active customer', () => {
    // Mehmet Yılmaz (M-2391) has events + a transaction + a conversation in mocks
    render(
      <CustomerTimeline
        customer={makeCustomer({
          id: 'M-2391',
          name: 'Mehmet Yılmaz',
          notes: 'Bu hafta kaparo bekleniyor.',
        })}
      />,
    )
    expect(screen.getByTestId('customer-timeline-list')).toBeTruthy()
    expect(screen.queryByTestId('customer-timeline-empty')).toBeNull()
  })

  it('uses the +5 contact-channel bonus reason when phone and email are set', () => {
    render(
      <CustomerTimeline
        customer={makeCustomer({
          phone: '+90 555 000 00 00',
          email: 'a@b.com',
        })}
      />,
    )
    expect(
      screen.getByText(/Telefon \+ e-posta mevcut/),
    ).toBeTruthy()
  })
})
