import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, type Transition } from 'framer-motion'
import { Mail, UserPlus } from '@landx/icons'
import { cn } from '@landx/ui'
import {
  FAST_FADE,
  REDUCED_MOTION_TRANSITION,
  STANDARD_SPRING,
  motionGate,
} from '@landx/ui/lib'
import {
  addMember,
  isValidEmail,
  type TeamRole,
} from '@/lib/admin-team'
import { useToast } from '@/lib/use-toast'

interface InviteMemberDialogProps {
  open: boolean
  onClose: () => void
  onInvited?: () => void
}

const ROLES: { value: TeamRole; label: string; hint: string }[] = [
  { value: 'admin', label: 'Yönetici', hint: 'Tüm panel + ekip yönetimi' },
  { value: 'agent', label: 'Danışman', hint: 'İlan + müşteri + fırsat' },
  { value: 'finance', label: 'Muhasebe', hint: 'Yalnız finans modülü' },
  { value: 'viewer', label: 'İzleyici', hint: 'Salt okunur' },
]

export function InviteMemberDialog({
  open,
  onClose,
  onInvited,
}: InviteMemberDialogProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<TeamRole>('agent')
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()
  const emailRef = useRef<HTMLInputElement | null>(null)
  const backdropTransition = motionGate<Transition>(REDUCED_MOTION_TRANSITION, FAST_FADE)
  const panelTransition = motionGate<Transition>(REDUCED_MOTION_TRANSITION, STANDARD_SPRING)

  useEffect(() => {
    if (!open) return
    setEmail('')
    setRole('agent')
    setError(null)
    queueMicrotask(() => emailRef.current?.focus())
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = email.trim()
    if (!isValidEmail(trimmed)) {
      setError('Geçerli bir e-posta gir')
      return
    }
    addMember({ email: trimmed, role })
    onInvited?.()
    toast(`Davet yollandı (mock) — ${trimmed}`, { variant: 'success' })
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <div
          data-testid="team-invite-dialog"
          className="fixed inset-0 z-[80] grid place-items-center p-4"
        >
          <motion.button
            type="button"
            aria-label="Kapat"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={backdropTransition}
            className="absolute inset-0 cursor-default bg-foreground/40 backdrop-blur-sm"
          />
          <motion.form
            role="dialog"
            aria-modal="true"
            aria-labelledby="invite-dialog-title"
            onSubmit={submit}
            noValidate
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 4 }}
            transition={panelTransition}
            className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-xl"
          >
            <div className="p-5">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-8 w-8 flex-none items-center justify-center rounded-full bg-foreground/10 text-foreground">
                  <UserPlus className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2
                    id="invite-dialog-title"
                    className="font-serif text-lg font-light leading-tight"
                  >
                    Yeni üye <em className="font-serif italic font-light">davet et</em>
                  </h2>
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    Davet linki mock — backend bağlanana kadar pending durumunda
                    listelenir.
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <label
                    htmlFor="invite-email"
                    className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
                  >
                    E-posta
                  </label>
                  <div className="mt-1 flex items-center gap-2 rounded-xl border border-border bg-background/40 px-3 focus-within:border-foreground/40">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      ref={emailRef}
                      id="invite-email"
                      data-testid="invite-email-input"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value)
                        if (error) setError(null)
                      }}
                      placeholder="hilal@arsam.net"
                      className="min-h-11 flex-1 bg-transparent py-2 text-[13.5px] outline-none placeholder:text-muted-foreground/50 md:min-h-0"
                    />
                  </div>
                  {error && (
                    <p
                      role="alert"
                      data-testid="invite-email-error"
                      className="mt-1.5 text-[11.5px] text-rose-700 dark:text-rose-300"
                    >
                      {error}
                    </p>
                  )}
                </div>

                <fieldset>
                  <legend className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    Rol
                  </legend>
                  <div className="mt-1.5 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    {ROLES.map((r) => {
                      const checked = role === r.value
                      return (
                        <label
                          key={r.value}
                          className={cn(
                            'flex cursor-pointer items-start gap-2 rounded-xl border px-3 py-2.5 transition',
                            checked
                              ? 'border-foreground/60 bg-foreground/[0.04]'
                              : 'border-border bg-background/40 hover:bg-foreground/[0.03]',
                          )}
                        >
                          <input
                            type="radio"
                            name="invite-role"
                            value={r.value}
                            checked={checked}
                            onChange={() => setRole(r.value)}
                            data-testid={`invite-role-${r.value}`}
                            className="mt-0.5 h-3.5 w-3.5 accent-foreground"
                          />
                          <span className="min-w-0">
                            <span className="block text-[12.5px] font-medium leading-tight">
                              {r.label}
                            </span>
                            <span className="mt-0.5 block font-mono text-[10px] text-muted-foreground">
                              {r.hint}
                            </span>
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </fieldset>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-border bg-muted/30 px-5 py-3 md:flex-row md:justify-end">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-[13px] font-medium transition hover:bg-foreground/5"
              >
                İptal
              </button>
              <button
                type="submit"
                data-testid="invite-submit"
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-foreground px-4 py-2 text-[13px] font-medium text-background transition hover:opacity-90"
              >
                Davet gönder
              </button>
            </div>
          </motion.form>
        </div>
      )}
    </AnimatePresence>
  )
}
