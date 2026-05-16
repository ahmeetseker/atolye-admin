import {
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from 'react'
import { AnimatePresence, motion, type Transition } from 'framer-motion'
import { Check, Loader2, X } from '@landx/icons'
import { cn } from '@landx/ui'
import {
  FAST_FADE,
  REDUCED_MOTION_TRANSITION,
  STANDARD_SPRING,
  motionGate,
} from '@landx/ui/lib'
import { STAGE_ORDER, type Deal, type NewDealInput } from '@landx/data'
import { useToast } from '@/lib/use-toast'

interface NewDealModalProps {
  open: boolean
  pending?: boolean
  error?: Error | null
  onClose: () => void
  onSubmit: (input: NewDealInput) => void
}

interface FormState {
  customerName: string
  listingTitle: string
  value: string
  stage: Deal['stage']
  status: Deal['status']
  owner: string
}

const STATUS_OPTIONS: Deal['status'][] = ['Aktif', 'Bekliyor', 'Risk']

const EMPTY: FormState = {
  customerName: '',
  listingTitle: '',
  value: '',
  stage: 'İlk temas',
  status: 'Aktif',
  owner: 'Ahmet',
}

/**
 * Compact centered modal for creating a new deal. Mirrors customer-new
 * intent but lives as a modal (not a full route) so the Kanban "Yeni fırsat"
 * button stays in-context.
 *
 * - Centered, max-w-md, p-4 md:p-6 padding on the backdrop
 * - Esc + backdrop close (unless pending)
 * - useTransition wraps submit dispatch
 */
export function NewDealModal({
  open,
  pending = false,
  error = null,
  onClose,
  onSubmit,
}: NewDealModalProps) {
  const [form, setForm] = useState<FormState>(EMPTY)
  const titleId = useId()
  const firstFieldRef = useRef<HTMLInputElement | null>(null)
  const [, startTransition] = useTransition()
  const { toast } = useToast()
  const submittingRef = useRef(false)
  const prevPendingRef = useRef(false)
  const backdropTransition = motionGate<Transition>(REDUCED_MOTION_TRANSITION, FAST_FADE)
  const panelTransition = motionGate<Transition>(REDUCED_MOTION_TRANSITION, STANDARD_SPRING)

  useEffect(() => {
    if (!open) setForm(EMPTY)
  }, [open])

  useEffect(() => {
    const wasPending = prevPendingRef.current
    if (wasPending && !pending && submittingRef.current) {
      submittingRef.current = false
      if (error) {
        toast(`Hata: ${error.message || 'Oluşturulamadı.'}`, { variant: 'error' })
      } else {
        toast('Fırsat oluşturuldu', { variant: 'success' })
      }
    }
    prevPendingRef.current = pending
  }, [pending, error, toast])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        if (!pending) onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, pending, onClose])

  useEffect(() => {
    if (open) {
      queueMicrotask(() => firstFieldRef.current?.focus())
    }
  }, [open])

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }))

  const canSubmit =
    !pending &&
    form.customerName.trim().length > 0 &&
    Number(form.value) > 0 &&
    form.owner.trim().length > 0

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    submittingRef.current = true
    startTransition(() => {
      onSubmit({
        customerName: form.customerName.trim(),
        listingTitle: form.listingTitle.trim(),
        value: Number(form.value),
        owner: form.owner.trim(),
        stage: form.stage,
        status: form.status,
      })
    })
  }

  return (
    <AnimatePresence>
      {open && (
        <div
          role="presentation"
          data-testid="deal-new-modal"
          className="fixed inset-0 z-[75] grid place-items-center p-4 md:p-6"
        >
          <motion.button
            type="button"
            aria-label="Kapat"
            onClick={() => {
              if (!pending) onClose()
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={backdropTransition}
            className="absolute inset-0 cursor-default bg-foreground/40 backdrop-blur-sm"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 4 }}
            transition={panelTransition}
            className={cn(
              'relative z-10 flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xl',
            )}
          >
            <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
              <div className="min-w-0">
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  MOD · YENİ FIRSAT
                </div>
                <h2
                  id={titleId}
                  className="mt-1 font-serif text-xl font-light leading-tight"
                >
                  Fırsat <em className="font-serif italic font-light">oluştur</em>
                </h2>
              </div>
              <button
                type="button"
                aria-label="Modal'ı kapat"
                data-testid="deal-new-close"
                onClick={onClose}
                disabled={pending}
                className={cn(
                  'flex h-9 w-9 flex-none items-center justify-center rounded-lg text-muted-foreground transition',
                  'hover:bg-foreground/5 hover:text-foreground disabled:opacity-50',
                )}
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <form onSubmit={handleSubmit} className="flex flex-col">
              <div className="flex-1 overflow-y-auto px-5 py-5">
                <div className="space-y-4">
                  <Field id="new-deal-customer" label="Müşteri adı">
                    <input
                      ref={firstFieldRef}
                      id="new-deal-customer"
                      data-testid="deal-new-field-customer"
                      type="text"
                      value={form.customerName}
                      onChange={(e) => set('customerName', e.target.value)}
                      className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none transition focus:border-foreground"
                      placeholder="Ad Soyad"
                      required
                    />
                  </Field>

                  <Field id="new-deal-listing" label="İlan başlığı">
                    <input
                      id="new-deal-listing"
                      data-testid="deal-new-field-listing"
                      type="text"
                      value={form.listingTitle}
                      onChange={(e) => set('listingTitle', e.target.value)}
                      className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none transition focus:border-foreground"
                      placeholder="örn. Ayvalık zeytinlik"
                    />
                  </Field>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <Field id="new-deal-value" label="Değer (TL)">
                      <input
                        id="new-deal-value"
                        data-testid="deal-new-field-value"
                        type="number"
                        min="0"
                        step="1000"
                        value={form.value}
                        onChange={(e) => set('value', e.target.value)}
                        className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none transition focus:border-foreground"
                        placeholder="5000000"
                        required
                      />
                    </Field>
                    <Field id="new-deal-owner" label="Temsilci">
                      <input
                        id="new-deal-owner"
                        data-testid="deal-new-field-owner"
                        type="text"
                        value={form.owner}
                        onChange={(e) => set('owner', e.target.value)}
                        className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none transition focus:border-foreground"
                        required
                      />
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <Field id="new-deal-stage" label="Aşama">
                      <select
                        id="new-deal-stage"
                        data-testid="deal-new-field-stage"
                        value={form.stage}
                        onChange={(e) =>
                          set('stage', e.target.value as Deal['stage'])
                        }
                        className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none transition focus:border-foreground"
                      >
                        {STAGE_ORDER.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field id="new-deal-status" label="Durum">
                      <select
                        id="new-deal-status"
                        data-testid="deal-new-field-status"
                        value={form.status}
                        onChange={(e) =>
                          set('status', e.target.value as Deal['status'])
                        }
                        className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none transition focus:border-foreground"
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  {error && (
                    <div
                      role="alert"
                      className="rounded-xl border border-border bg-foreground/5 px-3 py-2 text-[12.5px] text-foreground"
                    >
                      Oluşturma başarısız. Tekrar dener misin?
                    </div>
                  )}
                </div>
              </div>

              <footer className="flex items-center justify-end gap-2 border-t border-border bg-muted/30 px-5 py-3">
                <button
                  type="button"
                  data-testid="deal-new-cancel"
                  onClick={onClose}
                  disabled={pending}
                  className={cn(
                    'inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-[13px] font-medium transition',
                    'hover:bg-foreground/5 disabled:cursor-not-allowed disabled:opacity-50',
                  )}
                >
                  İptal
                </button>
                <button
                  type="submit"
                  data-testid="deal-new-submit"
                  disabled={!canSubmit}
                  className={cn(
                    'inline-flex items-center justify-center gap-1.5 rounded-xl bg-foreground px-4 py-2 text-[13px] font-medium text-background transition',
                    'hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40',
                  )}
                >
                  {pending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}
                  {pending ? 'Oluşturuluyor…' : 'Oluştur'}
                </button>
              </footer>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

function Field({
  id,
  label,
  children,
}: {
  id: string
  label: string
  children: ReactNode
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
      >
        {label}
      </label>
      {children}
    </div>
  )
}
