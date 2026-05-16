import { useEffect, useId, useRef, useState, type RefObject } from 'react'
import { Download, FileText, ImageDown, MoreVertical } from '@landx/icons'
import { cn } from '@landx/ui'
import { chartToPng, dataToCSV } from '@/lib/chart-export'

type ChartExportMenuProps = {
  pngTarget: RefObject<HTMLElement | null>
  csvData: Record<string, unknown>[]
  filename: string
  className?: string
  label?: string
}

export function ChartExportMenu({
  pngTarget,
  csvData,
  filename,
  className,
  label = 'Dışa aktar',
}: ChartExportMenuProps) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current) return
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const handlePng = async () => {
    if (busy) return
    const el = pngTarget.current
    if (!el) return
    setBusy(true)
    try {
      await chartToPng(el, filename)
    } catch (err) {
      // KVKK: no upload, no tracking — just log to dev console.
      if (import.meta.env?.DEV) console.error('[ChartExportMenu] PNG export failed', err)
    } finally {
      setBusy(false)
      setOpen(false)
    }
  }

  const handleCsv = () => {
    if (busy) return
    setBusy(true)
    try {
      dataToCSV(csvData, filename)
    } catch (err) {
      if (import.meta.env?.DEV) console.error('[ChartExportMenu] CSV export failed', err)
    } finally {
      setBusy(false)
      setOpen(false)
    }
  }

  return (
    <div ref={wrapRef} className={cn('relative inline-flex', className)}>
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-foreground/[0.06] hover:text-foreground"
      >
        <MoreVertical className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 top-9 z-20 w-44 overflow-hidden rounded-xl border border-border bg-card shadow-[0_10px_30px_rgba(0,0,0,0.08)]"
        >
          <div className="flex items-center gap-1.5 border-b border-border/60 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
            <Download className="h-3 w-3" />
            {label}
          </div>
          <button
            type="button"
            role="menuitem"
            disabled={busy}
            onClick={handlePng}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] font-medium transition hover:bg-foreground/5 disabled:opacity-50"
          >
            <ImageDown className="h-3.5 w-3.5 text-muted-foreground" />
            PNG indir
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={busy || csvData.length === 0}
            onClick={handleCsv}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] font-medium transition hover:bg-foreground/5 disabled:opacity-50"
          >
            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
            CSV indir
          </button>
        </div>
      )}
    </div>
  )
}
