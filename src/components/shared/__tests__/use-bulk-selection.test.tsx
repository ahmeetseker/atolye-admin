import { describe, it, expect } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useBulkSelection } from '@/components/shared/use-bulk-selection'

interface Item {
  id: string
  name: string
}

const ITEMS: Item[] = [
  { id: 'a', name: 'A' },
  { id: 'b', name: 'B' },
  { id: 'c', name: 'C' },
]

describe('useBulkSelection', () => {
  it('starts empty with selectionState=none', () => {
    const { result } = renderHook(() => useBulkSelection(ITEMS))
    expect(result.current.selectedIds.size).toBe(0)
    expect(result.current.selectionState).toBe('none')
    expect(result.current.selectedItems).toEqual([])
  })

  it('toggle adds and removes a single id', () => {
    const { result } = renderHook(() => useBulkSelection(ITEMS))
    act(() => result.current.toggle('a'))
    expect(result.current.isSelected('a')).toBe(true)
    expect(result.current.selectionState).toBe('partial')
    act(() => result.current.toggle('a'))
    expect(result.current.isSelected('a')).toBe(false)
    expect(result.current.selectionState).toBe('none')
  })

  it('selectAll marks every item; toggleAll then clears', () => {
    const { result } = renderHook(() => useBulkSelection(ITEMS))
    act(() => result.current.selectAll())
    expect(result.current.selectionState).toBe('all')
    expect(result.current.selectedIds.size).toBe(3)
    act(() => result.current.toggleAll())
    expect(result.current.selectionState).toBe('none')
  })

  it('toggleAll from partial → all', () => {
    const { result } = renderHook(() => useBulkSelection(ITEMS))
    act(() => result.current.toggle('a'))
    expect(result.current.selectionState).toBe('partial')
    act(() => result.current.toggleAll())
    expect(result.current.selectionState).toBe('all')
  })

  it('clear empties everything', () => {
    const { result } = renderHook(() => useBulkSelection(ITEMS))
    act(() => result.current.selectAll())
    act(() => result.current.clear())
    expect(result.current.selectedIds.size).toBe(0)
  })

  it('prunes IDs that no longer exist when items change', () => {
    const { result, rerender } = renderHook(({ items }) => useBulkSelection(items), {
      initialProps: { items: ITEMS },
    })
    act(() => result.current.selectAll())
    expect(result.current.selectedIds.size).toBe(3)
    rerender({ items: [{ id: 'a', name: 'A' }] })
    expect(result.current.selectedIds.size).toBe(1)
    expect(result.current.isSelected('a')).toBe(true)
    expect(result.current.isSelected('b')).toBe(false)
  })

  it('selectedItems mirrors items in the same order', () => {
    const { result } = renderHook(() => useBulkSelection(ITEMS))
    act(() => result.current.toggle('c'))
    act(() => result.current.toggle('a'))
    const ids = result.current.selectedItems.map((i) => i.id)
    expect(ids).toEqual(['a', 'c'])
  })
})
