import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  ACTIONS,
  PAGES,
  clearRecent,
  filteredSections,
  pushRecent,
  readRecent,
  searchEntities,
  RECENT_STORAGE_KEY,
} from '@/lib/command-palette'

describe('command-palette registry', () => {
  it('exposes at least 4 static actions', () => {
    expect(ACTIONS.length).toBeGreaterThanOrEqual(4)
    for (const a of ACTIONS) {
      expect(typeof a.id).toBe('string')
      expect(typeof a.label).toBe('string')
      expect(a.type).toBe('action')
    }
  })

  it('PAGES covers every g+letter navigation target', () => {
    const targets = ['/', '/listings', '/customers', '/sales', '/reports', '/calendar', '/messages']
    for (const t of targets) {
      expect(PAGES.find((p) => p.to === t), `missing page ${t}`).toBeDefined()
    }
  })
})

describe('searchEntities', () => {
  it('returns empty list for empty query', () => {
    expect(searchEntities('')).toEqual([])
    expect(searchEntities('   ')).toEqual([])
  })

  it('finds at least one listing for a common city query', () => {
    const results = searchEntities('izmir')
    const listings = results.filter((r) => r.type === 'listing')
    expect(listings.length).toBeGreaterThan(0)
  })

  it('case-insensitive matching is locale-aware (TR)', () => {
    const lower = searchEntities('balıkesir')
    const upper = searchEntities('BALIKESİR')
    expect(lower.length).toBe(upper.length)
  })
})

describe('filteredSections', () => {
  it('without query returns actions + pages only', () => {
    const sections = filteredSections('')
    expect(sections.map((s) => s.label)).toEqual(['AKSİYONLAR', 'SAYFALAR'])
  })

  it('with query may include SONUÇLAR section', () => {
    const sections = filteredSections('müşteri')
    expect(sections.length).toBeGreaterThan(0)
    expect(sections.some((s) => s.label === 'AKSİYONLAR' || s.label === 'SONUÇLAR')).toBe(true)
  })
})

describe('recent search persistence', () => {
  beforeEach(() => {
    clearRecent()
  })

  afterEach(() => {
    clearRecent()
  })

  it('readRecent returns empty list initially', () => {
    expect(readRecent()).toEqual([])
  })

  it('pushRecent stores queries in MRU order, max 5', () => {
    pushRecent('a')
    pushRecent('b')
    pushRecent('c')
    pushRecent('d')
    pushRecent('e')
    pushRecent('f')
    const r = readRecent()
    expect(r).toEqual(['f', 'e', 'd', 'c', 'b'])
  })

  it('pushRecent deduplicates and re-promotes', () => {
    pushRecent('alpha')
    pushRecent('beta')
    pushRecent('alpha')
    expect(readRecent()).toEqual(['alpha', 'beta'])
  })

  it('writes to the documented storage key', () => {
    pushRecent('check-key')
    const raw = localStorage.getItem(RECENT_STORAGE_KEY)
    expect(raw).toBeTruthy()
    expect(JSON.parse(raw!)).toContain('check-key')
  })

  it('clearRecent empties the store', () => {
    pushRecent('one')
    pushRecent('two')
    clearRecent()
    expect(readRecent()).toEqual([])
  })
})
