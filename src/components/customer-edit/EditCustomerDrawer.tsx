import { useEffect, useState, type ReactNode } from 'react'
import { Check, Loader2, X } from '@landx/icons'
import { useUpdateCustomer, type Customer } from '@landx/data'
import { formatTLCompact } from '@landx/ui'
import { useToast } from '@/lib/use-toast'

interface EditCustomerDrawerProps {
  open: boolean
  customer: Customer | null
  onClose: () => void
  onSuccess?: () => void
}

const SEGMENTS: Customer['segment'][] = ['Sıcak', 'Ilık', 'Soğuk']
const STAGES: Customer['stage'][] = ['İlk temas', 'Görüşme', 'Teklif', 'Kaparo', 'Tapu']

interface DraftState {
  name: string
  segment: Customer['segment']
  stage: Customer['stage']
  value: string
  owner: string
  interestArea: string
  notes: string
  phone: string
  email: string
}

// Wave F2C — same regex pair used by /customer-new wizard (A51) and the
// public-site lead form. Phone allows +, digits, spaces, dashes; min 10
// chars catches both `+90 5XX...` and bare `5XX...`. Email follows the
// pragma RFC short form.
const PHONE_RE = /^\+?[\d\s-]{10,}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function toDraft(customer: Customer): DraftState {
  return {
    name: customer.name,
    segment: customer.segment,
    stage: customer.stage,
    value: String(customer.value),
    owner: customer.owner,
    interestArea: customer.interestArea,
    notes: customer.notes ?? '',
    phone: customer.phone ?? '',
    email: customer.email ?? '',
  }
}

/**
 * Slide-in edit drawer for a single customer.
 *
 * Responsive: full-width on mobile, 400px on desktop (`md:` breakpoint).
 * Fields editable here match the `UpdateCustomerInput.patch` allowlist in
 * `@landx/data` (Wave 15/A71): name, segment, stage, value, owner,
 * interestArea, notes. `source` is shown read-only as context — its update
 * channel would require a backend contract widening which is out of scope
 * for this frontend-only wave.
 */
export function EditCustomerDrawer({ open, customer, onClose, onSuccess }: EditCustomerDrawerProps) {
  const update = useUpdateCustomer()
  const { toast } = useToast()
  const [draft, setDraft] = useState<DraftState | null>(customer ? toDraft(customer) : null)
  // `touched` keeps inline error messages from flashing while the user is
  // still typing — they only appear after blur. Wave F2C.
  const [touched, setTouched] = useState<{ phone: boolean; email: boolean }>({
    phone: false,
    email: false,
  })

  useEffect(() => {
    if (customer) {
      setDraft(toDraft(customer))
      setTouched({ phone: false, email: false })
    }
  }, [customer])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !update.isPending) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose, update.isPending])

  if (!open || !customer || !draft) return null

  const set = <K extends keyof DraftState>(k: K, v: DraftState[K]) =>
    setDraft((prev) => (prev ? { ...prev, [k]: v } : prev))

  const valueNum = Number(draft.value)
  const phoneVal = draft.phone.trim()
  const emailVal = draft.email.trim()
  const phoneInvalid = phoneVal.length > 0 && !PHONE_RE.test(phoneVal)
  const emailInvalid = emailVal.length > 0 && !EMAIL_RE.test(emailVal)
  const canSave =
    draft.name.trim().length > 0 &&
    draft.owner.trim().length > 0 &&
    !Number.isNaN(valueNum) &&
    valueNum >= 0 &&
    !phoneInvalid &&
    !emailInvalid &&
    !update.isPending

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSave) return
    try {
      await update.mutateAsync({
        id: customer.id,
        patch: {
          name: draft.name.trim(),
          segment: draft.segment,
          stage: draft.stage,
          value: valueNum,
          owner: draft.owner.trim(),
          interestArea: draft.interestArea.trim(),
          notes: draft.notes.trim() || undefined,
          phone: phoneVal || undefined,
          email: emailVal || undefined,
        },
      })
      toast('Kaydedildi', { variant: 'success' })
      onSuccess?.()
      onClose()
    } catch (err) {
      console.error(err)
      const msg = err instanceof Error ? err.message : 'Tekrar dener misin?'
      toast(`Hata: ${msg}`, { variant: 'error' })
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex"
      role="dialog"
      aria-modal="true"
      aria-labelledby="customer-edit-title"
      data-testid="customer-edit-drawer"
    >
      <button
        type="button"
        aria-label="Kapat"
        onClick={() => !update.isPending && onClose()}
        className="flex-1 bg-foreground/40 backdrop-blur-sm transition-opacity"
      />
      <aside
        className="flex h-full w-full flex-col border-l border-border bg-card shadow-2xl md:w-[400px]"
        style={{ contain: 'layout style paint' }}
      >
        <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              MÜŞTERİ · {customer.id}
            </div>
            <h2 id="customer-edit-title" className="mt-1 font-serif text-2xl font-light leading-tight">
              Müşteriyi <em className="font-serif italic font-light">düzenle</em>
            </h2>
          </div>
          <button
            type="button"
            data-testid="customer-edit-close"
            onClick={() => !update.isPending && onClose()}
            disabled={update.isPending}
            aria-label="Kapat"
            className="flex h-8 w-8 flex-none items-center justify-center rounded-lg border border-border bg-background/40 text-muted-foreground transition hover:bg-foreground/10 hover:text-foreground disabled:opacity-40"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </header>

        <form
          onSubmit={handleSubmit}
          className="flex flex-1 flex-col overflow-y-auto"
        >
          <div className="flex-1 space-y-4 px-5 py-5">
            <Field id="edit-name" label="Ad soyad">
              <input
                id="edit-name"
                data-testid="customer-edit-name"
                type="text"
                value={draft.name}
                onChange={(e) => set('name', e.target.value)}
                required
                autoFocus
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-foreground placeholder:text-[hsl(var(--placeholder))]"
              />
            </Field>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field id="edit-phone" label="Telefon" hint="+90 5xx xxx xx xx önerilir">
                <input
                  id="edit-phone"
                  data-testid="customer-edit-phone"
                  type="tel"
                  value={draft.phone}
                  onChange={(e) => set('phone', e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
                  placeholder="+90 5xx xxx xx xx"
                  aria-invalid={phoneInvalid || undefined}
                  className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-foreground placeholder:text-[hsl(var(--placeholder))] aria-[invalid=true]:border-rose-500/60"
                />
                {touched.phone && phoneInvalid && (
                  <div
                    role="alert"
                    data-testid="customer-edit-phone-error"
                    className="mt-1 text-[11.5px] text-rose-700 dark:text-rose-300"
                  >
                    Geçerli bir telefon gir (en az 10 rakam, +90… formatı tercih edilir).
                  </div>
                )}
              </Field>
              <Field id="edit-email" label="E-posta">
                <input
                  id="edit-email"
                  data-testid="customer-edit-email"
                  type="email"
                  value={draft.email}
                  onChange={(e) => set('email', e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                  placeholder="ornek@arsam.net"
                  aria-invalid={emailInvalid || undefined}
                  className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-foreground placeholder:text-[hsl(var(--placeholder))] aria-[invalid=true]:border-rose-500/60"
                />
                {touched.email && emailInvalid && (
                  <div
                    role="alert"
                    data-testid="customer-edit-email-error"
                    className="mt-1 text-[11.5px] text-rose-700 dark:text-rose-300"
                  >
                    Geçerli bir e-posta gir.
                  </div>
                )}
              </Field>
            </div>
            <Field id="edit-segment" label="Segment">
              <select
                id="edit-segment"
                data-testid="customer-edit-segment"
                value={draft.segment}
                onChange={(e) => set('segment', e.target.value as Customer['segment'])}
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-foreground"
              >
                {SEGMENTS.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field id="edit-stage" label="Süreç adımı">
              <select
                id="edit-stage"
                data-testid="customer-edit-stage"
                value={draft.stage}
                onChange={(e) => set('stage', e.target.value as Customer['stage'])}
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-foreground"
              >
                {STAGES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field id="edit-value" label="Potansiyel değer (TL)">
              <input
                id="edit-value"
                data-testid="customer-edit-value"
                type="number"
                min="0"
                step="1000"
                value={draft.value}
                onChange={(e) => set('value', e.target.value)}
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-foreground placeholder:text-[hsl(var(--placeholder))]"
              />
              {valueNum > 0 && (
                <div className="mt-1 font-mono text-[11px] text-muted-foreground tabular-nums">
                  ≈ {formatTLCompact(valueNum)}
                </div>
              )}
            </Field>
            <Field id="edit-owner" label="Sorumlu">
              <input
                id="edit-owner"
                data-testid="customer-edit-owner"
                type="text"
                value={draft.owner}
                onChange={(e) => set('owner', e.target.value)}
                required
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-foreground placeholder:text-[hsl(var(--placeholder))]"
              />
            </Field>
            <Field id="edit-interest-area" label="İlgi alanı">
              <input
                id="edit-interest-area"
                data-testid="customer-edit-interest-area"
                type="text"
                value={draft.interestArea}
                onChange={(e) => set('interestArea', e.target.value)}
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-foreground placeholder:text-[hsl(var(--placeholder))]"
              />
            </Field>
            <Field id="edit-notes" label="Notlar" hint="İçsel not — müşteri görmez.">
              <textarea
                id="edit-notes"
                data-testid="customer-edit-notes"
                value={draft.notes}
                onChange={(e) => set('notes', e.target.value)}
                rows={3}
                className="w-full resize-y rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-foreground placeholder:text-[hsl(var(--placeholder))]"
              />
            </Field>

            <div className="rounded-2xl border border-border bg-muted/40 p-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                BAĞLAM
              </div>
              <dl className="mt-2 space-y-1 text-[12px]">
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    Kaynak
                  </dt>
                  <dd className="text-foreground/85">{customer.source}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    Son temas
                  </dt>
                  <dd className="font-mono text-[11px] text-muted-foreground tabular-nums">
                    {new Date(customer.lastContact).toLocaleDateString('tr-TR')}
                  </dd>
                </div>
              </dl>
            </div>

            {update.isError && (
              <div role="alert" className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
                Kayıt başarısız. Tekrar dener misin?
              </div>
            )}
          </div>

          <footer className="flex items-center justify-between gap-2 border-t border-border bg-card px-5 py-3">
            <button
              type="button"
              data-testid="customer-edit-cancel"
              onClick={() => !update.isPending && onClose()}
              disabled={update.isPending}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium transition hover:bg-foreground/5 disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
            >
              İptal
            </button>
            <button
              type="submit"
              data-testid="customer-edit-save"
              disabled={!canSave}
              className="inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
            >
              {update.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              {update.isPending ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
          </footer>
        </form>
      </aside>
    </div>
  )
}

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </label>
      {children}
      {hint && <div className="mt-1 text-[11.5px] text-muted-foreground">{hint}</div>}
    </div>
  )
}
