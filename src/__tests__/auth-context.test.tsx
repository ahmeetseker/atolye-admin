import { describe, it, expect, beforeEach, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'
import { ApiError } from '@landx/data'
import { AuthProvider } from '@/auth/AuthProvider'
import { useAuth } from '@/auth/use-auth'

vi.mock('@landx/data', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@landx/data')>()
  return {
    ...actual,
    configureApi: vi.fn(),
    apiPost: vi.fn(),
  }
})

// Import the mocked surface after the mock factory is registered.
const dataMod = await import('@landx/data')
const mockedConfigureApi = vi.mocked(dataMod.configureApi)
const mockedApiPost = vi.mocked(dataMod.apiPost)

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(
      QueryClientProvider,
      { client: qc },
      createElement(AuthProvider, { baseUrl: '/api/v1', children }),
    )
  return { qc, wrapper }
}

const ADMIN_USER = {
  id: 'usr_admin',
  email: 'admin@arsam.local',
  name: 'Admin Atölye',
  role: 'tenant-admin' as const,
  tenantId: 't_atolye',
  createdAt: '2026-01-01T00:00:00.000Z',
}

beforeEach(() => {
  window.sessionStorage.clear()
  mockedConfigureApi.mockClear()
  mockedApiPost.mockReset()
  // Fallback: if the proactive /auth/refresh timer fires unexpectedly during
  // a non-refresh test, return a resolved promise so we don't crash on
  // `undefined.then(...)`. Tests that exercise refresh explicitly override
  // this with mockResolvedValueOnce / mockRejectedValueOnce.
  mockedApiPost.mockResolvedValue(undefined)
})

// Far-future expiresAt for tests that don't care about refresh scheduling —
// keeps the proactive-refresh timer dormant (delay = exp - now - 5min ≈ 55min)
// so it never fires within the vitest default 5s window.
const FAR_FUTURE = () => new Date(Date.now() + 60 * 60 * 1000).toISOString()

describe('AuthProvider', () => {
  it('starts with no user when sessionStorage is empty', () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useAuth(), { wrapper })
    expect(result.current.user).toBeNull()
    expect(result.current.token).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('login() stores user + token on success', async () => {
    mockedApiPost.mockResolvedValueOnce({
      data: {
        token: 'jwt.token.value',
        user: ADMIN_USER,
        expiresAt: FAR_FUTURE(),
      },
    })

    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useAuth(), { wrapper })

    await act(async () => {
      await result.current.login({
        email: 'admin@arsam.local',
        password: 'password123',
      })
    })

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true)
    })
    expect(result.current.user?.email).toBe('admin@arsam.local')
    expect(result.current.token).toBe('jwt.token.value')
    expect(mockedApiPost).toHaveBeenCalledWith('/auth/login', {
      email: 'admin@arsam.local',
      password: 'password123',
    })
  })

  it('login() surfaces wrong-password error (no state change)', async () => {
    mockedApiPost.mockRejectedValueOnce(
      new ApiError(401, 'UNAUTHORIZED', 'Invalid email or password'),
    )

    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useAuth(), { wrapper })

    await expect(
      act(async () => {
        await result.current.login({
          email: 'admin@arsam.local',
          password: 'wrong',
        })
      }),
    ).rejects.toBeInstanceOf(ApiError)

    expect(result.current.user).toBeNull()
    expect(result.current.token).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('logout() clears user + token + sessionStorage', async () => {
    mockedApiPost
      .mockResolvedValueOnce({
        data: {
          token: 'jwt.token.value',
          user: ADMIN_USER,
          expiresAt: FAR_FUTURE(),
        },
      })
      .mockResolvedValueOnce(undefined)

    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useAuth(), { wrapper })

    await act(async () => {
      await result.current.login({
        email: 'admin@arsam.local',
        password: 'password123',
      })
    })
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true))
    expect(window.sessionStorage.getItem('landx-atolye-auth')).toBeTruthy()

    await act(async () => {
      await result.current.logout()
    })

    expect(result.current.user).toBeNull()
    expect(result.current.token).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
    expect(window.sessionStorage.getItem('landx-atolye-auth')).toBeNull()
    expect(mockedApiPost).toHaveBeenLastCalledWith('/auth/logout')
  })

  it('configureApi is called with the right baseUrl on mount', () => {
    const { wrapper } = makeWrapper()
    renderHook(() => useAuth(), { wrapper })

    expect(mockedConfigureApi).toHaveBeenCalledTimes(1)
    const arg = mockedConfigureApi.mock.calls[0]![0]
    expect(arg.baseUrl).toBe('/api/v1')
    expect(typeof arg.getToken).toBe('function')
    // getToken reads from the latest state — starts null.
    expect(arg.getToken!()).toBeNull()
  })

  it('window "auth:unauthorized" event clears auth state', async () => {
    mockedApiPost.mockResolvedValueOnce({
      data: {
        token: 'jwt.token.value',
        user: ADMIN_USER,
        expiresAt: FAR_FUTURE(),
      },
    })

    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useAuth(), { wrapper })

    await act(async () => {
      await result.current.login({
        email: 'admin@arsam.local',
        password: 'password123',
      })
    })
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true))

    await act(async () => {
      window.dispatchEvent(new Event('auth:unauthorized'))
    })

    expect(result.current.isAuthenticated).toBe(false)
    expect(window.sessionStorage.getItem('landx-atolye-auth')).toBeNull()
  })

  it('schedules a proactive /auth/refresh and swaps in the new token', async () => {
    // 6 min until expiry — schedule fires at expiry - 5 min = 1 min into the
    // test. Using a near-future window keeps the wait < vitest's 5s default,
    // and avoids fake-timer interplay with React 19 + testing-library.
    const firstExpiresAt = new Date(Date.now() + 6 * 60 * 1000).toISOString()
    const secondExpiresAt = new Date(Date.now() + 66 * 60 * 1000).toISOString()

    let resolveRefresh!: (v: unknown) => void
    const refreshPromise = new Promise((resolve) => {
      resolveRefresh = resolve
    })

    mockedApiPost
      .mockImplementationOnce(() =>
        Promise.resolve({
          data: { token: 'token.v1', user: ADMIN_USER, expiresAt: firstExpiresAt },
        }),
      )
      .mockImplementationOnce(() => refreshPromise)

    // Stub setTimeout so the proactive-refresh timer fires immediately. We
    // restore it on cleanup so we don't leak the override to other tests.
    const realSetTimeout = window.setTimeout
    const setTimeoutSpy = vi
      .spyOn(window, 'setTimeout')
      // First call (Promise micro-queue / etc.) uses the real impl; only the
      // proactive-refresh schedule (delay > 0) gets shortcut to delay=0.
      .mockImplementation(((fn: () => void, delay?: number) => {
        if (typeof delay === 'number' && delay > 0) {
          return realSetTimeout(fn, 0)
        }
        return realSetTimeout(fn, delay)
      }) as typeof window.setTimeout)

    try {
      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useAuth(), { wrapper })

      await act(async () => {
        await result.current.login({
          email: 'admin@arsam.local',
          password: 'password123',
        })
      })
      await waitFor(() => expect(result.current.token).toBe('token.v1'))

      // Resolve the pending refresh now that the scheduled timer has fired.
      await act(async () => {
        resolveRefresh({
          data: { token: 'token.v2', user: ADMIN_USER, expiresAt: secondExpiresAt },
        })
        // Flush microtasks.
        await Promise.resolve()
        await Promise.resolve()
      })

      await waitFor(() => expect(result.current.token).toBe('token.v2'))
      expect(mockedApiPost).toHaveBeenCalledWith('/auth/refresh')
      expect(result.current.expiresAt).toBe(secondExpiresAt)
    } finally {
      setTimeoutSpy.mockRestore()
    }
  })

  it('clears state when proactive /auth/refresh fails', async () => {
    const firstExpiresAt = new Date(Date.now() + 6 * 60 * 1000).toISOString()

    let rejectRefresh!: (e: unknown) => void
    const refreshPromise = new Promise((_resolve, reject) => {
      rejectRefresh = reject
    })

    mockedApiPost
      .mockImplementationOnce(() =>
        Promise.resolve({
          data: { token: 'token.v1', user: ADMIN_USER, expiresAt: firstExpiresAt },
        }),
      )
      .mockImplementationOnce(() => refreshPromise)

    const realSetTimeout = window.setTimeout
    const setTimeoutSpy = vi
      .spyOn(window, 'setTimeout')
      .mockImplementation(((fn: () => void, delay?: number) => {
        if (typeof delay === 'number' && delay > 0) {
          return realSetTimeout(fn, 0)
        }
        return realSetTimeout(fn, delay)
      }) as typeof window.setTimeout)

    try {
      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useAuth(), { wrapper })

      await act(async () => {
        await result.current.login({
          email: 'admin@arsam.local',
          password: 'password123',
        })
      })
      await waitFor(() => expect(result.current.isAuthenticated).toBe(true))

      await act(async () => {
        rejectRefresh(new ApiError(401, 'UNAUTHORIZED', 'Refresh window elapsed'))
        await Promise.resolve()
        await Promise.resolve()
      })

      await waitFor(() => expect(result.current.isAuthenticated).toBe(false))
      expect(result.current.token).toBeNull()
      expect(result.current.user).toBeNull()
      expect(window.sessionStorage.getItem('landx-atolye-auth')).toBeNull()
    } finally {
      setTimeoutSpy.mockRestore()
    }
  })
})
