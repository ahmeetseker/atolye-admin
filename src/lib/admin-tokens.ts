/**
 * F10.D — Mock API token CRUD for /profile.
 *
 * Persistence: `localStorage` key `arsam.admin-tokens.v1`.
 * On create we generate a full secret value (`atk_${prefix}_${48 hex chars}`)
 * and return it to the caller, but we PERSIST ONLY the prefix — the full value
 * lives just long enough for the show-once dialog. This mirrors how real
 * server-side token CRUD works (hash-only storage).
 *
 * SSR-safe.
 */

const STORAGE_KEY = 'arsam.admin-tokens.v1'

export type TokenScope = 'read' | 'write' | 'admin'

export interface ApiToken {
  id: string
  name: string
  /** "atk_XXXX" — 4 random chars after the underscore. Shown in the list. */
  prefix: string
  /** Full token, only present on the newly created object. Never persisted. */
  fullValue?: string
  scopes: TokenScope[]
  createdAt: number
  lastUsedAt?: number
}

function safeStorage(): Storage | undefined {
  try {
    if (typeof window === 'undefined') return undefined
    return window.localStorage
  } catch {
    return undefined
  }
}

function randomAlphanum(len: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let out = ''
  for (let i = 0; i < len; i++) {
    out += chars[Math.floor(Math.random() * chars.length)]
  }
  return out
}

function isToken(x: unknown): x is ApiToken {
  if (!x || typeof x !== 'object') return false
  const t = x as Record<string, unknown>
  return (
    typeof t.id === 'string' &&
    typeof t.name === 'string' &&
    typeof t.prefix === 'string' &&
    Array.isArray(t.scopes) &&
    t.scopes.every(
      (s) => s === 'read' || s === 'write' || s === 'admin',
    ) &&
    typeof t.createdAt === 'number'
  )
}

function readAll(): ApiToken[] {
  const storage = safeStorage()
  if (!storage) return []
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isToken)
  } catch {
    return []
  }
}

function writeAll(rows: ApiToken[]): void {
  const storage = safeStorage()
  if (!storage) return
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(rows))
  } catch {
    /* quota / private mode — silently no-op. */
  }
}

export function getTokens(): ApiToken[] {
  return readAll().sort((a, b) => b.createdAt - a.createdAt)
}

export function createToken(input: {
  name: string
  scopes: TokenScope[]
}): ApiToken {
  const id = `tk-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`
  const prefixSuffix = randomAlphanum(4)
  const prefix = `atk_${prefixSuffix}`
  const secret = randomAlphanum(48)
  const fullValue = `atk_${prefixSuffix}_${secret}`

  const stored: ApiToken = {
    id,
    name: input.name.trim() || 'Adsız token',
    prefix,
    // scopes are deduped + ordered so render is stable
    scopes: dedupeScopes(input.scopes),
    createdAt: Date.now(),
  }
  const all = readAll()
  all.push(stored)
  writeAll(all)

  // Return the in-memory copy WITH fullValue for the show-once dialog.
  return { ...stored, fullValue }
}

export function revokeToken(id: string): void {
  const next = readAll().filter((t) => t.id !== id)
  writeAll(next)
}

export function maskToken(prefix: string): string {
  return `${prefix}_${'•'.repeat(9)}`
}

function dedupeScopes(scopes: TokenScope[]): TokenScope[] {
  const order: TokenScope[] = ['read', 'write', 'admin']
  const set = new Set(scopes)
  return order.filter((s) => set.has(s))
}
