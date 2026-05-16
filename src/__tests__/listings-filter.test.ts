import { describe, it, expect } from 'vitest'
import { applyFilters, LISTINGS } from '@landx/data'

describe('applyFilters', () => {
  it('returns every listing when the filter is empty', () => {
    expect(applyFilters(LISTINGS, {})).toHaveLength(LISTINGS.length)
  })

  it('treats "Tümü" as a passthrough for status', () => {
    expect(applyFilters(LISTINGS, { status: 'Tümü' })).toHaveLength(LISTINGS.length)
  })

  it('filters by status === Aktif', () => {
    const out = applyFilters(LISTINGS, { status: 'Aktif' })
    expect(out.length).toBeGreaterThan(0)
    expect(out.every((l) => l.status === 'Aktif')).toBe(true)
  })

  it('filters by type === Zeytinlik', () => {
    const out = applyFilters(LISTINGS, { type: 'Zeytinlik' })
    expect(out.length).toBeGreaterThan(0)
    expect(out.every((l) => l.type === 'Zeytinlik')).toBe(true)
  })

  it('search matches by district (e.g. "Cunda")', () => {
    const out = applyFilters(LISTINGS, { search: 'Cunda' })
    expect(out.length).toBeGreaterThan(0)
    expect(out.every((l) => l.district.toLocaleLowerCase('tr-TR').includes('cunda'))).toBe(true)
  })

  it('search matches by id exact-case (the "10.HV.0156" regression)', () => {
    const out = applyFilters(LISTINGS, { search: '10.HV.0156' })
    expect(out.length).toBe(1)
    expect(out[0].id).toBe('10.HV.0156')
  })

  it('search is case-insensitive across id/title/city/district/tags', () => {
    const out = applyFilters(LISTINGS, { search: 'cunda' })
    expect(out.length).toBeGreaterThan(0)
  })

  it('priceMax filters out listings above the cap', () => {
    const out = applyFilters(LISTINGS, { priceMax: 5_000_000 })
    expect(out.every((l) => l.price <= 5_000_000)).toBe(true)
  })

  it('priceMin filters out listings below the floor', () => {
    const out = applyFilters(LISTINGS, { priceMin: 10_000_000 })
    expect(out.every((l) => l.price >= 10_000_000)).toBe(true)
  })

  it('areaMin filters out listings smaller than the floor', () => {
    const out = applyFilters(LISTINGS, { areaMin: 5_000 })
    expect(out.every((l) => l.size >= 5_000)).toBe(true)
  })

  it('combines multiple filters with AND-logic', () => {
    const out = applyFilters(LISTINGS, { status: 'Aktif', type: 'Zeytinlik' })
    expect(out.length).toBeGreaterThan(0)
    expect(out.every((l) => l.status === 'Aktif' && l.type === 'Zeytinlik')).toBe(true)
  })

  it('returns an empty array when no listings match', () => {
    const out = applyFilters(LISTINGS, { search: '__no-such-listing-zzz__' })
    expect(out).toEqual([])
  })
})
