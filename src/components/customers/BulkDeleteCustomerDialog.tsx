/**
 * Wave F18.B — Type-to-confirm bulk delete dialog for customers.
 *
 * The user must type SİL (matches the verb's imperative form) before the
 * confirm button enables. Mirrors the destructive UX from EditCustomerDrawer
 * but applied across a selection. Mutations fan out via Promise.all and the
 * dialog closes only on full success.
 */

import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Loader2, Trash2 } from '@landx/icons'
import { useDeleteCustomer, type Customer } from '@landx/data'
import { useToast } from '@/lib/use-toast'

interface BulkDeleteCustomerDialogProps {
  open: boolean
  customers: Customer[]
  onClose: () => void
  onDeleted?: () => void
}

const CONFIRM_PHRASE = 'SİL'

export function BulkDeleteCustomerDialog({
  open,
  customers,
  onClose,
  onDeleted,
}: BulkDeleteCustomerDialogProps) {
  const remove = useDeleteCustomer()
  const { toast } = useToast()
  const [phrase, setPhrase] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cancelRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (open) {
      setPhrase('')
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
  const armed = phrase.trim().toLocaleUpperCase('tr-TR') === CONFIRM_PHRASE

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!armed) return
    setBusy(true)
    setError(null)
    try {
      await Promise.all(customers.map((c) => remove.mutateAsync(c.id)))
      toast(`${count} müşteri silindi`, { variant: 'success' })
      onDeleted?.()
      onClose()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Bilinmeyen hata'
      setError(msg)
      toast(`Silinemedi: ${msg}`, { variant: 'error' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="bulk-delete-customer-title"
      data-testid="bulk-delete-customer-dialog"
      className="fixed inset-0 z-[80] grid place-items-center p-4 md:p-6"
    >
      <button
        type="button"
        aria-label="Kapat"
        onClick={() => !busy && onClose()}
        className="absolute inset-0 cursor-default bg-foreground/40 backdrop-blur-sm"
      />
      <form
        onSubmit={handleConfirm}
        className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-xl"
        style={{ contain: 'layout style paint' }}
      >
        <div className="flex items-start gap-3 p-4 md:p-6">
          <span className="mt-0.5 inline-flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-rose-500/10 text-rose-700 dark:text-rose-300">
            <AlertTriangle className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              TOPLU SİL · {count} MÜŞTERİ
            </div>
            <h2
              id="bulk-delete-customer-title"
              className="mt-1 font-serif text-xl font-light leading-tight"
            >
              {count} müşteri <em className="font-serif italic font-light">silinecek</em>
            </h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
              İşlem geri alınamaz. Onaylamak için aşağıdaki kutuya{' '}
              <span className="font-mono font-semibold text-foreground">{CONFIRM_PHRASE}</span> yaz.
            </p>

            <label
              htmlFor="bulk-delete-customer-phrase"
              className="mt-3 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
            >
              Onay
            </label>
            <input
              id="bulk-delete-customer-phrase"
              data-testid="bulk-delete-customer-phrase"
              type="text"
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              placeholder={CONFIRM_PHRASE}
              disabled={busy}
              autoComplete="off"
              className="mt-1.5 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm uppercase tracking-[0.18em] outline-none focus:ring-2 focus:ring-rose-500/40 disabled:opacity-50"
            />

            {error && (
              <div
                role="alert"
                className="mt-3 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-[12.5px] text-rose-700 dark:text-rose-300"
              >
                Silinemedi: {error}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-border bg-muted/30 px-4 py-3 md:flex-row md:items-center md:justify-end md:px-6">
          <button
            ref={cancelRef}
            type="button"
            data-testid="bulk-delete-customer-cancel"
            onClick={() => !busy && onClose()}
            disabled={busy}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-[13px] font-medium transition hover:bg-foreground/5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            İptal
          </button>
          <button
            type="submit"
            data-testid="bulk-delete-customer-confirm"
            disabled={busy || !armed}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-rose-500"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            {busy ? 'Siliniyor…' : 'Sil'}
          </button>
        </div>
      </form>
    </div>
  )
}
