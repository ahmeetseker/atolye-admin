/**
 * sessionStorage wrapper for stub auth (Faz 10.2).
 *
 * sessionStorage (not localStorage): token must NOT survive a browser
 * restart — the stub flow has no refresh token; a stale token = forced
 * re-login is the safer default. SSR-safe even though admin is a SPA.
 */

import type { User } from './types'

const STORAGE_KEY = 'landx-atolye-auth'

export interface AuthSnapshot {
  token: string
  user: User
  expiresAt: string
}

export function readAuthSnapshot(): AuthSnapshot | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<AuthSnapshot>
    if (
      !parsed ||
      typeof parsed.token !== 'string' ||
      !parsed.token ||
      !parsed.user ||
      typeof parsed.expiresAt !== 'string'
    ) {
      return null
    }
    // Expired tokens are dropped on read — caller treats as logged-out.
    if (Date.parse(parsed.expiresAt) <= Date.now()) {
      window.sessionStorage.removeItem(STORAGE_KEY)
      return null
    }
    return parsed as AuthSnapshot
  } catch {
    return null
  }
}

export function writeAuthSnapshot(snapshot: AuthSnapshot): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
  } catch {
    // Quota / private-mode failures are non-fatal; caller still holds
    // in-memory state.
  }
}

export function clearAuthSnapshot(): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    /* noop */
  }
}
