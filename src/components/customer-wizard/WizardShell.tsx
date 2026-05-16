import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router'
import { X } from '@landx/icons'
import { cn } from '@landx/ui'

const STEPS = [
  { id: 1, label: 'Kimlik' },
  { id: 2, label: 'İlişki' },
  { id: 3, label: 'Ticari' },
  { id: 4, label: 'Onay' },
] as const

export function WizardShell({ currentStep, children }: { currentStep: number; children: ReactNode }) {
  const navigate = useNavigate()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') navigate('/customers')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">MOD · YENİ MÜŞTERİ</span>
            <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
              %{Math.round(((currentStep - 1) / (STEPS.length - 1)) * 100)} tamamlandı
            </span>
          </div>
          <Link
            to="/customers"
            aria-label="Sihirbazı kapat"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-foreground/5 hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
          >
            <X className="h-4 w-4" />
          </Link>
        </div>

        <div className="mx-auto flex max-w-[1100px] items-center gap-0 px-4 pb-3">
          {STEPS.map((s, i) => {
            const reached = currentStep >= s.id
            return (
              <div key={s.id} data-testid={`wizard-step-${s.id}`} className="flex flex-1 items-center gap-2">
                <span
                  aria-current={currentStep === s.id ? 'step' : undefined}
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-full border font-mono text-[11px] font-medium transition',
                    reached
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-border bg-card text-muted-foreground',
                  )}
                >
                  {s.id}
                </span>
                <span className={cn('flex-none text-[12px] font-medium', reached ? 'text-foreground' : 'text-muted-foreground')}>
                  {s.label}
                </span>
                {i < STEPS.length - 1 && (
                  <span aria-hidden className={cn('h-px flex-1', currentStep > s.id ? 'bg-foreground' : 'bg-border')} />
                )}
              </div>
            )
          })}
        </div>
      </header>

      <main className="mx-auto max-w-[840px] px-4 py-8 md:py-12">{children}</main>
    </div>
  )
}
