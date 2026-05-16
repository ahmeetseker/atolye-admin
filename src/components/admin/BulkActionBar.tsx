import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Loader2, Tag, Trash2 } from '@landx/icons'
import { cn } from '@landx/ui'
import { useToast } from '@/lib/use-toast'

/**
 * F6.C — multi-select toolbar contents rendered inside DataTable's bulk slot.
 *
 * Scope is the **currently visible page** of rows (DataTable's selection state
 * does not survive pagination). Multi-page selection is out of scope.
 *
 * Three actions:
 *  - Sil (always) — confirm modal then iterate selected ids sequentially
 *  - Durum (listings only) — dropdown over Aktif / Pasif / Taslak
 *  - Etiket (listings only, optional) — comma-separated input → patch `tags`
 *
 * Customer schema currently has no `tags` field, so the parent passes
 * `canTag={false}` for customers and the action button is suppressed.
 */

export type BulkActionStatus = 'Aktif' | 'Pasif' | 'Taslak'

export interface BulkActionBarProps {
  /** Number of currently selected rows. */
  count: number
  /** Localised entity label, e.g. "ilan" / "müşteri" — used in toasts + confirm copy. */
  entityLabel: string
  /** Optional pluralised label for the count badge (defaults to entityLabel). */
  entityLabelPlural?: string
  /** Trigger irreversible delete; resolves when every selected row finished. */
  onDelete: () => Promise<void>
  /** Optional bulk status change (listings only). When omitted, action is hidden. */
  onChangeStatus?: (status: BulkActionStatus) => Promise<void>
  /** Optional bulk tag set (listings only). Receives parsed tag list. */
  onAddTags?: (tags: string[]) => Promise<void>
  /** Clears the row selection after the action resolves. */
  onClear: () => void
}

type Phase = 'idle' | 'confirming-delete' | 'tagging' | 'changing-status'

export function BulkActionBar({
  count,
  entityLabel,
  entityLabelPlural,
  onDelete,
  onChangeStatus,
  onAddTags,
  onClear,
}: BulkActionBarProps) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  // Closing the bar (count → 0) must reset internal state, otherwise a
  // stale "confirming-delete" phase reopens the modal next time someone
  // selects rows.
  useEffect(() => {
    if (count === 0) {
      setPhase('idle')
      setError(null)
      setBusy(false)
    }
  }, [count])

  const plural = entityLabelPlural ?? entityLabel
  if (count === 0) return null

  const runDelete = async () => {
    setBusy(true)
    setError(null)
    try {
      await onDelete()
      toast(`${count} ${plural} silindi`, { variant: 'success' })
      setPhase('idle')
      onClear()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Bilinmeyen hata'
      setError(msg)
      toast(`Silinemedi: ${msg}`, { variant: 'error' })
    } finally {
      setBusy(false)
    }
  }

  const runStatus = async (status: BulkActionStatus) => {
    if (!onChangeStatus) return
    setBusy(true)
    try {
      await onChangeStatus(status)
      toast(`${count} ${plural} ${status.toLowerCase()} olarak güncellendi`, {
        variant: 'success',
      })
      setPhase('idle')
      onClear()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Bilinmeyen hata'
      toast(`Güncellenemedi: ${msg}`, { variant: 'error' })
    } finally {
      setBusy(false)
    }
  }

  const runTags = async (raw: string) => {
    if (!onAddTags) return
    const tags = raw
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
    if (tags.length === 0) {
      toast('En az bir etiket gir', { variant: 'warning' })
      return
    }
    setBusy(true)
    try {
      await onAddTags(tags)
      toast(`${count} ${plural} için etiket eklendi`, { variant: 'success' })
      setPhase('idle')
      onClear()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Bilinmeyen hata'
      toast(`Etiket eklenemedi: ${msg}`, { variant: 'error' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div
        data-testid="bulk-action-buttons"
        className="flex items-center gap-1.5"
      >
        <button
          type="button"
          data-testid="bulk-action-delete"
          onClick={() => setPhase('confirming-delete')}
          disabled={busy}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-[12px] font-medium transition hover:bg-foreground/5 disabled:cursor-not-allowed disabled:opacity-50',
          )}
        >
          <Trash2 className="h-3 w-3" />
          Sil
        </button>
        {onChangeStatus && (
          <StatusDropdown
            disabled={busy}
            onPick={(s) => {
              setPhase('changing-status')
              void runStatus(s)
            }}
          />
        )}
        {onAddTags && (
          <button
            type="button"
            data-testid="bulk-action-tag"
            onClick={() => setPhase('tagging')}
            disabled={busy}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-1.5 text-[12px] font-medium text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50',
            )}
          >
            <Tag className="h-3 w-3" />
            Etiket
          </button>
        )}
      </div>

      {phase === 'confirming-delete' && (
        <BulkConfirmDialog
          title={
            <>
              {count} {plural}{' '}
              <em className="font-serif italic font-light">silinsin mi</em>?
            </>
          }
          description={`Seçili ${count} ${plural} silinecek. Bu işlem geri alınamaz.`}
          confirmLabel={busy ? 'Siliniyor…' : 'Sil'}
          pending={busy}
          error={error}
          onCancel={() => {
            if (busy) return
            setPhase('idle')
            setError(null)
          }}
          onConfirm={runDelete}
        />
      )}

      {phase === 'tagging' && (
        <BulkTagDialog
          count={count}
          plural={plural}
          pending={busy}
          onCancel={() => {
            if (busy) return
            setPhase('idle')
          }}
          onConfirm={runTags}
        />
      )}
    </>
  )
}

function StatusDropdown({
  disabled,
  onPick,
}: {
  disabled: boolean
  onPick: (s: BulkActionStatus) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onAway = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('mousedown', onAway)
    return () => window.removeEventListener('mousedown', onAway)
  }, [open])
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        data-testid="bulk-action-status"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-[12px] font-medium transition hover:bg-foreground/5 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Durum
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute right-0 bottom-full mb-1.5 z-20 min-w-[140px] overflow-hidden rounded-xl border border-border bg-card shadow-xl"
        >
          {(['Aktif', 'Pasif', 'Taslak'] as const).map((s) => (
            <button
              key={s}
              type="button"
              role="option"
              aria-selected={false}
              data-testid={`bulk-status-${s}`}
              onClick={() => {
                setOpen(false)
                onPick(s)
              }}
              className="block w-full px-3 py-2 text-left text-[12.5px] hover:bg-foreground/5"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function BulkConfirmDialog({
  title,
  description,
  confirmLabel,
  pending,
  error,
  onCancel,
  onConfirm,
}: {
  title: React.ReactNode
  description: string
  confirmLabel: string
  pending: boolean
  error: string | null
  onCancel: () => void
  onConfirm: () => void
}) {
  const cancelRef = useRef<HTMLButtonElement | null>(null)
  useEffect(() => {
    queueMicrotask(() => cancelRef.current?.focus())
  }, [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !pending) {
        e.preventDefault()
        onCancel()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel, pending])
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      data-testid="bulk-delete-dialog"
      className="fixed inset-0 z-[80] grid place-items-center p-4 md:p-6"
    >
      <button
        type="button"
        aria-label="Kapat"
        onClick={() => !pending && onCancel()}
        className="absolute inset-0 cursor-default bg-foreground/40 backdrop-blur-sm"
      />
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
        <div className="flex items-start gap-3 p-4 md:p-6">
          <span className="mt-0.5 inline-flex h-8 w-8 flex-none items-center justify-center rounded-full bg-foreground/10 text-foreground">
            <AlertTriangle className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-serif text-lg font-light leading-tight">{title}</h2>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">
              {description}
            </p>
            {error && (
              <div
                role="alert"
                className="mt-3 rounded-lg border border-border bg-foreground/5 px-3 py-2 text-[12.5px] text-foreground"
              >
                İşlem başarısız: {error}
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-border bg-muted/30 px-4 py-3 md:flex-row md:items-center md:justify-end md:px-6">
          <button
            ref={cancelRef}
            type="button"
            data-testid="bulk-delete-cancel"
            onClick={onCancel}
            disabled={pending}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-[13px] font-medium transition hover:bg-foreground/5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            İptal
          </button>
          <button
            type="button"
            data-testid="bulk-delete-confirm"
            onClick={onConfirm}
            disabled={pending}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-foreground px-4 py-2 text-[13px] font-medium text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function BulkTagDialog({
  count,
  plural,
  pending,
  onCancel,
  onConfirm,
}: {
  count: number
  plural: string
  pending: boolean
  onCancel: () => void
  onConfirm: (raw: string) => void
}) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)
  useEffect(() => {
    queueMicrotask(() => inputRef.current?.focus())
  }, [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !pending) {
        e.preventDefault()
        onCancel()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel, pending])
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="bulk-tag-title"
      data-testid="bulk-tag-dialog"
      className="fixed inset-0 z-[80] grid place-items-center p-4 md:p-6"
    >
      <button
        type="button"
        aria-label="Kapat"
        onClick={() => !pending && onCancel()}
        className="absolute inset-0 cursor-default bg-foreground/40 backdrop-blur-sm"
      />
      <form
        onSubmit={(e) => {
          e.preventDefault()
          onConfirm(value)
        }}
        className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-xl"
      >
        <div className="p-4 md:p-6">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            ETİKET · {count} {plural.toUpperCase()}
          </div>
          <h2 id="bulk-tag-title" className="mt-1 font-serif text-lg font-light">
            Etiket <em className="font-serif italic font-light">ekle</em>
          </h2>
          <p className="mt-1.5 text-[12.5px] text-muted-foreground">
            Virgülle ayırarak birden fazla etiket girebilirsin.
          </p>
          <label htmlFor="bulk-tag-input" className="sr-only">
            Etiketler
          </label>
          <input
            ref={inputRef}
            id="bulk-tag-input"
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="örn. denize-yakın, imar-müsait"
            disabled={pending}
            className="mt-3 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-foreground/20 disabled:opacity-50"
          />
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-border bg-muted/30 px-4 py-3 md:flex-row md:items-center md:justify-end md:px-6">
          <button
            type="button"
            data-testid="bulk-tag-cancel"
            onClick={onCancel}
            disabled={pending}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-[13px] font-medium transition hover:bg-foreground/5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            İptal
          </button>
          <button
            type="submit"
            data-testid="bulk-tag-confirm"
            disabled={pending || value.trim().length === 0}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-foreground px-4 py-2 text-[13px] font-medium text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {pending ? 'Ekleniyor…' : 'Ekle'}
          </button>
        </div>
      </form>
    </div>
  )
}
