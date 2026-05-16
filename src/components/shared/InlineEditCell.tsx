import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@landx/ui'

/**
 * Wave F19.C — Generic inline cell editor. Agnostic of the underlying field
 * type: callers supply both the display formatter and the editor element via
 * render props. The wrapper owns three things only:
 *
 *  - local "draft" state (so cancel discards changes cleanly)
 *  - the save / cancel commit semantics (Enter → save, Escape → cancel,
 *    blur → save unless cancelled)
 *  - the optimistic UI affordance (pending overlay) while the mutation
 *    underneath the `onSave` callback is in flight
 *
 * The DataTable cell's edit mode is driven by `Column<T>.editor` (introduced
 * in the same wave); this component is the typical render prop body. It does
 * NOT auto-close: callers must invoke `ctx.onClose` from the DataTable editor
 * context — exposed here via the `onClose` prop — once the save resolves.
 */
export interface InlineEditCellProps<V> {
  value: V
  display: (value: V) => ReactNode
  /**
   * Render the editor element. The wrapper passes:
   *  - `value` — current draft value (starts at the incoming prop value)
   *  - `onChange(next)` — updates the draft
   *  - `onCommit()` — commits the draft via `onSave` and exits edit mode
   *  - `onCancel()` — discards the draft and exits edit mode
   *
   * The caller wires Enter/Blur → onCommit and Escape → onCancel inside the
   * input element it returns.
   */
  editor: (
    value: V,
    onChange: (next: V) => void,
    onCommit: () => void,
    onCancel: () => void,
  ) => ReactNode
  /**
   * Persist the new value. May return a promise; the wrapper shows a pending
   * affordance while it is unresolved. If the promise rejects, the editor
   * stays open and the error is surfaced via `onError`.
   */
  onSave: (next: V) => void | Promise<unknown>
  onClose: () => void
  /** Called with the rejection from `onSave`. Toast surface is caller's job. */
  onError?: (err: unknown) => void
  /**
   * Skip the round trip when the draft equals the original. Defaults to a
   * strict equality check; pass a custom comparator for object-valued cells.
   */
  isEqual?: (a: V, b: V) => boolean
  className?: string
}

export function InlineEditCell<V>({
  value,
  display,
  editor,
  onSave,
  onClose,
  onError,
  isEqual = (a, b) => Object.is(a, b),
  className,
}: InlineEditCellProps<V>) {
  const [draft, setDraft] = useState<V>(value)
  const [pending, setPending] = useState(false)
  // Track whether commit was already initiated to prevent the trailing `blur`
  // event (fired by some inputs after Escape) from firing onCommit twice.
  const finishedRef = useRef(false)

  // Reset the draft if the underlying value mutates while the editor is open
  // (e.g. another mutation lands). Treat the prop as the source of truth.
  useEffect(() => {
    setDraft(value)
  }, [value])

  const commit = async () => {
    if (finishedRef.current) return
    finishedRef.current = true
    if (isEqual(draft, value)) {
      onClose()
      return
    }
    try {
      setPending(true)
      await onSave(draft)
      onClose()
    } catch (err) {
      finishedRef.current = false
      onError?.(err)
    } finally {
      setPending(false)
    }
  }

  const cancel = () => {
    if (finishedRef.current) return
    finishedRef.current = true
    setDraft(value)
    onClose()
  }

  return (
    <span
      data-testid="inline-edit-cell"
      data-pending={pending ? 'true' : undefined}
      className={cn(
        'inline-flex w-full items-center gap-2',
        pending && 'opacity-60',
        className,
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <span className="flex-1">
        {pending ? display(draft) : editor(draft, setDraft, commit, cancel)}
      </span>
    </span>
  )
}
