import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  getTwoFactorState,
  getMockSecret,
  verifyCode,
  enableTwoFactor,
  disableTwoFactor,
} from '@/lib/admin-2fa'

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

describe('admin-2fa', () => {
  it('initial state is disabled (no flags persisted)', () => {
    expect(getTwoFactorState()).toEqual({ enabled: false })
  })

  it('getMockSecret is deterministic per init — same value on repeated calls', () => {
    const a = getMockSecret()
    const b = getMockSecret()
    expect(a).toBe(b)
    expect(a).toMatch(/^ARSAM-MOCK-[0-9A-F]{8}$/)
  })

  it('verifyCode accepts any 6-digit string, rejects others', () => {
    expect(verifyCode('123456')).toBe(true)
    expect(verifyCode('000000')).toBe(true)
    expect(verifyCode('12345')).toBe(false)
    expect(verifyCode('1234567')).toBe(false)
    expect(verifyCode('abcdef')).toBe(false)
    expect(verifyCode('')).toBe(false)
  })

  it('enableTwoFactor persists 10 backup codes + enabledAt, disable clears them', () => {
    const result = enableTwoFactor('999999')
    expect(result.ok).toBe(true)
    expect(result.state?.enabled).toBe(true)
    expect(result.state?.backupCodes).toHaveLength(10)
    expect(result.state?.backupCodes?.every((c) => /^[A-Z0-9]{8}$/.test(c))).toBe(
      true,
    )
    expect(result.state?.enabledAt).toBeTypeOf('number')

    const stored = getTwoFactorState()
    expect(stored.enabled).toBe(true)
    expect(stored.backupCodes).toHaveLength(10)

    disableTwoFactor()
    const after = getTwoFactorState()
    expect(after.enabled).toBe(false)
    expect(after.secret).toBeUndefined()
    expect(after.backupCodes).toBeUndefined()
  })
})
