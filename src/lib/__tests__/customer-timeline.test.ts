import { describe, it, expect } from 'vitest'
import {
  getCustomerTimeline,
  groupByMonth,
  monthGroupKey,
  type TimelineEvent,
} from '@/lib/customer-timeline'
import type { Customer } from '@landx/data'

function makeCustomer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: 'M-XXXX',
    name: 'Test Müşteri',
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

describe('getCustomerTimeline — aggregation', () => {
  it('returns empty array for a customer with no activity and no notes', () => {
    const events = getCustomerTimeline(makeCustomer())
    expect(events).toEqual([])
  })

  it('pulls calendar events when customerName matches', () => {
    // Mehmet Yılmaz appears in EVENTS mock with type 'visit'
    const events = getCustomerTimeline(
      makeCustomer({ name: 'Mehmet Yılmaz', id: 'M-2391' }),
    )
    expect(events.some((e) => e.kind === 'visit')).toBe(true)
  })

  it('pulls messages from CONVERSATIONS by customer id', () => {
    // M-2401 = Burhan Kaynak has a pinned WhatsApp conversation
    const events = getCustomerTimeline(
      makeCustomer({ id: 'M-2401', name: 'Burhan Kaynak' }),
    )
    expect(events.some((e) => e.kind === 'message')).toBe(true)
  })

  it('pulls transactions when party matches the customer name', () => {
    // Mehmet Yılmaz has a Cunda kaparosu transaction
    const events = getCustomerTimeline(
      makeCustomer({ id: 'M-2391', name: 'Mehmet Yılmaz' }),
    )
    expect(events.some((e) => e.kind === 'transaction')).toBe(true)
  })

  it('emits a single note event when customer.notes is set', () => {
    const events = getCustomerTimeline(
      makeCustomer({
        notes: 'Kaparo bekleniyor',
        lastContact: '2026-05-10T10:00:00Z',
      }),
    )
    const notes = events.filter((e) => e.kind === 'note')
    expect(notes).toHaveLength(1)
    expect(notes[0].title).toBe('Kaparo bekleniyor')
    expect(notes[0].timestamp).toBe('2026-05-10T10:00:00Z')
  })

  it('sorts events in descending timestamp order', () => {
    // Mehmet Yılmaz cumulatively pulls events + messages + transactions
    const events = getCustomerTimeline(
      makeCustomer({ id: 'M-2391', name: 'Mehmet Yılmaz' }),
    )
    expect(events.length).toBeGreaterThanOrEqual(2)
    for (let i = 1; i < events.length; i += 1) {
      const prev = Date.parse(events[i - 1].timestamp)
      const cur = Date.parse(events[i].timestamp)
      expect(prev).toBeGreaterThanOrEqual(cur)
    }
  })

  it('hint string for transactions includes amount + type', () => {
    const events = getCustomerTimeline(
      makeCustomer({ id: 'M-2391', name: 'Mehmet Yılmaz' }),
    )
    const txn = events.find((e) => e.kind === 'transaction')
    expect(txn?.hint).toMatch(/Tahsilat|Komisyon|Gider|Vergi/)
    expect(txn?.hint).toMatch(/₺/)
  })

  it('event ids are unique across the timeline', () => {
    const events = getCustomerTimeline(
      makeCustomer({
        id: 'M-2401',
        name: 'Burhan Kaynak',
        notes: 'Test note',
      }),
    )
    const ids = events.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('groupByMonth / monthGroupKey', () => {
  it('formats month keys as "MAYIS 2026"', () => {
    expect(monthGroupKey('2026-05-14T10:00:00Z')).toMatch(/MAYIS 2026/)
  })

  it('groups consecutive events from the same month into one bucket', () => {
    const events: TimelineEvent[] = [
      { id: 'a', kind: 'task', timestamp: '2026-05-14T10:00:00Z', title: 'A' },
      { id: 'b', kind: 'task', timestamp: '2026-05-10T10:00:00Z', title: 'B' },
      { id: 'c', kind: 'task', timestamp: '2026-04-30T10:00:00Z', title: 'C' },
    ]
    const groups = groupByMonth(events)
    expect(groups).toHaveLength(2)
    expect(groups[0].events).toHaveLength(2)
    expect(groups[1].events).toHaveLength(1)
  })

  it('returns BİLİNMİYOR for invalid timestamps', () => {
    expect(monthGroupKey('not-a-date')).toBe('BİLİNMİYOR')
  })
})
