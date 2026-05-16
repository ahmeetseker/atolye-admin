/**
 * RequireAuth — opt-in gate (Faz 10.2).
 *
 * Wrap any sub-tree to render the LoginForm inline when the user is
 * unauthenticated. Existing admin routes remain PUBLIC by default; this is
 * a building block for future protected views (settings, ekip yönetimi).
 */

import { useNavigate } from 'react-router'
import type { ReactNode } from 'react'
import { LoginForm } from './LoginForm'
import { useAuth } from './use-auth'

interface RequireAuthProps {
  children: ReactNode
  /** If provided, the form navigates here after a successful login.
   *  Otherwise the gate just unblocks and renders `children`. */
  redirectTo?: string
  /** Optional custom fallback when unauthenticated. Defaults to LoginForm. */
  fallback?: ReactNode
}

export function RequireAuth({ children, redirectTo, fallback }: RequireAuthProps) {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()

  if (isAuthenticated) return <>{children}</>

  if (fallback) return <>{fallback}</>

  return (
    <div className="grid min-h-[60vh] place-items-center px-6 py-12">
      <LoginForm
        onSuccess={() => {
          if (redirectTo) navigate(redirectTo)
        }}
      />
    </div>
  )
}
