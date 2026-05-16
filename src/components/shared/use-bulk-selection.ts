import { useCallback, useEffect, useMemo, useState } from 'react'

/**
 * Wave F18.0 — Generic bulk-selection hook for list/table views.
 *
 * Returns helpers for selected IDs + state machine that supports a tri-state
 * "select all" checkbox (none / partial / all). Selection prunes automatically
 * when the underlying `items` array changes — IDs that no longer exist drop
 * out, which is the right behaviour when the user changes a filter.
 */
export interface UseBulkSelectionResult<T extends { id: string }> {
  selectedIds: Set<string>
  selectedItems: T[]
  isSelected: (id: string) => boolean
  toggle: (id: string) => void
  toggleAll: () => void
  selectAll: () => void
  clear: () => void
  selectionState: 'none' | 'partial' | 'all'
}

export function useBulkSelection<T extends { id: string }>(items: T[]): UseBulkSelectionResult<T> {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())

  useEffect(() => {
    const live = new Set(items.map((i) => i.id))
    setSelectedIds((prev) => {
      const next = new Set<string>()
      for (const id of prev) if (live.has(id)) next.add(id)
      return next.size === prev.size ? prev : next
    })
  }, [items])

  const isSelected = useCallback(
    (id: string) => selectedIds.has(id),
    [selectedIds],
  )

  const toggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(items.map((i) => i.id)))
  }, [items])

  const clear = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const selectionState = useMemo<'none' | 'partial' | 'all'>(() => {
    if (selectedIds.size === 0) return 'none'
    if (selectedIds.size >= items.length && items.length > 0) return 'all'
    return 'partial'
  }, [selectedIds, items.length])

  const toggleAll = useCallback(() => {
    if (selectionState === 'all') {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(items.map((i) => i.id)))
    }
  }, [items, selectionState])

  const selectedItems = useMemo(
    () => items.filter((i) => selectedIds.has(i.id)),
    [items, selectedIds],
  )

  return {
    selectedIds,
    selectedItems,
    isSelected,
    toggle,
    toggleAll,
    selectAll,
    clear,
    selectionState,
  }
}
