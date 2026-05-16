import { describe, it, expect } from 'vitest'
import { formatTL, formatTLCompact, formatArea, timeAgo } from '@landx/ui'

describe('formatTL', () => {
  it('formats integers with Turkish locale and TRY symbol', () => {
    expect(formatTL(8400000)).toBe('₺8.400.000')
  })

  it('formats small numbers', () => {
    expect(formatTL(1500)).toBe('₺1.500')
  })

  it('formats zero', () => {
    expect(formatTL(0)).toBe('₺0')
  })
})

describe('formatTLCompact', () => {
  it('formats millions with prefix and TR compact notation', () => {
    const out = formatTLCompact(8400000)
    expect(out.startsWith('₺ ')).toBe(true)
    expect(out).toContain('8,4')
  })

  it('formats thousands with TR compact notation', () => {
    const out = formatTLCompact(1500)
    expect(out.startsWith('₺ ')).toBe(true)
    expect(out).toContain('1,5')
  })
})

describe('formatArea', () => {
  it('uses m² suffix for small areas', () => {
    const out = formatArea(1240)
    expect(out).toContain('m²')
    expect(out).toContain('1.240')
  })

  it('switches to "bin m²" for large areas', () => {
    const out = formatArea(12000)
    expect(out).toContain('bin m²')
  })
})

describe('timeAgo', () => {
  it('returns "şimdi" for sub-minute differences', () => {
    expect(timeAgo(new Date().toISOString())).toBe('şimdi')
  })

  it('returns minutes for sub-hour differences', () => {
    const iso = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    expect(timeAgo(iso)).toBe('5 dk önce')
  })

  it('returns hours for sub-day differences', () => {
    const iso = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
    expect(timeAgo(iso)).toBe('3 sa önce')
  })

  it('returns days for sub-week differences', () => {
    const iso = new Date(Date.now() - 3 * 86400 * 1000).toISOString()
    expect(timeAgo(iso)).toBe('3 gün önce')
  })

  it('returns weeks for multi-week differences', () => {
    const iso = new Date(Date.now() - 14 * 86400 * 1000).toISOString()
    expect(timeAgo(iso)).toBe('2 hafta önce')
  })
})
