import { useContext } from 'react'
import { AuthContext, type AuthContextValue } from './AuthProvider'

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth() must be used inside <AuthProvider>')
  }
  return ctx
}

/**
 * Convenience hook for gated routes — returns `{ isAuthenticated, user }`.
 * Pair with `<RequireAuth>` for an opt-in inline gate.
 */
export function useRequireAuth(): {
  isAuthenticated: boolean
  user: AuthContextValue['user']
} {
  const { isAuthenticated, user } = useAuth()
  return { isAuthenticated, user }
}
