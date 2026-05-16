import { useNavigate } from 'react-router'
import { PageShell } from '@landx/ui'
import { LoginForm } from '@/auth/LoginForm'
import { useAuth } from '@/auth/use-auth'

export function Login() {
  const navigate = useNavigate()
  const { isAuthenticated, user, logout } = useAuth()

  return (
    <PageShell
      eyebrow="MOD · GİRİŞ"
      title={
        <>
          Atölye <em className="font-serif italic font-light">girişi</em>
        </>
      }
      description="Stub auth — gerçek SSO/refresh-token akışı I02-I03'te (Wave 16+) gelecek."
    >
      <div className="mx-auto w-full max-w-[420px] sm:max-w-md md:max-w-lg lg:max-w-md">
        {isAuthenticated && user ? (
          <div className="rounded-2xl border border-border bg-card p-5 text-center md:p-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              GİRİŞ YAPILDI
            </p>
            <h3 className="mt-2 font-serif text-2xl font-light tracking-tight md:text-3xl">
              {user.name}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
            <div className="mt-5 flex flex-col gap-2 md:flex-row md:gap-3">
              <button
                type="button"
                data-testid="auth-panel-return"
                onClick={() => navigate('/')}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-foreground px-3 py-2.5 text-sm font-medium text-background transition hover:opacity-90 md:min-h-0 md:flex-1"
              >
                Panele dön
              </button>
              <button
                type="button"
                data-testid="auth-logout"
                onClick={() => {
                  void logout()
                }}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-background/40 px-3 py-2.5 text-sm font-medium text-foreground transition hover:bg-foreground/[0.04] md:min-h-0 md:flex-1"
              >
                Çıkış yap
              </button>
            </div>
          </div>
        ) : (
          <LoginForm onSuccess={() => navigate('/')} />
        )}
      </div>
    </PageShell>
  )
}
