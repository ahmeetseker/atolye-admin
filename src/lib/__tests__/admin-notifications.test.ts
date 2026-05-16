import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  ADMIN_NOTIFICATIONS_KEY,
  deleteMany,
  deleteNotification,
  getNotifications,
  getUnreadCount,
  markAllAsRead,
  markAsRead,
  seedIfEmpty,
  type AdminNotification,
} from '@/lib/admin-notifications'

/** In-memory localStorage shim — jsdom 29's localStorage is non-functional. */
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

describe('admin-notifications', () => {
  it('seedIfEmpty inserts 10 deterministic admin notifications covering all 6 types', () => {
    expect(getNotifications()).toHaveLength(0)
    seedIfEmpty()
    const items = getNotifications()
    expect(items).toHaveLength(10)
    const types = new Set(items.map((n) => n.type))
    expect(types).toEqual(
      new Set([
        'yeni-musteri',
        'yeni-ilan',
        'satis-asama',
        'kontrat',
        'mesaj',
        'sistem',
      ]),
    )
  })

  it('getUnreadCount returns the count of read=false rows', () => {
    seedIfEmpty()
    const expected = getNotifications().filter((n) => !n.read).length
    expect(expected).toBeGreaterThan(0)
    expect(getUnreadCount()).toBe(expected)
  })

  it('markAsRead flips read=true on the matching id', () => {
    seedIfEmpty()
    const unread = getNotifications().find((n) => !n.read)
    expect(unread).toBeDefined()
    markAsRead(unread!.id)
    const after = getNotifications().find((n) => n.id === unread!.id)
    expect(after?.read).toBe(true)
  })

  it('markAllAsRead sets every row to read=true', () => {
    seedIfEmpty()
    markAllAsRead()
    expect(getUnreadCount()).toBe(0)
    expect(getNotifications().every((n) => n.read)).toBe(true)
  })

  it('deleteNotification removes the matching row only', () => {
    seedIfEmpty()
    const initial = getNotifications()
    const target = initial[0]
    deleteNotification(target.id)
    const after = getNotifications()
    expect(after).toHaveLength(initial.length - 1)
    expect(after.find((n) => n.id === target.id)).toBeUndefined()
  })

  it('deleteMany removes every requested row in a single write', () => {
    seedIfEmpty()
    const initial = getNotifications()
    const targets = initial.slice(0, 3).map((n) => n.id)
    deleteMany(targets)
    const after = getNotifications()
    expect(after).toHaveLength(initial.length - 3)
    for (const id of targets) {
      expect(after.find((n) => n.id === id)).toBeUndefined()
    }
  })

  it('malformed storage payload returns empty list without throwing', () => {
    localStorage.setItem(ADMIN_NOTIFICATIONS_KEY, '{this-is-not-json')
    expect(getNotifications()).toEqual([])
    // Seeder still runs cleanly afterwards (overwrites malformed payload).
    seedIfEmpty()
    expect(getNotifications()).toHaveLength(10)
  })

  it('duplicate ids in storage are deduplicated on read (first occurrence wins)', () => {
    const dup: AdminNotification[] = [
      {
        id: 'dup-1',
        type: 'sistem',
        title: 'First',
        body: 'first',
        read: false,
        createdAt: 1_700_000_000_000,
      },
      {
        id: 'dup-1',
        type: 'sistem',
        title: 'Second',
        body: 'second',
        read: true,
        createdAt: 1_700_000_000_001,
      },
    ]
    localStorage.setItem(ADMIN_NOTIFICATIONS_KEY, JSON.stringify(dup))
    const items = getNotifications()
    expect(items).toHaveLength(1)
    expect(items[0].title).toBe('First')
  })
})
