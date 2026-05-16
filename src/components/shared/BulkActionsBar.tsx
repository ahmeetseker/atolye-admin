// Wave F18.0 — Bulk actions bar shown above a listing/customer table when
// 1+ rows are selected. Parent route wires `actions[]` to modal triggers
// (bulk edit / delete / export). Mirror of the super-admin F13.B helper —
// kept paralel here so atolye-admin doesn't depend on super-admin source.

import { X } from '@landx/icons'

export interface BulkAction {
  id: string
  label: string
  tone?: 'default' | 'destructive'
  onClick: () => void
}

export interface BulkActionsBarProps {
  count: number
  onClear: () => void
  actions: BulkAction[]
}

export function BulkActionsBar({ count, onClear, actions }: BulkActionsBarProps) {
  if (count === 0) return null
  return (
    <div
      data-testid="bulk-actions-bar"
      role="region"
      aria-label="Toplu eylem çubuğu"
      className="mb-3 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card px-4 py-2.5"
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onClear}
          aria-label="Seçimi temizle"
          data-testid="bulk-clear"
          className="rounded-lg p-1 text-muted-foreground transition hover:bg-foreground/5 hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          SEÇİLİ
        </span>
        <span
          className="rounded-full bg-foreground px-2 py-0.5 font-mono text-[11px] text-background"
          data-testid="bulk-count"
        >
          {count}
        </span>
      </div>
      <div className="flex flex-1 flex-wrap items-center justify-end gap-1.5">
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            onClick={action.onClick}
            data-testid={`bulk-action-${action.id}`}
            className={
              action.tone === 'destructive'
                ? 'rounded-lg border border-border bg-card px-3 py-1.5 text-[12.5px] font-medium text-rose-600 transition hover:bg-rose-500/10'
                : 'rounded-lg border border-border bg-card px-3 py-1.5 text-[12.5px] font-medium transition hover:bg-foreground/5'
            }
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default BulkActionsBar
