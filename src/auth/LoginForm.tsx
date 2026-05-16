/**
 * LoginForm — token-only styled form (Faz 10.2).
 *
 * Token rules (CLAUDE.md): no raw hex, no `bg-white`/`bg-black`,
 * no sky/indigo/blue. Submit is `bg-foreground text-background`.
 */

import { useState, type FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { ApiError } from '@landx/data'
import { useAuth } from './use-auth'

interface LoginFormProps {
  /** Called after a successful login. Defaults to a no-op — useful for the
   *  `/login` route to navigate, or for `<RequireAuth>` to just unblock. */
  onSuccess?: () => void
  /** Title above the form. */
  title?: string
  /** Description under the title. */
  description?: string
}

function extractMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 401 || err.code === 'UNAUTHORIZED') {
      return 'E-posta veya parola hatalı.'
    }
    if (err.status >= 400 && err.status < 500) {
      return err.message || 'Giriş bilgileri reddedildi.'
    }
    return 'Sunucu hatası. Lütfen tekrar deneyin.'
  }
  return 'Bağlantı kurulamadı.'
}

export function LoginForm({
  onSuccess,
  title = 'Atölye girişi',
  description = 'Devam etmek için hesabınla giriş yap.',
}: LoginFormProps) {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const mutation = useMutation({
    mutationFn: (input: { email: string; password: string }) => login(input),
    onSuccess: () => {
      onSuccess?.()
    },
  })

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!email.trim() || !password) return
    mutation.mutate({ email: email.trim(), password })
  }

  const errorMessage = mutation.isError ? extractMessage(mutation.error) : null
  const isPending = mutation.isPending

  return (
    <div className="mx-auto w-full max-w-sm">
      <header className="mb-6 text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          MOD · GİRİŞ
        </p>
        <h2 className="mt-2 font-serif text-3xl font-light tracking-tight">
          {title}
        </h2>
        {description && (
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        )}
      </header>

      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-2xl border border-border bg-card p-6"
      >
        <label className="block space-y-1.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            E-posta
          </span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isPending}
            data-testid="login-email-input"
            className="w-full rounded-xl border border-border bg-background/40 px-3 py-2 text-sm text-foreground outline-none transition focus:border-foreground/40 focus:bg-background disabled:opacity-60"
            placeholder="ornek@arsam.local"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Parola
          </span>
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isPending}
            data-testid="login-password-input"
            className="w-full rounded-xl border border-border bg-background/40 px-3 py-2 text-sm text-foreground outline-none transition focus:border-foreground/40 focus:bg-background disabled:opacity-60"
            placeholder="••••••••"
          />
        </label>

        {errorMessage && (
          <p
            role="alert"
            data-testid="form-error"
            className="rounded-lg border border-border bg-background/40 px-3 py-2 text-[12px] text-foreground"
          >
            {errorMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending || !email.trim() || !password}
          data-testid="login-submit"
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-3 py-2.5 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-60"
        >
          {isPending ? 'Giriş yapılıyor…' : 'Giriş yap'}
        </button>

        <p className="text-center font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Stub auth · admin@arsam.local · password123
        </p>
      </form>
    </div>
  )
}
