// Wave F18.A — Bulk edit modal for selected listings. Status select +
// price set/percent. "Save" iterates selected items via Promise.all using
// useUpdateListing (mock backend rate-limits at 200ms; in production a
// real PATCH would tolerate parallel writes). All-empty form is a no-op.

import { useEffect, useState } from 'react'
import { AlertTriangle, Loader2, X } from '@landx/icons'
import type { Listing, ListingStatus, UpdateListingInput } from '@landx/data'
import { useUpdateListing } from '@landx/data'
import { cn } from '@landx/ui'
import { useToast } from '@/lib/use-toast'

const STATUS_OPTIONS: Array<{ value: ListingStatus | ''; label: string }> = [
  { value: '', label: 'Değişme' },
  { value: 'Aktif', label: 'Aktif' },
  { value: 'Pasif', label: 'Pasif' },
  { value: 'Taslak', label: 'Taslak' },
]

type PriceMode = 'none' | 'fixed' | 'percent'

export interface BulkEditListingModalProps {
  open: boolean
  selectedItems: Listing[]
  onClose: () => void
  onSuccess?: () => void
}

export function BulkEditListingModal({
  open,
  selectedItems,
  onClose,
  onSuccess,
}: BulkEditListingModalProps) {
  const updateMutation = useUpdateListing()
  const { toast } = useToast()
  const [status, setStatus] = useState<ListingStatus | ''>('')
  const [priceMode, setPriceMode] = useState<PriceMode>('none')
  const [fixedPrice, setFixedPrice] = useState<string>('')
  const [percentDelta, setPercentDelta] = useState<string>('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setStatus('')
      setPriceMode('none')
      setFixedPrice('')
      setPercentDelta('')
      setBusy(false)
      setError(null)
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
  }, [open, busy, onClose])

  if (!open) return null

  const count = selectedItems.length
  const parsedFixed =
    priceMode === 'fixed' ? Number.parseFloat(fixedPrice.replace(',', '.')) : NaN
  const parsedPercent =
    priceMode === 'percent'
      ? Number.parseFloat(percentDelta.replace(',', '.'))
      : NaN

  const priceValid =
    priceMode === 'none' ||
    (priceMode === 'fixed' && Number.isFinite(parsedFixed) && parsedFixed > 0) ||
    (priceMode === 'percent' && Number.isFinite(parsedPercent))

  const hasChange = status !== '' || priceMode !== 'none'
  const canSubmit = hasChange && priceValid && count > 0 && !busy

  const handleSubmit = async () => {
    if (!canSubmit) return
    setBusy(true)
    setError(null)
    try {
      const inputs: UpdateListingInput[] = selectedItems.map((listing) => {
        const patch: UpdateListingInput['patch'] = {}
        if (status !== '') patch.status = status
        if (priceMode === 'fixed' && Number.isFinite(parsedFixed)) {
          patch.price = Math.round(parsedFixed)
        } else if (priceMode === 'percent' && Number.isFinite(parsedPercent)) {
          patch.price = Math.round(listing.price * (1 + parsedPercent / 100))
        }
        return { id: listing.id, patch }
      })

      await Promise.all(inputs.map((input) => updateMutation.mutateAsync(input)))
      toast(`${count} ilan güncellendi`, { variant: 'success' })
      onSuccess?.()
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
      role="presentation"
      data-testid="bulk-edit-listing-modal"
      className="fixed inset-0 z-[80] grid place-items-center p-4 md:p-6"
    >
      <button
        type="button"
        aria-label="Kapat"
        onClick={() => !busy && onClose()}
        className="absolute inset-0 cursor-default bg-foreground/40 backdrop-blur-sm"
      />
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void handleSubmit()
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bulk-edit-title"
        className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 p-4 md:p-6">
          <div className="min-w-0 flex-1">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              TOPLU DÜZENLE · {count} İLAN
            </div>
            <h2
              id="bulk-edit-title"
              className="mt-1 font-serif text-lg font-light leading-tight"
            >
              Seçili ilanları düzenle
            </h2>
            <p className="mt-1.5 text-[12.5px] text-muted-foreground">
              Boş bıraktığın alanlar değişmez. Yüzde değişim mevcut fiyat
              üzerinden uygulanır.
            </p>
          </div>
          <button
            type="button"
            aria-label="Kapat"
            onClick={() => !busy && onClose()}
            disabled={busy}
            className="rounded-lg p-1 text-muted-foreground transition hover:bg-foreground/5 hover:text-foreground disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-4 pb-2 md:px-6">
          <div>
            <label
              htmlFor="bulk-edit-status"
              className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
            >
              DURUM
            </label>
            <select
              id="bulk-edit-status"
              data-testid="bulk-edit-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as ListingStatus | '')}
              disabled={busy}
              className="w-full appearance-none rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none transition hover:bg-foreground/5 focus:ring-2 focus:ring-foreground/20 disabled:opacity-50"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <fieldset>
            <legend className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              FİYAT AYARLA
            </legend>
            <div className="space-y-2">
              <label
                className={cn(
                  'flex cursor-pointer items-start gap-2 rounded-xl border border-border bg-card p-3 transition',
                  priceMode === 'none' && 'ring-2 ring-foreground/20',
                )}
              >
                <input
                  type="radio"
                  name="bulk-edit-price-mode"
                  value="none"
                  checked={priceMode === 'none'}
                  onChange={() => setPriceMode('none')}
                  disabled={busy}
                  className="mt-0.5 h-3.5 w-3.5 accent-foreground"
                />
                <div className="flex-1 text-[13px]">Fiyat değişme</div>
              </label>
              <label
                className={cn(
                  'flex cursor-pointer items-start gap-2 rounded-xl border border-border bg-card p-3 transition',
                  priceMode === 'fixed' && 'ring-2 ring-foreground/20',
                )}
              >
                <input
                  type="radio"
                  name="bulk-edit-price-mode"
                  value="fixed"
                  checked={priceMode === 'fixed'}
                  onChange={() => setPriceMode('fixed')}
                  disabled={busy}
                  className="mt-0.5 h-3.5 w-3.5 accent-foreground"
                />
                <div className="flex-1">
                  <div className="text-[13px]">Sabit fiyat</div>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    step="1"
                    data-testid="bulk-edit-fixed-price"
                    value={fixedPrice}
                    onChange={(e) => setFixedPrice(e.target.value)}
                    onFocus={() => setPriceMode('fixed')}
                    placeholder="TL"
                    disabled={busy || priceMode !== 'fixed'}
                    className="mt-1.5 w-full rounded-lg border border-border bg-background px-2 py-1.5 font-mono text-[12.5px] tabular-nums outline-none focus:ring-2 focus:ring-foreground/20 disabled:opacity-50"
                  />
                </div>
              </label>
              <label
                className={cn(
                  'flex cursor-pointer items-start gap-2 rounded-xl border border-border bg-card p-3 transition',
                  priceMode === 'percent' && 'ring-2 ring-foreground/20',
                )}
              >
                <input
                  type="radio"
                  name="bulk-edit-price-mode"
                  value="percent"
                  checked={priceMode === 'percent'}
                  onChange={() => setPriceMode('percent')}
                  disabled={busy}
                  className="mt-0.5 h-3.5 w-3.5 accent-foreground"
                />
                <div className="flex-1">
                  <div className="text-[13px]">
                    Yüzde değişim (+10 / -5)
                  </div>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.5"
                    data-testid="bulk-edit-percent-delta"
                    value={percentDelta}
                    onChange={(e) => setPercentDelta(e.target.value)}
                    onFocus={() => setPriceMode('percent')}
                    placeholder="% değişim"
                    disabled={busy || priceMode !== 'percent'}
                    className="mt-1.5 w-full rounded-lg border border-border bg-background px-2 py-1.5 font-mono text-[12.5px] tabular-nums outline-none focus:ring-2 focus:ring-foreground/20 disabled:opacity-50"
                  />
                </div>
              </label>
            </div>
          </fieldset>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-border bg-foreground/5 px-3 py-2 text-[12.5px] text-foreground"
            >
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-none" />
              <span>İşlem başarısız: {error}</span>
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-col-reverse gap-2 border-t border-border bg-muted/30 px-4 py-3 md:flex-row md:items-center md:justify-end md:px-6">
          <button
            type="button"
            data-testid="bulk-edit-cancel"
            onClick={() => !busy && onClose()}
            disabled={busy}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-[13px] font-medium transition hover:bg-foreground/5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            İptal
          </button>
          <button
            type="submit"
            data-testid="bulk-edit-submit"
            disabled={!canSubmit}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-foreground px-4 py-2 text-[13px] font-medium text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {busy ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default BulkEditListingModal
