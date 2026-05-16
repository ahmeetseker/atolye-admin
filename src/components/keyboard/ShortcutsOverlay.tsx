import { useEffect } from 'react'
import { SHORTCUTS, groupShortcuts, type Shortcut } from '@/lib/keyboard-shortcuts'

interface Props {
  open: boolean
  onClose: () => void
}

const GROUP_ORDER: ReadonlyArray<Shortcut['group']> = ['navigation', 'palette', 'overlay', 'general']
const GROUP_LABEL: Record<Shortcut['group'], string> = {
  navigation: 'NAVIGASYON',
  palette: 'KOMUT PALETİ',
  overlay: 'YARDIM',
  general: 'GENEL',
}

function renderKeys(keys: string) {
  // `g h` → ['g', 'h'] · `shift+/` → ['shift', '/'] · `?` → ['?']
  const parts = keys.includes(' ') ? keys.split(' ') : keys.split('+')
  return parts.map((k, i) => (
    <span key={i} className="inline-flex items-center gap-1">
      {i > 0 && (
        <span className="font-mono text-[10px] text-muted-foreground">
          {keys.includes(' ') ? 'sonra' : '+'}
        </span>
      )}
      <kbd className="inline-flex min-w-[1.5rem] items-center justify-center rounded-md border border-border bg-card px-1.5 py-0.5 font-mono text-[11px] text-foreground shadow-sm">
        {k === 'shift'
          ? 'Shift'
          : k === 'Escape'
            ? 'Esc'
            : k === 'mod'
              ? '⌘ / Ctrl'
              : k === 'cmd'
                ? '⌘'
                : k === 'ctrl'
                  ? 'Ctrl'
                  : k === 'alt'
                    ? 'Alt'
                    : k}
      </kbd>
    </span>
  ))
}

export default function ShortcutsOverlay({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const grouped = groupShortcuts(SHORTCUTS)

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-background/60 px-4 backdrop-blur-md"
      role="dialog"
      aria-label="Klavye kısayolları"
      aria-modal="true"
      onClick={onClose}
    >
      <section
        className="w-[min(560px,calc(100vw-2rem))] max-h-[80vh] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
        style={{ contain: 'layout style paint' }}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              YARDIM · KISAYOLLAR
            </div>
            <h2 className="font-serif text-lg font-light tracking-tight">
              Klavye <em className="font-serif italic font-light">kısayolları</em>
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kısayol panelini kapat"
            className="rounded-lg px-2 py-1 text-sm text-muted-foreground transition hover:bg-foreground/5 hover:text-foreground"
          >
            Esc
          </button>
        </header>

        <div className="overflow-y-auto px-5 py-4" style={{ maxHeight: 'calc(80vh - 7.5rem)' }}>
          {GROUP_ORDER.map((g) => {
            const list = grouped[g]
            if (list.length === 0) return null
            return (
              <section key={g} className="mb-5 last:mb-0">
                <h3 className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  {GROUP_LABEL[g]}
                </h3>
                <ul className="divide-y divide-border/60">
                  {list.map((s) => (
                    <li
                      key={s.keys}
                      className="flex items-center justify-between gap-4 py-2.5"
                    >
                      <span className="text-[13.5px] text-foreground">{s.label}</span>
                      <span className="flex items-center gap-1.5">{renderKeys(s.keys)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
        </div>

        <footer className="border-t border-border bg-muted/40 px-5 py-2.5 text-[11px] text-muted-foreground">
          <kbd className="rounded bg-card px-1 font-mono">?</kbd> ile aç ·{' '}
          <kbd className="rounded bg-card px-1 font-mono">Esc</kbd> kapat
        </footer>
      </section>
    </div>
  )
}
