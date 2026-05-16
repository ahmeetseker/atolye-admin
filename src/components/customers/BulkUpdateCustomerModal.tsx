/**
 * Wave F18.B — Bulk update modal for customer rows.
 *
 * Lets the user re-assign segment (Sıcak/Ilık/Soğuk) and optionally aşama
 * for every selected customer in one shot. Empty value = no change, so the
 * operator can move only the segment without disturbing stage history.
 *
 * Submission fires `useUpdateCustomer` mutateAsync per row in parallel and
 * reports the aggregate count via toast. Failures bubble up as an inline
 * error block.
 */

import { useEffect, useRef, useState } from 'react'
import { Loader2 } from '@landx/icons'
import { useUpdateCustomer, type Customer, type CustomerSegment } from '@landx/data'
import { useToast } from '@/lib/use-toast'

const SEGMENTS: CustomerSegment[] = ['Sıcak', 'Ilık', 'Soğuk']
const STAGES: Customer['stage'][] = ['İlk temas', 'Görüşme', 'Teklif', 'Kaparo', 'Tapu']

interface BulkUpdateCustomerModalProps {
  open: boolean
  customers: Customer[]
  onClose: () => void
  onUpdated?: () => void
}

export function BulkUpdateCustomerModal({
  open,
  customers,
  onClose,
  onUpdated,
}: BulkUpdateCustomerModalProps) {
  const update = useUpdateCustomer()
  const { toast } = useToast()
  const [segment, setSegment] = useState<CustomerSegment | ''>('')
  const [stage, setStage] = useState<Customer['stage'] | ''>('')
  const [interestArea, setInterestArea] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cancelRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (open) {
      setSegment('')
      setStage('')
      setInterestArea('')
      setError(null)
      setBusy(false)
      queueMicrotask(() => cancelRef.current?.focus())
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, busy])

  if (!open) return null

  const count = customers.length
  const trimmedInterest = interestArea.trim()
  const hasChange = segment !== '' || stage !== '' || trimmedInterest.length > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!hasChange) return
    setBusy(true)
    setError(null)
    try {
      const patch: Parameters<typeof update.mutateAsync>[0]['patch'] = {}
      if (segment !== '') patch.segment = segment
      if (stage !== '') patch.stage = stage
      if (trimmedInterest.length > 0) patch.interestArea = trimmedInterest
      await Promise.all(
        customers.map((c) =>
          update.mutateAsync({ id: c.id, patch }),
        ),
      )
      toast(`${count} müşteri güncellendi`, { variant: 'success' })
      onUpdated?.()
      onClose()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Bilinmeyen hata'
      setError(msg)
      toast(`Güncellenemedi: ${msg}`, { variant: 'error' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="bulk-update-customer-title"
      data-testid="bulk-update-customer-modal"
      className="fixed inset-0 z-[80] grid place-items-center p-4 md:p-6"
    >
      <button
        type="button"
        aria-label="Kapat"
        onClick={() => !busy && onClose()}
        className="absolute inset-0 cursor-default bg-foreground/40 backdrop-blur-sm"
      />
      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-xl"
        style={{ contain: 'layout style paint' }}
      >
        <div className="p-4 md:p-6">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            TOPLU GÜNCELLE · {count} MÜŞTERİ
          </div>
          <h2
            id="bulk-update-customer-title"
            className="mt-1 font-serif text-xl font-light leading-tight"
          >
            Segment + <em className="font-serif italic font-light">aşama</em>
          </h2>
          <p className="mt-1.5 text-[12.5px] text-muted-foreground">
            Boş bıraktığın alanlar değişmez. Sadece doldurduklarını uygulayacağım.
          </p>

          <fieldset className="mt-4 space-y-2">
            <legend className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Segment
            </legend>
            <div role="radiogroup" className="flex flex-wrap gap-1.5">
              {(['', ...SEGMENTS] as Array<CustomerSegment | ''>).map((opt) => {
                const active = segment === opt
                const label = opt === '' ? 'Değişmesin' : opt
                return (
                  <button
                    key={opt || 'unchanged'}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    data-testid={`bulk-update-segment-${opt || 'noop'}`}
                    onClick={() => setSegment(opt)}
                    className={
                      active
                        ? 'rounded-full bg-foreground px-3 py-1.5 text-[12.5px] font-medium text-background'
                        : 'rounded-full border border-border bg-card px-3 py-1.5 text-[12.5px] font-medium transition hover:bg-foreground/5'
                    }
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </fieldset>

          <fieldset className="mt-4">
            <label
              htmlFor="bulk-update-stage"
              className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
            >
              Aşama
            </label>
            <select
              id="bulk-update-stage"
              data-testid="bulk-update-stage"
              value={stage}
              onChange={(e) =>
                setStage(e.target.value as Customer['stage'] | '')
              }
              disabled={busy}
              className="mt-1.5 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-foreground/20 disabled:opacity-50"
            >
              <option value="">Değişmesin</option>
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </fieldset>

          <fieldset className="mt-4">
            <label
              htmlFor="bulk-update-interest"
              className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
            >
              İlgi alanı
            </label>
            <input
              id="bulk-update-interest"
              data-testid="bulk-update-interest"
              type="text"
              value={interestArea}
              onChange={(e) => setInterestArea(e.target.value)}
              placeholder="Boş bırak = değişme"
              disabled={busy}
              className="mt-1.5 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-foreground/20 disabled:opacity-50"
            />
          </fieldset>

          {error && (
            <div
              role="alert"
              className="mt-3 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-[12.5px] text-rose-700 dark:text-rose-300"
            >
              Güncellenemedi: {error}
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-border bg-muted/30 px-4 py-3 md:flex-row md:items-center md:justify-end md:px-6">
          <button
            ref={cancelRef}
            type="button"
            data-testid="bulk-update-customer-cancel"
            onClick={() => !busy && onClose()}
            disabled={busy}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-[13px] font-medium transition hover:bg-foreground/5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            İptal
          </button>
          <button
            type="submit"
            data-testid="bulk-update-customer-confirm"
            disabled={busy || !hasChange}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-foreground px-4 py-2 text-[13px] font-medium text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {busy ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      </form>
    </div>
  )
}
