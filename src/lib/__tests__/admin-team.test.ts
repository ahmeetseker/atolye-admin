import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  getTeamMembers,
  addMember,
  removeMember,
  updateMemberRole,
  setMemberStatus,
  isValidEmail,
  SELF_ID,
} from '@/lib/admin-team'

const STORAGE_KEY = 'arsam.admin-team.v1'

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

describe('admin-team — seed + CRUD', () => {
  it('seeds admin self on first read', () => {
    const members = getTeamMembers()
    expect(members).toHaveLength(1)
    expect(members[0].id).toBe(SELF_ID)
    expect(members[0].name).toBe('Burhan Kaynak')
    expect(members[0].email).toBe('burhan@arsam.net')
    expect(members[0].role).toBe('admin')
    expect(members[0].status).toBe('active')
    expect(members[0].isSelf).toBe(true)
    expect(members[0].joinedAt).toBeTypeOf('number')
  })

  it('addMember creates a pending row and persists it', () => {
    getTeamMembers() // trigger seed
    const m = addMember({ email: 'hilal@arsam.net', role: 'agent' })
    expect(m.email).toBe('hilal@arsam.net')
    expect(m.role).toBe('agent')
    expect(m.status).toBe('pending')
    expect(m.invitedAt).toBeTypeOf('number')
    expect(m.joinedAt).toBeUndefined()
    // Derived from email local-part.
    expect(m.name).toBe('Hilal')

    const persisted = JSON.parse(
      window.localStorage.getItem(STORAGE_KEY) || '[]',
    )
    expect(persisted).toHaveLength(2)
  })

  it('removeMember drops by id but preserves self', () => {
    const a = addMember({ email: 'a@x.com', role: 'viewer' })
    const b = addMember({ email: 'b@x.com', role: 'agent' })
    removeMember(a.id)

    const after = getTeamMembers()
    expect(after.map((m) => m.id)).toEqual([SELF_ID, b.id])
  })

  it('cannot remove the self admin row', () => {
    getTeamMembers()
    removeMember(SELF_ID)
    const after = getTeamMembers()
    expect(after.some((m) => m.id === SELF_ID)).toBe(true)
  })

  it('updateMemberRole changes role and setMemberStatus toggles status (joinedAt set on activate)', () => {
    const a = addMember({ email: 'a@x.com', role: 'agent' })
    updateMemberRole(a.id, 'finance')
    setMemberStatus(a.id, 'active')

    const all = getTeamMembers()
    const updated = all.find((m) => m.id === a.id)!
    expect(updated.role).toBe('finance')
    expect(updated.status).toBe('active')
    expect(updated.joinedAt).toBeTypeOf('number')

    setMemberStatus(a.id, 'suspended')
    const reread = getTeamMembers().find((m) => m.id === a.id)!
    expect(reread.status).toBe('suspended')
  })
})

describe('admin-team — isValidEmail', () => {
  it('accepts standard shapes and rejects malformed', () => {
    expect(isValidEmail('user@example.com')).toBe(true)
    expect(isValidEmail('a.b+tag@sub.example.co')).toBe(true)
    expect(isValidEmail('no-at-symbol')).toBe(false)
    expect(isValidEmail('a@b')).toBe(false)
    expect(isValidEmail('')).toBe(false)
  })
})
