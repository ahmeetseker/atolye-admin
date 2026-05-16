/**
 * F10.D — Team member CRUD for /profile.
 *
 * Persistence: `localStorage` key `arsam.admin-team.v1`.
 * Seed: on first read with no persisted state, inject the admin self
 * ("Burhan Kaynak") as `role='admin'`, `status='active'`.
 *
 * SSR-safe — every accessor guards on `typeof window`.
 */

const STORAGE_KEY = 'arsam.admin-team.v1'

export type TeamRole = 'admin' | 'agent' | 'finance' | 'viewer'
export type TeamStatus = 'active' | 'pending' | 'suspended'

export interface TeamMember {
  id: string
  name: string
  email: string
  role: TeamRole
  status: TeamStatus
  invitedAt: number
  joinedAt?: number
  /** True for the seeded admin self — actions are disabled in UI. */
  isSelf?: boolean
}

export const SELF_ID = 'self-admin'

function makeSelfSeed(): TeamMember {
  const now = Date.now()
  return {
    id: SELF_ID,
    name: 'Burhan Kaynak',
    email: 'burhan@arsam.net',
    role: 'admin',
    status: 'active',
    invitedAt: now,
    joinedAt: now,
    isSelf: true,
  }
}

function safeStorage(): Storage | undefined {
  try {
    if (typeof window === 'undefined') return undefined
    return window.localStorage
  } catch {
    return undefined
  }
}

function isMember(x: unknown): x is TeamMember {
  if (!x || typeof x !== 'object') return false
  const m = x as Record<string, unknown>
  return (
    typeof m.id === 'string' &&
    typeof m.name === 'string' &&
    typeof m.email === 'string' &&
    (m.role === 'admin' ||
      m.role === 'agent' ||
      m.role === 'finance' ||
      m.role === 'viewer') &&
    (m.status === 'active' ||
      m.status === 'pending' ||
      m.status === 'suspended') &&
    typeof m.invitedAt === 'number'
  )
}

function readAll(): TeamMember[] {
  const storage = safeStorage()
  if (!storage) return [makeSelfSeed()]
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) {
      // First read — seed self.
      const seed = [makeSelfSeed()]
      storage.setItem(STORAGE_KEY, JSON.stringify(seed))
      return seed
    }
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      const seed = [makeSelfSeed()]
      storage.setItem(STORAGE_KEY, JSON.stringify(seed))
      return seed
    }
    const valid = parsed.filter(isMember)
    // Make sure the self row is always present (UI invariant).
    if (!valid.some((m) => m.id === SELF_ID)) {
      valid.unshift(makeSelfSeed())
    }
    return valid
  } catch {
    return [makeSelfSeed()]
  }
}

function writeAll(rows: TeamMember[]): void {
  const storage = safeStorage()
  if (!storage) return
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(rows))
  } catch {
    /* quota / private mode — silently no-op so the UI doesn't crash. */
  }
}

export function getTeamMembers(): TeamMember[] {
  return readAll().sort((a, b) => a.invitedAt - b.invitedAt)
}

export function addMember(input: {
  name?: string
  email: string
  role: TeamRole
}): TeamMember {
  const all = readAll()
  const id = `tm-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`
  // Derive a fallback display name from the email local-part if none provided
  // (matches the spec "mock invite" flow — server would normally fill this on accept).
  const fallbackName =
    input.name ??
    input.email
      .split('@')[0]
      .split(/[._-]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
  const member: TeamMember = {
    id,
    name: fallbackName || input.email,
    email: input.email,
    role: input.role,
    status: 'pending',
    invitedAt: Date.now(),
  }
  all.push(member)
  writeAll(all)
  return member
}

export function removeMember(id: string): void {
  if (id === SELF_ID) return
  const next = readAll().filter((m) => m.id !== id)
  writeAll(next)
}

export function updateMemberRole(id: string, role: TeamRole): void {
  if (id === SELF_ID) return
  const all = readAll().map((m) => (m.id === id ? { ...m, role } : m))
  writeAll(all)
}

export function setMemberStatus(id: string, status: TeamStatus): void {
  if (id === SELF_ID) return
  const all = readAll().map((m) => {
    if (m.id !== id) return m
    const next: TeamMember = { ...m, status }
    if (status === 'active' && !m.joinedAt) next.joinedAt = Date.now()
    return next
  })
  writeAll(all)
}

/** Email shape check used by the invite dialog. Mirrors HTML5 input[type=email] roughly. */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}
