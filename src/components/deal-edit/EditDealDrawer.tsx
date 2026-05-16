import {
  useEffect,
  useId,
  useMemo,
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
import { STAGE_ORDER, type Deal } from '@landx/data'
import { useToast } from '@/lib/use-toast'

interface EditDealDrawerProps {
  open: boolean
  deal: Deal | null
  pending?: boolean
  error?: Error | null
  onClose: () => void
  onSubmit: (input: {
    id: string
    patch: Partial<
      Pick<
        Deal,
        'customerName' | 'listingTitle' | 'value' | 'stage' | 'status' | 'owner'
      >
    >
  }) => void
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

function toFormState(d: Deal | null): FormState {
  if (!d) {
    return {
      customerName: '',
      listingTitle: '',
      value: '',
      stage: 'İlk temas',
      status: 'Aktif',
      owner: '',
    }
  }
  return {
    customerName: d.customerName,
    listingTitle: d.listingTitle,
    value: String(d.value),
    stage: d.stage,
    status: d.status,
    owner: d.owner,
  }
}

/**
 * Right-side drawer for editing a deal.
 *
 * - w-[480px] on md+, full-width on mobile
 * - Esc + backdrop close (unless pending)
 * - useTransition wraps submit dispatch to keep INP < 200ms
 */
export function EditDealDrawer({
  open,
  deal,
  pending = false,
  error = null,
  onClose,
  onSubmit,
}: EditDealDrawerProps) {
  const initial = useMemo(() => toFormState(deal), [deal])
  const [form, setForm] = useState<FormState>(initial)
  const titleId = useId()
  const firstFieldRef = useRef<HTMLInputElement | null>(null)
  const [, startTransition] = useTransition()
  const { toast } = useToast()
  const submittingRef = useRef(false)
  const prevPendingRef = useRef(false)
  const backdropTransition = motionGate<Transition>(REDUCED_MOTION_TRANSITION, FAST_FADE)
  const panelTransition = motionGate<Transition>(REDUCED_MOTION_TRANSITION, STANDARD_SPRING)

  useEffect(() => {
    setForm(initial)
  }, [initial])

  useEffect(() => {
    const wasPending = prevPendingRef.current
    if (wasPending && !pending && submittingRef.current) {
      submittingRef.current = false
      if (error) {
        toast(`Hata: ${error.message || 'Kaydedilemedi.'}`, { variant: 'error' })
      } else {
        toast('Kaydedildi', { variant: 'success' })
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
    !!deal &&
    form.customerName.trim().length > 0 &&
    Number(form.value) > 0

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit || !deal) return
    const patch: Partial<
      Pick<Deal, 'customerName' | 'listingTitle' | 'value' | 'stage' | 'status' | 'owner'>
    > = {}
    if (form.customerName.trim() !== deal.customerName)
      patch.customerName = form.customerName.trim()
    if (form.listingTitle.trim() !== deal.listingTitle)
      patch.listingTitle = form.listingTitle.trim()
    const nextValue = Number(form.value)
    if (nextValue !== deal.value) patch.value = nextValue
    if (form.stage !== deal.stage) patch.stage = form.stage
    if (form.status !== deal.status) patch.status = form.status
    if (form.owner.trim() !== deal.owner) patch.owner = form.owner.trim()

    submittingRef.current = true
    startTransition(() => {
      onSubmit({ id: deal.id, patch })
    })
  }

  return (
    <AnimatePresence>
      {open && (
        <div
          role="presentation"
          data-testid="deal-edit-drawer"
          className="fixed inset-0 z-[70]"
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
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={panelTransition}
            className={cn(
              'absolute right-0 top-0 flex h-full w-full flex-col border-l border-border bg-card shadow-2xl',
              'md:w-[480px]',
            )}
          >
            <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
              <div className="min-w-0">
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  MOD · FIRSAT DÜZENLE
                </div>
                <h2
                  id={titleId}
                  className="mt-1 font-serif text-xl font-light leading-tight"
                >
                  Fırsatı <em className="font-serif italic font-light">güncelle</em>
                </h2>
                {deal && (
                  <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                    {deal.id}
                  </p>
                )}
              </div>
              <button
                type="button"
                aria-label="Drawer'ı kapat"
                data-testid="deal-edit-close"
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

            <form
              onSubmit={handleSubmit}
              className="flex flex-1 flex-col overflow-hidden"
            >
              <div className="flex-1 overflow-y-auto px-5 py-5">
                <div className="space-y-4">
                  <Field id="edit-deal-customer" label="Müşteri adı">
                    <input
                      ref={firstFieldRef}
                      id="edit-deal-customer"
                      data-testid="deal-edit-field-customer"
                      type="text"
                      value={form.customerName}
                      onChange={(e) => set('customerName', e.target.value)}
                      className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none transition focus:border-foreground"
                      required
                    />
                  </Field>

                  <Field id="edit-deal-listing" label="İlan başlığı">
                    <input
                      id="edit-deal-listing"
                      data-testid="deal-edit-field-listing"
                      type="text"
                      value={form.listingTitle}
                      onChange={(e) => set('listingTitle', e.target.value)}
                      className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none transition focus:border-foreground"
                    />
                  </Field>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <Field id="edit-deal-value" label="Değer (TL)">
                      <input
                        id="edit-deal-value"
                        data-testid="deal-edit-field-value"
                        type="number"
                        min="0"
                        step="1000"
                        value={form.value}
                        onChange={(e) => set('value', e.target.value)}
                        className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none transition focus:border-foreground"
                        required
                      />
                    </Field>
                    <Field id="edit-deal-owner" label="Temsilci">
                      <input
                        id="edit-deal-owner"
                        data-testid="deal-edit-field-owner"
                        type="text"
                        value={form.owner}
                        onChange={(e) => set('owner', e.target.value)}
                        className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none transition focus:border-foreground"
                      />
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <Field id="edit-deal-stage" label="Aşama">
                      <select
                        id="edit-deal-stage"
                        data-testid="deal-edit-field-stage"
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
                    <Field id="edit-deal-status" label="Durum">
                      <select
                        id="edit-deal-status"
                        data-testid="deal-edit-field-status"
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
                      Güncelleme başarısız. Tekrar dener misin?
                    </div>
                  )}
                </div>
              </div>

              <footer className="flex items-center justify-end gap-2 border-t border-border bg-muted/30 px-5 py-3">
                <button
                  type="button"
                  data-testid="deal-edit-cancel"
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
                  data-testid="deal-edit-submit"
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
                  {pending ? 'Kaydediliyor…' : 'Kaydet'}
                </button>
              </footer>
            </form>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  )
}

function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string
  label: string
  hint?: string
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
      {hint && (
        <div className="mt-1 text-[11.5px] text-muted-foreground">{hint}</div>
      )}
    </div>
  )
}
