import { useMemo, useState, type ReactNode } from 'react'
import { ArrowUpDown, ChevronDown, ChevronUp, Inbox } from '@landx/icons'
import { cn } from '@landx/ui'

export interface Column<T> {
  key: string
  header: ReactNode
  className?: string
  sortValue?: (row: T) => string | number
  cell: (row: T) => ReactNode
  /**
   * Wave F19.C — opt-in inline editor render function. When provided, clicking
   * the cell swaps the display cell for whatever this returns. The editor is
   * responsible for calling `ctx.onClose` to revert to display mode (after
   * save, cancel, or blur). Row-click navigation is suppressed while the
   * editor is open, and only one cell can be in edit mode at a time.
   */
  editor?: (row: T, ctx: { onClose: () => void }) => ReactNode
}

interface DataTableProps<T> {
  rows: T[]
  columns: Column<T>[]
  rowKey: (row: T) => string
  onRowClick?: (row: T) => void
  emptyTitle?: string
  emptyDescription?: string
  bulkActions?: (selected: T[], clearSelection: () => void) => ReactNode
  selectable?: boolean
}

type SortState = { key: string; dir: 'asc' | 'desc' } | null

export function DataTable<T>({
  rows,
  columns,
  rowKey,
  onRowClick,
  emptyTitle = 'Sonuç yok',
  emptyDescription = 'Filtreyi gevşetmeyi dene veya yeni kayıt ekle.',
  bulkActions,
  selectable = true,
}: DataTableProps<T>) {
  const [sort, setSort] = useState<SortState>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  // F19.C — inline edit state: one cell at a time. `null` ⇒ no cell in edit
  // mode. We key by row id + column key so re-renders that shuffle row order
  // can still resolve the active cell.
  const [editingCell, setEditingCell] = useState<{ id: string; key: string } | null>(
    null,
  )

  const sortedRows = useMemo(() => {
    if (!sort) return rows
    const col = columns.find((c) => c.key === sort.key)
    if (!col?.sortValue) return rows
    const sorter = col.sortValue
    const dir = sort.dir === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      const va = sorter(a)
      const vb = sorter(b)
      if (va < vb) return -1 * dir
      if (va > vb) return 1 * dir
      return 0
    })
  }, [rows, columns, sort])

  const toggleSort = (key: string) => {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: 'asc' }
      if (prev.dir === 'asc') return { key, dir: 'desc' }
      return null
    })
  }

  const allSelected = selected.size > 0 && selected.size === rows.length
  const someSelected = selected.size > 0 && !allSelected

  const toggleAll = () => {
    if (allSelected || someSelected) setSelected(new Set())
    else setSelected(new Set(rows.map(rowKey)))
  }

  const toggleRow = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const clearSelection = () => setSelected(new Set())

  const selectedRows = useMemo(
    () => rows.filter((r) => selected.has(rowKey(r))),
    [rows, selected, rowKey],
  )

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/70 bg-card/50 p-8">
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-foreground/[0.06] text-foreground/70">
            <Inbox className="h-5 w-5" />
          </span>
          <div>
            <h3 className="font-serif text-lg font-medium tracking-tight">
              {emptyTitle}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">{emptyDescription}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left">
          <thead>
            <tr
              className="border-b border-border bg-muted/40 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
            >
              {selectable && (
                <th className="w-10 px-4 py-2.5">
                  <input
                    type="checkbox"
                    aria-label="Tümünü seç"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected
                    }}
                    onChange={toggleAll}
                    className="h-3.5 w-3.5 cursor-pointer rounded border-border accent-foreground"
                  />
                </th>
              )}
              {columns.map((c) => {
                const sortable = !!c.sortValue
                const active = sort?.key === c.key
                return (
                  <th
                    key={c.key}
                    className={cn(
                      'px-3 py-2.5 font-semibold',
                      sortable && 'cursor-pointer select-none hover:text-foreground',
                      c.className,
                    )}
                    onClick={sortable ? () => toggleSort(c.key) : undefined}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      {c.header}
                      {sortable &&
                        (active ? (
                          sort.dir === 'asc' ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-40" />
                        ))}
                    </span>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => {
              const id = rowKey(row)
              const isSelected = selected.has(id)
              return (
                <tr
                  key={id}
                  className={cn(
                    'border-b border-border/60 transition-colors last:border-0',
                    onRowClick && 'cursor-pointer hover:bg-foreground/[0.03]',
                    isSelected && 'bg-foreground/[0.04]',
                  )}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {selectable && (
                    <td
                      className="w-10 px-4 py-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        aria-label={`${id} seç`}
                        checked={isSelected}
                        onChange={() => toggleRow(id)}
                        className="h-3.5 w-3.5 cursor-pointer rounded border-border accent-foreground"
                      />
                    </td>
                  )}
                  {columns.map((c) => {
                    const isEditing =
                      editingCell?.id === id && editingCell?.key === c.key
                    const editable = !!c.editor
                    return (
                      <td
                        key={c.key}
                        className={cn(
                          'px-3 py-3 text-sm',
                          editable && 'cursor-text',
                          c.className,
                        )}
                        data-testid={
                          editable ? `editable-cell-${id}-${c.key}` : undefined
                        }
                        onClick={
                          editable
                            ? (e) => {
                                if (isEditing) {
                                  e.stopPropagation()
                                  return
                                }
                                e.stopPropagation()
                                setEditingCell({ id, key: c.key })
                              }
                            : undefined
                        }
                      >
                        {isEditing && c.editor
                          ? c.editor(row, {
                              onClose: () => setEditingCell(null),
                            })
                          : c.cell(row)}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {bulkActions && selected.size > 0 && (
        <div className="flex items-center justify-between gap-3 border-t border-border bg-muted/50 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-foreground px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-background">
              {selected.size} seçili
            </span>
            <button
              type="button"
              onClick={clearSelection}
              className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground transition hover:text-foreground"
            >
              Temizle
            </button>
          </div>
          <div className="flex items-center gap-2">
            {bulkActions(selectedRows, clearSelection)}
          </div>
        </div>
      )}
    </div>
  )
}
