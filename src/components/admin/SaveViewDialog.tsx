import { useEffect, useRef, useState } from 'react'
import { Loader2 } from '@landx/icons'
import { addSavedView, type AdminApp, type SavedView } from '@/lib/admin-views'
import { useToast } from '@/lib/use-toast'

interface SaveViewDialogProps {
  open: boolean
  app: AdminApp
  /** URL params snapshot at the moment the dialog opened. */
  params: string
  onSaved: (view: SavedView) => void
  onCancel: () => void
}

export function SaveViewDialog({
  open,
  app,
  params,
  onSaved,
  onCancel,
}: SaveViewDialogProps) {
  const [name, setName] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      setName('')
      queueMicrotask(() => inputRef.current?.focus())
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  if (!open) return null

  const handleSave = () => {
    const trimmed = name.trim()
    if (trimmed.length === 0) {
      toast('Görünüm için bir ad gir', { variant: 'warning' })
      return
    }
    const view = addSavedView({ app, name: trimmed, params })
    toast(`"${trimmed}" kaydedildi`, { variant: 'success' })
    onSaved(view)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="save-view-title"
      data-testid="save-view-dialog"
      className="fixed inset-0 z-[80] grid place-items-center p-4 md:p-6"
    >
      <button
        type="button"
        aria-label="Kapat"
        onClick={onCancel}
        className="absolute inset-0 cursor-default bg-foreground/40 backdrop-blur-sm"
      />
      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleSave()
        }}
        className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-xl"
      >
        <div className="p-4 md:p-6">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            GÖRÜNÜM
          </div>
          <h2 id="save-view-title" className="mt-1 font-serif text-lg font-light">
            Bu görünümü <em className="font-serif italic font-light">kaydet</em>
          </h2>
          <p className="mt-1.5 text-[12.5px] text-muted-foreground">
            Mevcut filtreleri bir isim altında saklayalım. Sonra tek tıkla geri dönersin.
          </p>
          <label
            htmlFor="save-view-name"
            className="mt-3 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
          >
            Ad
          </label>
          <input
            ref={inputRef}
            id="save-view-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="örn. Bodrum Aktif"
            className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-foreground/20"
          />
          {params.length > 0 && (
            <p
              data-testid="save-view-params-preview"
              className="mt-2 truncate font-mono text-[10.5px] text-muted-foreground"
            >
              {params}
            </p>
          )}
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-border bg-muted/30 px-4 py-3 md:flex-row md:items-center md:justify-end md:px-6">
          <button
            type="button"
            data-testid="save-view-cancel"
            onClick={onCancel}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-[13px] font-medium transition hover:bg-foreground/5"
          >
            İptal
          </button>
          <button
            type="submit"
            data-testid="save-view-confirm"
            disabled={name.trim().length === 0}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-foreground px-4 py-2 text-[13px] font-medium text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Loader2 className="hidden h-3.5 w-3.5 animate-spin" />
            Kaydet
          </button>
        </div>
      </form>
    </div>
  )
}
