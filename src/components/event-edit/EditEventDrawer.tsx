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
import { eventTypeLabel, type CalendarEvent, type EventType } from '@landx/data'
import { useToast } from '@/lib/use-toast'

interface EditEventDrawerProps {
  open: boolean
  event: CalendarEvent | null
  pending?: boolean
  error?: Error | null
  onClose: () => void
  /**
   * Submit fires the parent's mutate. Forwards only fields that
   * `useUpdateEvent` accepts in the patch contract.
   */
  onSubmit: (input: {
    id: string
    patch: Partial<
      Pick<
        CalendarEvent,
        | 'title'
        | 'type'
        | 'date'
        | 'time'
        | 'durationMin'
        | 'location'
        | 'notes'
        | 'dealId'
        | 'customerName'
      >
    >
  }) => void
}

const TYPE_OPTIONS: EventType[] = ['visit', 'deed', 'task', 'meeting', 'reminder']

interface FormState {
  title: string
  type: EventType
  startISO: string
  endISO: string
  location: string
  description: string
  dealId: string
  customerName: string
}

/**
 * Returns `YYYY-MM-DDTHH:mm` (in local time) suitable for
 * `<input type="datetime-local">`. The native control rejects values
 * containing seconds or timezone offsets.
 */
function toLocalDatetimeInput(iso: string | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  const yyyy = d.getFullYear()
  const mm = pad(d.getMonth() + 1)
  const dd = pad(d.getDate())
  const hh = pad(d.getHours())
  const mi = pad(d.getMinutes())
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`
}

function fromLocalDatetimeInput(local: string): string {
  if (!local) return ''
  const d = new Date(local)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString()
}

function timeFromISO(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function durationMinutes(startISO: string, endISO: string): number | undefined {
  if (!startISO || !endISO) return undefined
  const a = new Date(startISO).getTime()
  const b = new Date(endISO).getTime()
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return undefined
  return Math.round((b - a) / 60000)
}

function toFormState(e: CalendarEvent | null): FormState {
  if (!e) {
    return {
      title: '',
      type: 'task',
      startISO: '',
      endISO: '',
      location: '',
      description: '',
      dealId: '',
      customerName: '',
    }
  }
  const startISO = toLocalDatetimeInput(e.date)
  let endISO = ''
  if (e.durationMin && e.durationMin > 0) {
    const end = new Date(e.date)
    end.setMinutes(end.getMinutes() + e.durationMin)
    endISO = toLocalDatetimeInput(end.toISOString())
  }
  return {
    title: e.title,
    type: e.type,
    startISO,
    endISO,
    location: e.location ?? '',
    description: e.notes ?? '',
    dealId: e.dealId ?? '',
    customerName: e.customerName ?? '',
  }
}

/**
 * Right-side drawer for editing a calendar event.
 *
 * - 480px md+, full-width on mobile
 * - Esc + backdrop click close (unless pending)
 * - useTransition wraps submit dispatch to keep INP < 200ms
 */
export function EditEventDrawer({
  open,
  event,
  pending = false,
  error = null,
  onClose,
  onSubmit,
}: EditEventDrawerProps) {
  const initial = useMemo(() => toFormState(event), [event])
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
        toast('Etkinlik güncellendi', { variant: 'success' })
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
    !pending && !!event && form.title.trim().length > 0 && form.startISO.length > 0

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit || !event) return
    const startISO = fromLocalDatetimeInput(form.startISO)
    const patch: NonNullable<Parameters<typeof onSubmit>[0]['patch']> = {}
    if (form.title.trim() !== event.title) patch.title = form.title.trim()
    if (form.type !== event.type) patch.type = form.type
    if (startISO && startISO !== event.date) {
      patch.date = startISO
      patch.time = timeFromISO(startISO)
    }
    const endISO = fromLocalDatetimeInput(form.endISO)
    const nextDuration = durationMinutes(startISO, endISO)
    if (nextDuration !== event.durationMin) {
      patch.durationMin = nextDuration
    }
    const trimmedLoc = form.location.trim()
    if (trimmedLoc !== (event.location ?? '')) {
      patch.location = trimmedLoc.length > 0 ? trimmedLoc : undefined
    }
    const trimmedDesc = form.description.trim()
    if (trimmedDesc !== (event.notes ?? '')) {
      patch.notes = trimmedDesc.length > 0 ? trimmedDesc : undefined
    }
    const trimmedDeal = form.dealId.trim()
    if (trimmedDeal !== (event.dealId ?? '')) {
      patch.dealId = trimmedDeal.length > 0 ? trimmedDeal : undefined
    }
    const trimmedCustomer = form.customerName.trim()
    if (trimmedCustomer !== (event.customerName ?? '')) {
      patch.customerName = trimmedCustomer.length > 0 ? trimmedCustomer : undefined
    }

    submittingRef.current = true
    startTransition(() => {
      onSubmit({ id: event.id, patch })
    })
  }

  return (
    <AnimatePresence>
      {open && (
        <div
          role="presentation"
          data-testid="event-edit-drawer"
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
                  MOD · ETKİNLİK DÜZENLE
                </div>
                <h2
                  id={titleId}
                  className="mt-1 font-serif text-xl font-light leading-tight"
                >
                  Etkinliği <em className="font-serif italic font-light">güncelle</em>
                </h2>
                {event && (
                  <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                    {event.id}
                  </p>
                )}
              </div>
              <button
                type="button"
                aria-label="Drawer'ı kapat"
                data-testid="event-edit-close"
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
                  <Field id="edit-event-title" label="Başlık">
                    <input
                      ref={firstFieldRef}
                      id="edit-event-title"
                      data-testid="event-edit-field-title"
                      type="text"
                      value={form.title}
                      onChange={(ev) => set('title', ev.target.value)}
                      className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none transition focus:border-foreground"
                      required
                    />
                  </Field>

                  <Field id="edit-event-type" label="Tip">
                    <select
                      id="edit-event-type"
                      data-testid="event-edit-field-type"
                      value={form.type}
                      onChange={(ev) => set('type', ev.target.value as EventType)}
                      className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none transition focus:border-foreground"
                    >
                      {TYPE_OPTIONS.map((t) => (
                        <option key={t} value={t}>
                          {eventTypeLabel(t)}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <Field id="edit-event-start" label="Başlangıç">
                      <input
                        id="edit-event-start"
                        data-testid="event-edit-field-start"
                        type="datetime-local"
                        value={form.startISO}
                        onChange={(ev) => set('startISO', ev.target.value)}
                        className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none transition focus:border-foreground"
                        required
                      />
                    </Field>
                    <Field id="edit-event-end" label="Bitiş" hint="İsteğe bağlı">
                      <input
                        id="edit-event-end"
                        data-testid="event-edit-field-end"
                        type="datetime-local"
                        value={form.endISO}
                        onChange={(ev) => set('endISO', ev.target.value)}
                        className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none transition focus:border-foreground"
                      />
                    </Field>
                  </div>

                  <Field id="edit-event-location" label="Konum" hint="İsteğe bağlı">
                    <input
                      id="edit-event-location"
                      data-testid="event-edit-field-location"
                      type="text"
                      value={form.location}
                      onChange={(ev) => set('location', ev.target.value)}
                      className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none transition focus:border-foreground"
                    />
                  </Field>

                  <Field
                    id="edit-event-description"
                    label="Açıklama"
                    hint="İsteğe bağlı"
                  >
                    <textarea
                      id="edit-event-description"
                      data-testid="event-edit-field-description"
                      value={form.description}
                      onChange={(ev) => set('description', ev.target.value)}
                      rows={3}
                      className="w-full resize-y rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none transition focus:border-foreground"
                    />
                  </Field>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <Field id="edit-event-deal" label="İlan ID" hint="İsteğe bağlı">
                      <input
                        id="edit-event-deal"
                        data-testid="event-edit-field-deal"
                        type="text"
                        value={form.dealId}
                        onChange={(ev) => set('dealId', ev.target.value)}
                        className="w-full rounded-xl border border-border bg-card px-3 py-2 font-mono text-sm tabular-nums outline-none transition focus:border-foreground"
                      />
                    </Field>
                    <Field
                      id="edit-event-customer"
                      label="Müşteri"
                      hint="İsteğe bağlı"
                    >
                      <input
                        id="edit-event-customer"
                        data-testid="event-edit-field-customer"
                        type="text"
                        value={form.customerName}
                        onChange={(ev) => set('customerName', ev.target.value)}
                        className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none transition focus:border-foreground"
                      />
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
                  data-testid="event-edit-cancel"
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
                  data-testid="event-edit-submit"
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
