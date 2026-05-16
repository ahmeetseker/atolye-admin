// Wave F18.A — Bulk delete confirmation dialog. Type-to-confirm gate
// (super-admin SuspendModal pattern) — user must type "SİL" before the
// destructive button enables. Iterates selected ids via Promise.all using
// useDeleteListing.

import { useEffect, useState } from 'react'
import { AlertTriangle, Loader2, X } from '@landx/icons'
import type { Listing } from '@landx/data'
import { useDeleteListing } from '@landx/data'
import { cn } from '@landx/ui'
import { useToast } from '@/lib/use-toast'

const CONFIRM_WORD = 'SİL'

export interface BulkDeleteListingDialogProps {
  open: boolean
  selectedItems: Listing[]
  onClose: () => void
  onSuccess?: () => void
}

export function BulkDeleteListingDialog({
  open,
  selectedItems,
  onClose,
  onSuccess,
}: BulkDeleteListingDialogProps) {
  const deleteMutation = useDeleteListing()
  const { toast } = useToast()
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setConfirm('')
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
  const canSubmit = confirm.trim() === CONFIRM_WORD && count > 0 && !busy

  const handleSubmit = async () => {
    if (!canSubmit) return
    setBusy(true)
    setError(null)
    try {
      await Promise.all(
        selectedItems.map((listing) => deleteMutation.mutateAsync(listing.id)),
      )
      toast(`${count} ilan silindi`, { variant: 'success' })
      onSuccess?.()
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
      role="presentation"
      data-testid="bulk-delete-listing-dialog"
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
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="bulk-delete-title"
        aria-describedby="bulk-delete-desc"
        className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-xl"
      >
        <div className="flex items-start gap-3 p-4 md:p-6">
          <span
            aria-hidden
            className="mt-0.5 inline-flex h-9 w-9 flex-none items-center justify-center rounded-full bg-rose-500/10 text-rose-600"
          >
            <AlertTriangle className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              TOPLU SİL · {count} İLAN
            </div>
            <h2
              id="bulk-delete-title"
              className="mt-1 font-serif text-lg font-light leading-tight"
            >
              {count} ilan silinecek
            </h2>
            <p
              id="bulk-delete-desc"
              className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground"
            >
              Bu işlem geri alınamaz. Devam etmek için aşağıya{' '}
              <span className="font-mono text-foreground">{CONFIRM_WORD}</span>{' '}
              yazın.
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

        <div className="px-4 pb-2 md:px-6">
          {selectedItems.length > 0 && (
            <div className="mb-3 rounded-lg border border-border bg-background/50 px-3 py-2 font-mono text-[11px] text-muted-foreground">
              Etkilenen:{' '}
              <span className="text-foreground">
                {selectedItems
                  .slice(0, 4)
                  .map((l) => l.id)
                  .join(', ')}
                {selectedItems.length > 4
                  ? ` ve ${selectedItems.length - 4} daha`
                  : ''}
              </span>
            </div>
          )}

          <label
            htmlFor="bulk-delete-confirm-input"
            className="mb-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
          >
            DOĞRULAMA — "{CONFIRM_WORD}" yazın
          </label>
          <input
            id="bulk-delete-confirm-input"
            type="text"
            data-testid="bulk-delete-confirm-input"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="off"
            autoCapitalize="characters"
            placeholder={CONFIRM_WORD}
            disabled={busy}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-foreground disabled:opacity-50"
          />

          {error && (
            <div
              role="alert"
              className="mt-3 rounded-lg border border-border bg-foreground/5 px-3 py-2 text-[12.5px] text-foreground"
            >
              İşlem başarısız: {error}
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-col-reverse gap-2 border-t border-border bg-muted/30 px-4 py-3 md:flex-row md:items-center md:justify-end md:px-6">
          <button
            type="button"
            data-testid="bulk-delete-cancel"
            onClick={() => !busy && onClose()}
            disabled={busy}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-[13px] font-medium transition hover:bg-foreground/5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            İptal
          </button>
          <button
            type="submit"
            data-testid="bulk-delete-submit"
            disabled={!canSubmit}
            className={cn(
              'inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-[13px] font-medium text-white transition hover:opacity-90',
              'disabled:cursor-not-allowed disabled:opacity-50',
            )}
          >
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {busy ? 'Siliniyor…' : 'Sil'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default BulkDeleteListingDialog
