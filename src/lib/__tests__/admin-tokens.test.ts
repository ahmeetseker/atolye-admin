import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  getTokens,
  createToken,
  revokeToken,
  maskToken,
} from '@/lib/admin-tokens'

const STORAGE_KEY = 'arsam.admin-tokens.v1'

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

describe('admin-tokens', () => {
  it('starts empty when no tokens persisted', () => {
    expect(getTokens()).toEqual([])
  })

  it('createToken returns full value once with the expected shape', () => {
    const t = createToken({ name: 'CI deploy', scopes: ['read', 'write'] })
    expect(t.id).toMatch(/^tk-/)
    expect(t.name).toBe('CI deploy')
    expect(t.prefix).toMatch(/^atk_[a-z0-9]{4}$/)
    expect(t.fullValue).toMatch(/^atk_[a-z0-9]{4}_[a-z0-9]{48}$/)
    // Prefix in the full value must match the standalone prefix field.
    expect(t.fullValue!.startsWith(`${t.prefix}_`)).toBe(true)
    expect(t.scopes).toEqual(['read', 'write'])
    expect(t.createdAt).toBeTypeOf('number')
  })

  it('persists only the prefix — fullValue never appears in storage', () => {
    createToken({ name: 'leak check', scopes: ['admin'] })
    const raw = window.localStorage.getItem(STORAGE_KEY) || '[]'
    expect(raw).not.toMatch(/atk_[a-z0-9]{4}_[a-z0-9]{48}/)
    expect(raw).toMatch(/"prefix":"atk_[a-z0-9]{4}"/)
  })

  it('getTokens returns rows sorted newest-first', () => {
    const a = createToken({ name: 'first', scopes: ['read'] })
    // Tiny delay via createdAt bump is hard to guarantee, so we mutate storage.
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY)!)
    stored[0].createdAt = a.createdAt - 1000
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
    const b = createToken({ name: 'second', scopes: ['write'] })

    const out = getTokens()
    expect(out.map((t) => t.name)).toEqual(['second', 'first'])
    expect(out[0].id).toBe(b.id)
  })

  it('revokeToken drops the row by id', () => {
    const a = createToken({ name: 'a', scopes: ['read'] })
    const b = createToken({ name: 'b', scopes: ['read'] })
    revokeToken(a.id)
    const left = getTokens()
    expect(left).toHaveLength(1)
    expect(left[0].id).toBe(b.id)
  })

  it('maskToken renders the prefix with a bullet suffix', () => {
    expect(maskToken('atk_1234')).toBe('atk_1234_•••••••••')
  })
})
