import { describe, it, expect, beforeEach } from 'vitest'
import {
  buildIndex,
  search,
  trLower,
  tokenize,
  addRecent,
  loadRecent,
  clearRecent,
} from '@/lib/assistant/search-index'
import { LISTINGS, CUSTOMERS } from '@landx/data'

/** In-memory localStorage shim — jsdom 29's localStorage is non-functional here. */
function memoryStorage(): Storage {
  const map = new Map<string, string>()
  return {
    get length() {
      return map.size
    },
    clear() {
      map.clear()
    },
    getItem(k) {
      return map.has(k) ? map.get(k)! : null
    },
    key(i) {
      return Array.from(map.keys())[i] ?? null
    },
    removeItem(k) {
      map.delete(k)
    },
    setItem(k, v) {
      map.set(k, String(v))
    },
  }
}

describe('search-index — TR locale lowercase', () => {
  it('lowercases TR-specific characters correctly', () => {
    // Dotless I/i variants — environment may render İ→i or İ→i̇; assert behaviour, not exact glyph.
    expect(trLower('IĞDIR')).toBe('ığdır')
    expect(trLower('ŞEKER ÇAY')).toBe('şeker çay')
    // Default Unicode behaviour: I→ı when locale is tr-TR.
    expect(trLower('IZMIR')).toBe('ızmır')
    // Token splitter normalises punctuation and lower-cases.
    expect(tokenize('Ayvalık · Cunda')).toEqual(['ayvalık', 'cunda'])
  })
})

describe('search-index — title boost and matching', () => {
  it('matches a listing by title token', () => {
    const idx = buildIndex()
    const results = search(idx, 'Cunda')
    expect(results.length).toBeGreaterThan(0)
    // At least one Cunda listing must rank above threshold and be type=listing.
    const top = results[0]
    expect(['listing', 'event', 'deal', 'customer']).toContain(top.type)
    const listing = results.find((r) => r.type === 'listing')
    expect(listing).toBeDefined()
    expect(listing!.label.toLocaleLowerCase('tr-TR')).toContain('cunda')
  })
})

describe('search-index — ID prefix boost (5x)', () => {
  it('ranks an exact ID prefix match very high', () => {
    const idx = buildIndex()
    // Pick a real listing id like "28.AY.0142"
    const sample = LISTINGS[0]
    const prefix = sample.id.slice(0, 4)
    const results = search(idx, prefix)
    expect(results.length).toBeGreaterThan(0)
    // The match with our exact id should beat any tag-only hit.
    const exact = results.find((r) => r.id === sample.id)
    expect(exact).toBeDefined()
    expect(exact!.score).toBeGreaterThanOrEqual(5)
    // And it should be ahead of (or equal to) others.
    expect(results[0].score).toBeGreaterThanOrEqual(exact!.score - 0.0001)
  })
})

describe('search-index — multi-token query', () => {
  it('scores both tokens (customer "Burhan Kaynak")', () => {
    const idx = buildIndex()
    const customer = CUSTOMERS[0]
    const results = search(idx, customer.name)
    const hit = results.find((r) => r.id === customer.id)
    expect(hit).toBeDefined()
    // First+last name → at least title boost twice (~6.0).
    expect(hit!.score).toBeGreaterThanOrEqual(4)
  })
})

describe('search-index — threshold filter and empty query', () => {
  it('returns [] for empty query', () => {
    const idx = buildIndex()
    expect(search(idx, '')).toEqual([])
    expect(search(idx, '   ')).toEqual([])
  })

  it('filters all results below threshold (score > 0)', () => {
    const idx = buildIndex()
    // Sufficiently exotic to guarantee no haystack/token hit.
    const results = search(idx, 'qqqzzzxxx')
    expect(results).toEqual([])
  })

  it('respects entities filter', () => {
    const idx = buildIndex()
    const results = search(idx, 'Ayvalık', { entities: ['customer'] })
    expect(results.every((r) => r.type === 'customer')).toBe(true)
  })

  it('respects limit', () => {
    const idx = buildIndex()
    const results = search(idx, 'a', { limit: 3 })
    expect(results.length).toBeLessThanOrEqual(3)
  })
})

describe('recent searches — add/dedupe/limit', () => {
  let storage: Storage
  beforeEach(() => {
    storage = memoryStorage()
  })

  it('persists last 5 with newest-first dedupe', () => {
    let cur: string[] = []
    cur = addRecent('Cunda', cur, storage)
    cur = addRecent('Ayvalık', cur, storage)
    cur = addRecent('Datça', cur, storage)
    cur = addRecent('Marmaris', cur, storage)
    cur = addRecent('Çeşme', cur, storage)
    cur = addRecent('Bodrum', cur, storage) // pushes "Cunda" out
    const stored = loadRecent(storage)
    expect(stored.length).toBe(5)
    expect(stored[0]).toBe('Bodrum')
    expect(stored.includes('Cunda')).toBe(false)
  })

  it('dedupes case-insensitively (TR locale)', () => {
    let cur: string[] = []
    cur = addRecent('Ayvalık', cur, storage)
    cur = addRecent('Cunda', cur, storage)
    cur = addRecent('ayvalık', cur, storage) // case-only difference → moves to front, no duplicate
    const stored = loadRecent(storage)
    expect(stored[0]).toBe('ayvalık')
    expect(stored.filter((x) => x.toLocaleLowerCase('tr-TR') === 'ayvalık').length).toBe(1)
    expect(stored.length).toBe(2)
  })

  it('clearRecent wipes storage', () => {
    addRecent('Cunda', [], storage)
    expect(loadRecent(storage).length).toBeGreaterThan(0)
    clearRecent(storage)
    expect(loadRecent(storage)).toEqual([])
  })
})
