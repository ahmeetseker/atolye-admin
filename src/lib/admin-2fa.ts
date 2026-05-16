/**
 * F10.D — Mock 2FA state for /profile.
 *
 * Persistence: `localStorage` key `arsam.admin-2fa.v1`.
 * No real TOTP — verifyCode accepts ANY 6-digit string.
 *
 * `getMockSecret()` is deterministic per init: the secret is generated once
 * and persisted alongside enabled=false so the displayed QR placeholder is
 * stable across re-renders until the user activates.
 *
 * SSR-safe.
 */

const STORAGE_KEY = 'arsam.admin-2fa.v1'

export interface TwoFactorState {
  enabled: boolean
  secret?: string
  backupCodes?: string[]
  enabledAt?: number
}

function safeStorage(): Storage | undefined {
  try {
    if (typeof window === 'undefined') return undefined
    return window.localStorage
  } catch {
    return undefined
  }
}

function randomHex(bytes: number): string {
  const chars = '0123456789ABCDEF'
  let out = ''
  for (let i = 0; i < bytes * 2; i++) {
    out += chars[Math.floor(Math.random() * 16)]
  }
  return out
}

function randomBackupCode(): string {
  // 8-char alphanumeric. Excludes ambiguous 0/O, 1/I/L to make manual copy easier.
  const chars = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'
  let out = ''
  for (let i = 0; i < 8; i++) {
    out += chars[Math.floor(Math.random() * chars.length)]
  }
  return out
}

function read(): TwoFactorState {
  const storage = safeStorage()
  if (!storage) return { enabled: false }
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return { enabled: false }
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return { enabled: false }
    const enabled = parsed.enabled === true
    const state: TwoFactorState = { enabled }
    if (typeof parsed.secret === 'string') state.secret = parsed.secret
    if (Array.isArray(parsed.backupCodes)) {
      state.backupCodes = parsed.backupCodes.filter(
        (x: unknown) => typeof x === 'string',
      )
    }
    if (typeof parsed.enabledAt === 'number') state.enabledAt = parsed.enabledAt
    return state
  } catch {
    return { enabled: false }
  }
}

function write(state: TwoFactorState): void {
  const storage = safeStorage()
  if (!storage) return
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* quota / private mode — silently no-op. */
  }
}

export function getTwoFactorState(): TwoFactorState {
  return read()
}

/**
 * Deterministic per init — on first call we generate `ARSAM-MOCK-XXXXXXXX`
 * and persist it (with enabled=false). Subsequent calls return the same value
 * until disable() clears it.
 */
export function getMockSecret(): string {
  const current = read()
  if (current.secret) return current.secret
  const secret = `ARSAM-MOCK-${randomHex(4)}`
  write({ ...current, secret })
  return secret
}

/**
 * 6-digit string check. Verification is mock — any 6-digit code passes.
 */
export function verifyCode(code: string): boolean {
  return /^\d{6}$/.test(code)
}

/**
 * Activates 2FA. Returns the freshly generated 10 backup codes — show them to
 * the user once, then they live in storage as the source of truth for the
 * "Yedek kodlar" reveal panel.
 */
export function enableTwoFactor(code: string): {
  ok: boolean
  state?: TwoFactorState
  reason?: string
} {
  if (!verifyCode(code)) {
    return { ok: false, reason: '6 haneli kod gerekli' }
  }
  const secret = getMockSecret()
  const backupCodes = Array.from({ length: 10 }, () => randomBackupCode())
  const state: TwoFactorState = {
    enabled: true,
    secret,
    backupCodes,
    enabledAt: Date.now(),
  }
  write(state)
  return { ok: true, state }
}

export function disableTwoFactor(): void {
  write({ enabled: false })
}
