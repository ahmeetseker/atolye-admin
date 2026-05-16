import { useEffect, useId, useRef, useState } from 'react'
import { MoreVertical, Pencil, Trash2 } from '@landx/icons'
import { cn } from '@landx/ui'

interface RowActionsMenuProps {
  /** Row id — used to build the `listing-row-actions-{id}` testid */
  id: string
  onEdit: () => void
  onDelete: () => void
  label?: string
}

type Action = 'edit' | 'delete'

/**
 * Token-only popover with the ⋯ trigger + Düzenle / Sil items.
 *
 * - Trigger touch target ≥44px on mobile (h-11 w-11), shrinks to h-8 w-8 on md+
 * - ↑/↓ moves focus, Esc closes, click-outside closes
 * - data-testid = `listing-row-actions-{id}` on the trigger (Wave 18 A86 convention)
 */
export function RowActionsMenu({
  id,
  onEdit,
  onDelete,
  label = 'Satır işlemleri',
}: RowActionsMenuProps) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState<Action>('edit')
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const editRef = useRef<HTMLButtonElement | null>(null)
  const deleteRef = useRef<HTMLButtonElement | null>(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (
        menuRef.current?.contains(e.target as Node) ||
        triggerRef.current?.contains(e.target as Node)
      ) {
        return
      }
      setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  useEffect(() => {
    if (!open) return
    const target = active === 'edit' ? editRef.current : deleteRef.current
    target?.focus()
  }, [open, active])

  const close = (returnFocus = true) => {
    setOpen(false)
    if (returnFocus) {
      queueMicrotask(() => triggerRef.current?.focus())
    }
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      close()
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive('delete')
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive('edit')
      return
    }
    if (e.key === 'Tab') {
      close(false)
    }
  }

  return (
    <div className="relative inline-flex">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={label}
        data-testid={`listing-row-actions-${id}`}
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
          setActive('edit')
        }}
        className={cn(
          'inline-flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground transition',
          'hover:bg-foreground/5 hover:text-foreground',
          'md:h-8 md:w-8',
          open && 'bg-foreground/5 text-foreground',
        )}
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={label}
          onKeyDown={handleKey}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'absolute right-0 top-full z-40 mt-1 min-w-[160px] overflow-hidden rounded-xl border border-border bg-card shadow-lg',
          )}
        >
          <button
            ref={editRef}
            type="button"
            role="menuitem"
            data-testid={`listing-row-edit-${id}`}
            onMouseEnter={() => setActive('edit')}
            onClick={() => {
              close(false)
              onEdit()
            }}
            className={cn(
              'flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px] transition',
              'hover:bg-foreground/5 focus:bg-foreground/5 focus:outline-none',
              'min-h-[44px] md:min-h-[36px]',
            )}
          >
            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
            Düzenle
          </button>
          <button
            ref={deleteRef}
            type="button"
            role="menuitem"
            data-testid={`listing-row-delete-${id}`}
            onMouseEnter={() => setActive('delete')}
            onClick={() => {
              close(false)
              onDelete()
            }}
            className={cn(
              'flex w-full items-center gap-2 border-t border-border px-3 py-2.5 text-left text-[13px] transition',
              'hover:bg-foreground/5 focus:bg-foreground/5 focus:outline-none',
              'text-foreground',
              'min-h-[44px] md:min-h-[36px]',
            )}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Sil
          </button>
        </div>
      )}
    </div>
  )
}
