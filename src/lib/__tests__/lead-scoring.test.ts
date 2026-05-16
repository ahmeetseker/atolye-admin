import { describe, it, expect } from 'vitest'
import { calculateLeadScore, tierLabel, tierBadgeClass } from '@/lib/lead-scoring'
import type { Customer } from '@landx/data'

const NOW = Date.parse('2026-05-14T12:00:00Z')

function makeCustomer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: 'c1',
    name: 'Ahmet Yılmaz',
    segment: 'Soğuk',
    stage: 'İlk temas',
    lastContact: '2026-01-01T00:00:00Z',
    value: 100_000,
    source: 'Sahibinden',
    owner: 'Burhan',
    interestArea: 'Ayvalık',
    ...overrides,
  }
}

describe('calculateLeadScore — components', () => {
  it('cold base customer gets a low score and "cold" tier', () => {
    const result = calculateLeadScore(makeCustomer(), NOW)
    expect(result.score).toBeLessThan(35)
    expect(result.tier).toBe('cold')
  })

  it('hot segment + recent + high value → hot tier', () => {
    const result = calculateLeadScore(
      makeCustomer({
        segment: 'Sıcak',
        stage: 'Teklif',
        lastContact: '2026-05-13T00:00:00Z',
        value: 8_000_000,
        phone: '+90...',
        email: 'a@b.com',
      }),
      NOW,
    )
    expect(result.tier).toBe('hot')
    expect(result.score).toBeGreaterThanOrEqual(60)
  })

  it('warm segment + 30-day recency lands in warm tier', () => {
    const result = calculateLeadScore(
      makeCustomer({
        segment: 'Ilık',
        lastContact: '2026-04-25T00:00:00Z',
      }),
      NOW,
    )
    expect(result.tier).toBe('warm')
    expect(result.score).toBeGreaterThanOrEqual(35)
    expect(result.score).toBeLessThan(60)
  })

  it('reasons array tracks each weight applied', () => {
    const result = calculateLeadScore(
      makeCustomer({ segment: 'Sıcak', stage: 'Kaparo' }),
      NOW,
    )
    expect(result.reasons.length).toBeGreaterThanOrEqual(2)
    expect(result.reasons.some((r) => r.includes('Sıcak'))).toBe(true)
    expect(result.reasons.some((r) => r.includes('Kaparo'))).toBe(true)
  })

  it('value buckets boost the score', () => {
    const low = calculateLeadScore(makeCustomer({ value: 100_000 }), NOW)
    const mid = calculateLeadScore(makeCustomer({ value: 700_000 }), NOW)
    const high = calculateLeadScore(makeCustomer({ value: 6_000_000 }), NOW)
    expect(mid.score).toBeGreaterThan(low.score)
    expect(high.score).toBeGreaterThan(mid.score)
  })

  it('phone + email gives the +5 bonus; one channel gives +2', () => {
    const none = calculateLeadScore(makeCustomer(), NOW)
    const oneCh = calculateLeadScore(makeCustomer({ phone: '+90 555' }), NOW)
    const both = calculateLeadScore(makeCustomer({ phone: '+90', email: 'a@b.com' }), NOW)
    expect(oneCh.score).toBe(none.score + 2)
    expect(both.score).toBe(none.score + 5)
  })

  it('clamps score to [0, 100]', () => {
    const result = calculateLeadScore(
      makeCustomer({
        segment: 'Sıcak',
        stage: 'Kaparo',
        lastContact: new Date(NOW).toISOString(),
        value: 100_000_000,
        phone: '+90',
        email: 'a@b.com',
      }),
      NOW,
    )
    expect(result.score).toBeLessThanOrEqual(100)
  })

  it('invalid lastContact ISO → zero recency contribution but no crash', () => {
    const result = calculateLeadScore(
      makeCustomer({ lastContact: 'not-a-date' }),
      NOW,
    )
    expect(result.reasons.some((r) => r.includes('gün içinde temas'))).toBe(false)
  })
})

describe('tierLabel + tierBadgeClass', () => {
  it('returns TR labels per tier', () => {
    expect(tierLabel('hot')).toBe('Sıcak')
    expect(tierLabel('warm')).toBe('Ilık')
    expect(tierLabel('cold')).toBe('Soğuk')
  })

  it('returns distinct class strings per tier', () => {
    const classes = [tierBadgeClass('hot'), tierBadgeClass('warm'), tierBadgeClass('cold')]
    expect(new Set(classes).size).toBe(3)
  })
})
