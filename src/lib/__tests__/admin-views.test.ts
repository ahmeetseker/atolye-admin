import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  getSavedViews,
  addSavedView,
  removeSavedView,
  SYSTEM_VIEWS,
  type AdminApp,
  type SavedView,
} from '@/lib/admin-views'

const STORAGE_KEY = 'arsam.admin-views.v1'

/** In-memory localStorage shim — jsdom 29's localStorage is non-functional here. */
function installMemoryStorage(): Storage {
  const map = new Map<string, string>()
  const storage: Storage = {
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
  Object.defineProperty(window, 'localStorage', {
    value: storage,
    configurable: true,
    writable: true,
  })
  return storage
}

let originalStorageDescriptor: PropertyDescriptor | undefined

beforeEach(() => {
  originalStorageDescriptor = Object.getOwnPropertyDescriptor(
    window,
    'localStorage',
  )
  installMemoryStorage()
})

afterEach(() => {
  if (originalStorageDescriptor) {
    Object.defineProperty(window, 'localStorage', originalStorageDescriptor)
  }
})

describe('admin-views — CRUD', () => {
  it('returns empty array when no entries persisted', () => {
    expect(getSavedViews('listings')).toEqual([])
    expect(getSavedViews('customers')).toEqual([])
  })

  it('addSavedView persists a new entry and returns it', () => {
    const view = addSavedView({
      app: 'listings',
      name: 'Bodrum Aktif',
      params: 'status=Aktif&search=Bodrum',
    })

    expect(view.id).toMatch(/^[a-z0-9-]+$/)
    expect(view.name).toBe('Bodrum Aktif')
    expect(view.app).toBe('listings')
    expect(view.createdAt).toBeTypeOf('number')

    const persisted = getSavedViews('listings')
    expect(persisted).toHaveLength(1)
    expect(persisted[0]).toEqual(view)
  })

  it('filters views by app — listings entries do not leak to customers', () => {
    addSavedView({ app: 'listings', name: 'A', params: 'x=1' })
    addSavedView({ app: 'customers', name: 'B', params: 'y=2' })

    expect(getSavedViews('listings').map((v) => v.name)).toEqual(['A'])
    expect(getSavedViews('customers').map((v) => v.name)).toEqual(['B'])
  })

  it('removeSavedView drops by id and preserves the rest', () => {
    const a = addSavedView({ app: 'listings', name: 'A', params: '' })
    const b = addSavedView({ app: 'listings', name: 'B', params: '' })
    removeSavedView(a.id)

    const left = getSavedViews('listings')
    expect(left).toHaveLength(1)
    expect(left[0].id).toBe(b.id)
  })

  it('dedupes by id (later add with same id overwrites)', () => {
    addSavedView({ app: 'listings', name: 'First', params: '' })
    // Force a collision via direct storage manipulation. addSavedView itself
    // generates unique ids, so we simulate the migration / multi-tab race.
    const existing = JSON.parse(
      window.localStorage.getItem(STORAGE_KEY) || '[]',
    ) as SavedView[]
    existing.push({ ...existing[0], name: 'Second' })
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(existing))

    const out = getSavedViews('listings')
    expect(out).toHaveLength(1)
    // Last entry wins on dedupe.
    expect(out[0].name).toBe('Second')
  })

  it('returns saved views sorted by createdAt ascending (oldest first)', () => {
    const a = addSavedView({ app: 'listings', name: 'A', params: '' })
    // simulate later-saved entry
    const b: SavedView = {
      id: 'manual-b',
      app: 'listings',
      name: 'B',
      params: '',
      createdAt: a.createdAt + 1000,
    }
    const stored = JSON.parse(
      window.localStorage.getItem(STORAGE_KEY) || '[]',
    ) as SavedView[]
    stored.unshift(b)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))

    const out = getSavedViews('listings')
    expect(out.map((v) => v.name)).toEqual(['A', 'B'])
  })
})

describe('SYSTEM_VIEWS', () => {
  it('exposes built-in defaults for listings (Tümü / Aktif / Pasif)', () => {
    const listingsApp: AdminApp = 'listings'
    const names = SYSTEM_VIEWS[listingsApp].map((v) => v.name)
    expect(names).toEqual(['Tümü', 'Aktif', 'Pasif'])
  })

  it('exposes customer defaults including Tümü + Sıcak', () => {
    const customersApp: AdminApp = 'customers'
    const names = SYSTEM_VIEWS[customersApp].map((v) => v.name)
    expect(names).toContain('Tümü')
    expect(names).toContain('Sıcak')
  })
})
