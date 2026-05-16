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
import type { Listing } from '@landx/data'
import { useToast } from '@/lib/use-toast'

interface EditListingDrawerProps {
  open: boolean
  listing: Listing | null
  pending?: boolean
  error?: Error | null
  onClose: () => void
  /**
   * Submit fires the parent's mutate. Only fields the API patch contract
   * supports are forwarded — `useUpdateListing` accepts
   * `{ id, patch: Partial<Pick<Listing, 'title' | 'price' | 'status' | 'tags'>> }`.
   * The other fields appear in the drawer for context but are read-only.
   */
  onSubmit: (input: {
    id: string
    patch: Partial<Pick<Listing, 'title' | 'price' | 'status' | 'tags'>>
  }) => void
}

interface FormState {
  title: string
  city: string
  district: string
  type: Listing['type']
  status: Listing['status']
  size: string
  price: string
  tagsCsv: string
}

const STATUS_OPTIONS: Listing['status'][] = ['Aktif', 'Pasif', 'Taslak']
const TYPE_OPTIONS: Listing['type'][] = ['İmarlı', 'Tarla', 'Zeytinlik', 'Villa Arsası']

function toFormState(l: Listing | null): FormState {
  if (!l) {
    return {
      title: '',
      city: '',
      district: '',
      type: 'İmarlı',
      status: 'Taslak',
      size: '',
      price: '',
      tagsCsv: '',
    }
  }
  return {
    title: l.title,
    city: l.city,
    district: l.district,
    type: l.type,
    status: l.status,
    size: String(l.size),
    price: String(l.price),
    tagsCsv: l.tags.join(', '),
  }
}

/**
 * Right-side drawer for editing a listing.
 *
 * - w-[480px] on md+, full-width on mobile
 * - Esc key + backdrop click close the drawer (unless pending)
 * - Submit gathers patchable fields (title / price / status / tags)
 *   and calls onSubmit so the parent can fire useUpdateListing.
 * - useTransition wraps the submit dispatch to keep INP < 200ms.
 */
export function EditListingDrawer({
  open,
  listing,
  pending = false,
  error = null,
  onClose,
  onSubmit,
}: EditListingDrawerProps) {
  const initial = useMemo(() => toFormState(listing), [listing])
  const [form, setForm] = useState<FormState>(initial)
  const titleId = useId()
  const firstFieldRef = useRef<HTMLInputElement | null>(null)
  const [, startTransition] = useTransition()
  const { toast } = useToast()
  const submittingRef = useRef(false)
  const prevPendingRef = useRef(false)
  const backdropTransition = motionGate<Transition>(REDUCED_MOTION_TRANSITION, FAST_FADE)
  const panelTransition = motionGate<Transition>(REDUCED_MOTION_TRANSITION, STANDARD_SPRING)

  // Reset form whenever the listing changes (drawer reopens for a new row).
  useEffect(() => {
    setForm(initial)
  }, [initial])

  // Detect mutation settle: pending true → false. Fire toast based on error.
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
    !!listing &&
    form.title.trim().length > 0 &&
    Number(form.price) > 0

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit || !listing) return
    const tags = form.tagsCsv
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    const patch: Partial<Pick<Listing, 'title' | 'price' | 'status' | 'tags'>> = {}
    if (form.title.trim() !== listing.title) patch.title = form.title.trim()
    const nextPrice = Number(form.price)
    if (nextPrice !== listing.price) patch.price = nextPrice
    if (form.status !== listing.status) patch.status = form.status
    const sameTags =
      tags.length === listing.tags.length &&
      tags.every((t, i) => t === listing.tags[i])
    if (!sameTags) patch.tags = tags

    submittingRef.current = true
    startTransition(() => {
      onSubmit({ id: listing.id, patch })
    })
  }

  return (
    <AnimatePresence>
      {open && (
        <div
          role="presentation"
          data-testid="listing-edit-drawer"
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
                  MOD · İLAN DÜZENLE
                </div>
                <h2
                  id={titleId}
                  className="mt-1 font-serif text-xl font-light leading-tight"
                >
                  İlanı <em className="font-serif italic font-light">güncelle</em>
                </h2>
                {listing && (
                  <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                    {listing.id}
                  </p>
                )}
              </div>
              <button
                type="button"
                aria-label="Drawer'ı kapat"
                data-testid="listing-edit-close"
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
                  <Field id="edit-title" label="Başlık">
                    <input
                      ref={firstFieldRef}
                      id="edit-title"
                      data-testid="listing-edit-field-title"
                      type="text"
                      value={form.title}
                      onChange={(e) => set('title', e.target.value)}
                      className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none transition focus:border-foreground"
                      required
                    />
                  </Field>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <Field id="edit-city" label="Şehir" hint="Tapuya göre — sabit">
                      <input
                        id="edit-city"
                        type="text"
                        value={form.city}
                        readOnly
                        className="w-full cursor-not-allowed rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground outline-none"
                      />
                    </Field>
                    <Field id="edit-district" label="İlçe" hint="Tapuya göre — sabit">
                      <input
                        id="edit-district"
                        type="text"
                        value={form.district}
                        readOnly
                        className="w-full cursor-not-allowed rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground outline-none"
                      />
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <Field id="edit-type" label="Tip" hint="Tapu tipi — sabit">
                      <select
                        id="edit-type"
                        value={form.type}
                        disabled
                        className="w-full cursor-not-allowed rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground outline-none"
                      >
                        {TYPE_OPTIONS.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field id="edit-status" label="Durum">
                      <select
                        id="edit-status"
                        data-testid="listing-edit-field-status"
                        value={form.status}
                        onChange={(e) =>
                          set('status', e.target.value as Listing['status'])
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

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <Field id="edit-size" label="Büyüklük (m²)" hint="Tapuya göre — sabit">
                      <input
                        id="edit-size"
                        type="number"
                        value={form.size}
                        readOnly
                        className="w-full cursor-not-allowed rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground outline-none"
                      />
                    </Field>
                    <Field id="edit-price" label="Fiyat (TL)">
                      <input
                        id="edit-price"
                        data-testid="listing-edit-field-price"
                        type="number"
                        min="0"
                        step="1000"
                        value={form.price}
                        onChange={(e) => set('price', e.target.value)}
                        className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none transition focus:border-foreground"
                        required
                      />
                    </Field>
                  </div>

                  <Field
                    id="edit-tags"
                    label="Etiketler"
                    hint="Virgülle ayır (deniz manzaralı, yola cephe, ...)"
                  >
                    <input
                      id="edit-tags"
                      data-testid="listing-edit-field-tags"
                      type="text"
                      value={form.tagsCsv}
                      onChange={(e) => set('tagsCsv', e.target.value)}
                      className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none transition focus:border-foreground"
                    />
                  </Field>

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
                  data-testid="listing-edit-cancel"
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
                  data-testid="listing-edit-submit"
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
