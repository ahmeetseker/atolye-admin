/**
 * AuthProvider — stub auth for atolye-admin (Faz 10.2 / Wave 15 / A73).
 *
 * Responsibilities:
 * 1. Holds `{ token, user, expiresAt }` in memory (single source of truth).
 * 2. Hydrates from sessionStorage on mount (token does NOT survive a
 *    browser restart on purpose — see auth-storage.ts).
 * 3. Calls `configureApi({ baseUrl: '/api/v1', getToken })` on mount BEFORE
 *    children render, so TanStack Query hooks that fire during the first
 *    render already see the configured client + bearer injection.
 * 4. Listens to `auth:unauthorized` window events (api-client agnostic —
 *    any 401 producer can dispatch one) and clears state.
 * 5. Schedules a proactive `/auth/refresh` 5 minutes before `expiresAt` so
 *    users never hit a 401 mid-session (Faz 10.2.refresh / A77).
 *    - On refresh success: state updates with new token + expiresAt, reschedule.
 *    - On refresh failure: clear state + dispatch `auth:unauthorized`.
 *    - On unmount or login/logout transitions: prior timer is cleared.
 */

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { ApiError, apiPost, configureApi } from '@landx/data'
import type { User } from './types'
import {
  clearAuthSnapshot,
  readAuthSnapshot,
  writeAuthSnapshot,
  type AuthSnapshot,
} from './auth-storage'

export interface LoginInput {
  email: string
  password: string
}

export interface LoginResponse {
  data: AuthSnapshot
}

export interface AuthContextValue {
  user: User | null
  token: string | null
  expiresAt: string | null
  isAuthenticated: boolean
  login: (input: LoginInput) => Promise<void>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

interface AuthProviderProps {
  children: ReactNode
  /** Override for tests — defaults to `/api/v1`. */
  baseUrl?: string
}

interface AuthState {
  user: User | null
  token: string | null
  expiresAt: string | null
}

const EMPTY_STATE: AuthState = { user: null, token: null, expiresAt: null }

// Refresh `REFRESH_LEAD_MS` milliseconds before `expiresAt`. Must mirror the
// API's REFRESH_WINDOW_BEFORE_EXP_SEC (5 min) — schedule slightly inside the
// window so the request lands while the token is still refresh-eligible.
const REFRESH_LEAD_MS = 5 * 60 * 1000

export function AuthProvider({
  children,
  baseUrl = '/api/v1',
}: AuthProviderProps) {
  const [state, setState] = useState<AuthState>(() => {
    const snapshot = readAuthSnapshot()
    return snapshot
      ? { user: snapshot.user, token: snapshot.token, expiresAt: snapshot.expiresAt }
      : EMPTY_STATE
  })

  // getToken needs to read the latest state without re-configuring on every
  // login — ref ensures the api-client closure always sees fresh tokens.
  const tokenRef = useRef<string | null>(state.token)
  tokenRef.current = state.token

  // configureApi BEFORE any child renders — useMemo() runs during the render
  // phase, so the api-client is ready before TanStack Query hooks fire.
  useMemo(() => {
    configureApi({
      baseUrl,
      getToken: () => tokenRef.current,
    })
  }, [baseUrl])

  const login = useCallback(async ({ email, password }: LoginInput) => {
    const res = await apiPost<LoginResponse>('/auth/login', { email, password })
    const snapshot = res.data
    writeAuthSnapshot(snapshot)
    setState({
      user: snapshot.user,
      token: snapshot.token,
      expiresAt: snapshot.expiresAt,
    })
  }, [])

  const logout = useCallback(async () => {
    // Optimistically clear local state; ignore server errors (stub endpoint
    // is best-effort, real impl in I03 will rotate the session).
    try {
      await apiPost('/auth/logout')
    } catch {
      /* ignore */
    }
    clearAuthSnapshot()
    setState(EMPTY_STATE)
  }, [])

  useEffect(() => {
    const onUnauthorized = () => {
      clearAuthSnapshot()
      setState(EMPTY_STATE)
    }
    window.addEventListener('auth:unauthorized', onUnauthorized)
    return () => window.removeEventListener('auth:unauthorized', onUnauthorized)
  }, [])

  // Proactive token rotation (Faz 10.2.refresh / A77).
  // Schedule a single setTimeout for `expiresAt - REFRESH_LEAD_MS`. On fire,
  // POST /auth/refresh and update state with the new token. The effect re-runs
  // when `expiresAt` changes (e.g., after login or a successful refresh),
  // which also clears the prior timer via the cleanup.
  useEffect(() => {
    if (!state.token || !state.expiresAt) return

    const expiryMs = Date.parse(state.expiresAt)
    if (!Number.isFinite(expiryMs)) return

    // If already inside the refresh lead window (or past), refresh immediately
    // rather than scheduling a same-tick timer. setTimeout(fn, 0) is the floor.
    const delay = Math.max(0, expiryMs - Date.now() - REFRESH_LEAD_MS)

    const timer = window.setTimeout(() => {
      apiPost<LoginResponse>('/auth/refresh')
        .then((res) => {
          const snapshot = res.data
          writeAuthSnapshot(snapshot)
          setState({
            user: snapshot.user,
            token: snapshot.token,
            expiresAt: snapshot.expiresAt,
          })
        })
        .catch(() => {
          // Refresh failed — token is no longer valid; let the global
          // unauthorized handler clear state (also clears storage).
          window.dispatchEvent(new Event('auth:unauthorized'))
        })
    }, delay)

    return () => window.clearTimeout(timer)
  }, [state.token, state.expiresAt])

  const value = useMemo<AuthContextValue>(
    () => ({
      user: state.user,
      token: state.token,
      expiresAt: state.expiresAt,
      isAuthenticated: !!state.token && !!state.user,
      login,
      logout,
    }),
    [state.user, state.token, state.expiresAt, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/**
 * Re-export for callers that want to introspect API failures inline
 * (e.g., LoginForm distinguishing 401 from network errors).
 */
export { ApiError }
