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
import { eventTypeLabel, type EventType, type NewEventInput } from '@landx/data'
import { useToast } from '@/lib/use-toast'

interface NewEventModalProps {
  open: boolean
  /**
   * Optional preselected date — when the user opens "Yeni etkinlik" from a
   * specific day cell we prefill the start datetime there.
   */
  defaultDate?: Date | null
  pending?: boolean
  error?: Error | null
  onClose: () => void
  onSubmit: (input: NewEventInput) => void
}

const TYPE_OPTIONS: EventType[] = ['visit', 'deed', 'task', 'meeting', 'reminder']

interface FormState {
  title: string
  type: EventType
  startISO: string
  endISO: string
  location: string
  description: string
}

function toLocalDatetimeInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`
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

function defaultStart(date: Date | null | undefined): string {
  const base = date ? new Date(date) : new Date()
  // Snap to the next hour when no time-of-day was supplied.
  if (!date || (date.getHours() === 0 && date.getMinutes() === 0)) {
    base.setHours(new Date().getHours() + 1, 0, 0, 0)
  }
  return toLocalDatetimeInput(base)
}

/**
 * Compact modal to create a new calendar event.
 *
 * - Centred modal, max-w-lg
 * - Esc + backdrop click close (unless pending)
 * - useTransition wraps submit dispatch (INP < 200ms)
 */
export function NewEventModal({
  open,
  defaultDate,
  pending = false,
  error = null,
  onClose,
  onSubmit,
}: NewEventModalProps) {
  const initial = useMemo<FormState>(
    () => ({
      title: '',
      type: 'task',
      startISO: defaultStart(defaultDate ?? null),
      endISO: '',
      location: '',
      description: '',
    }),
    [defaultDate, open],
  )
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
    if (open) setForm(initial)
  }, [initial, open])

  useEffect(() => {
    const wasPending = prevPendingRef.current
    if (wasPending && !pending && submittingRef.current) {
      submittingRef.current = false
      if (error) {
        toast(`Hata: ${error.message || 'Oluşturulamadı.'}`, { variant: 'error' })
      } else {
        toast('Etkinlik eklendi', { variant: 'success' })
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
    !pending && form.title.trim().length > 0 && form.startISO.length > 0

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    const startISO = fromLocalDatetimeInput(form.startISO)
    if (!startISO) return
    const endISO = fromLocalDatetimeInput(form.endISO)
    const duration =
      endISO && new Date(endISO).getTime() > new Date(startISO).getTime()
        ? Math.round(
            (new Date(endISO).getTime() - new Date(startISO).getTime()) / 60000,
          )
        : undefined
    const payload: NewEventInput = {
      type: form.type,
      title: form.title.trim(),
      date: startISO,
      time: timeFromISO(startISO),
      durationMin: duration,
      location: form.location.trim() || undefined,
      notes: form.description.trim() || undefined,
    }
    submittingRef.current = true
    startTransition(() => {
      onSubmit(payload)
    })
  }

  return (
    <AnimatePresence>
      {open && (
        <div
          role="presentation"
          data-testid="event-new-modal"
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
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 4 }}
            transition={panelTransition}
            className={cn(
              'relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-xl',
            )}
          >
            <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
              <div className="min-w-0">
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  MOD · YENİ ETKİNLİK
                </div>
                <h2
                  id={titleId}
                  className="mt-1 font-serif text-xl font-light leading-tight"
                >
                  Etkinlik <em className="font-serif italic font-light">oluştur</em>
                </h2>
              </div>
              <button
                type="button"
                aria-label="Kapat"
                data-testid="event-new-close"
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
              <div className="space-y-4 px-5 py-5">
                <Field id="new-event-title" label="Başlık">
                  <input
                    ref={firstFieldRef}
                    id="new-event-title"
                    data-testid="event-new-field-title"
                    type="text"
                    value={form.title}
                    onChange={(ev) => set('title', ev.target.value)}
                    className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none transition focus:border-foreground"
                    placeholder="Örn. Cunda · saha gezisi"
                    required
                  />
                </Field>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Field id="new-event-type" label="Tip">
                    <select
                      id="new-event-type"
                      data-testid="event-new-field-type"
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
                  <Field id="new-event-location" label="Konum" hint="İsteğe bağlı">
                    <input
                      id="new-event-location"
                      data-testid="event-new-field-location"
                      type="text"
                      value={form.location}
                      onChange={(ev) => set('location', ev.target.value)}
                      className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none transition focus:border-foreground"
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Field id="new-event-start" label="Başlangıç">
                    <input
                      id="new-event-start"
                      data-testid="event-new-field-start"
                      type="datetime-local"
                      value={form.startISO}
                      onChange={(ev) => set('startISO', ev.target.value)}
                      className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none transition focus:border-foreground"
                      required
                    />
                  </Field>
                  <Field id="new-event-end" label="Bitiş" hint="İsteğe bağlı">
                    <input
                      id="new-event-end"
                      data-testid="event-new-field-end"
                      type="datetime-local"
                      value={form.endISO}
                      onChange={(ev) => set('endISO', ev.target.value)}
                      className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none transition focus:border-foreground"
                    />
                  </Field>
                </div>

                <Field
                  id="new-event-description"
                  label="Açıklama"
                  hint="İsteğe bağlı"
                >
                  <textarea
                    id="new-event-description"
                    data-testid="event-new-field-description"
                    value={form.description}
                    onChange={(ev) => set('description', ev.target.value)}
                    rows={3}
                    className="w-full resize-y rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none transition focus:border-foreground"
                  />
                </Field>

                {error && (
                  <div
                    role="alert"
                    className="rounded-xl border border-border bg-foreground/5 px-3 py-2 text-[12.5px] text-foreground"
                  >
                    Oluşturma başarısız. Tekrar dener misin?
                  </div>
                )}
              </div>

              <footer className="flex items-center justify-end gap-2 border-t border-border bg-muted/30 px-5 py-3">
                <button
                  type="button"
                  data-testid="event-new-cancel"
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
                  data-testid="event-new-submit"
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
                  {pending ? 'Ekleniyor…' : 'Ekle'}
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
