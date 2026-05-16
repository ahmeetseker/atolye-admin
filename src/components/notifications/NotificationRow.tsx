import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router'
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Bell,
  CheckCircle2,
  CreditCard,
  Mail,
  MoreVertical,
  Plug,
  Settings2,
  Trash2,
  TrendingUp,
  UserPlus,
  Users,
} from '@landx/icons'
import { cn, timeAgo } from '@landx/ui'
import type { Notification, NotificationCategory } from '@landx/data'

/**
 * Single row in the admin notifications feed.
 *
 * Wave F3 / Agent-F3C — Faz 12.x mark-read + delete.
 *
 * Visual contract:
 *  - Unread: `border-l-2 border-foreground` + bold serif title.
 *  - Read: subtle border + lighter title weight.
 * Click anywhere on the row marks it as read (idempotent if already read).
 * `⋯` menu exposes a single Delete action.
 *
 * Token-only. Touch targets ≥44px on mobile (h-11 w-11), shrink to h-8 w-8
 * on md+. ARIA: row gets `aria-label="{title}, okundu/okunmadı"`.
 */

const CATEGORY_TONES: Record<NotificationCategory, { bg: string; fg: string }> = {
  mention: {
    bg: 'bg-violet-500/10',
    fg: 'text-violet-700 dark:text-violet-300',
  },
  sistem: {
    bg: 'bg-slate-500/10',
    fg: 'text-slate-700 dark:text-slate-300',
  },
  müşteri: {
    bg: 'bg-emerald-500/10',
    fg: 'text-emerald-700 dark:text-emerald-300',
  },
  satış: {
    bg: 'bg-amber-500/10',
    fg: 'text-amber-700 dark:text-amber-300',
  },
  finans: {
    bg: 'bg-rose-500/10',
    fg: 'text-rose-700 dark:text-rose-300',
  },
}

const CATEGORY_ICONS: Record<NotificationCategory, typeof UserPlus> = {
  mention: Users,
  sistem: Activity,
  müşteri: UserPlus,
  satış: TrendingUp,
  finans: CreditCard,
}

function pickIcon(item: Notification): typeof UserPlus {
  if (item.type === 'warning') return AlertCircle
  if (item.type === 'success') return CheckCircle2
  if (item.relatedEntity?.type === 'message') return Mail
  if (item.title.toLowerCase().includes('entegrasyon')) return Plug
  if (item.title.toLowerCase().includes('yedek')) return Settings2
  if (item.type === 'system') return Bell
  return CATEGORY_ICONS[item.category]
}

interface NotificationRowProps {
  item: Notification
  onMarkRead: (id: string) => void
  onDelete: (id: string) => void
}

export function NotificationRow({ item, onMarkRead, onDelete }: NotificationRowProps) {
  const tone = CATEGORY_TONES[item.category]
  const Icon = pickIcon(item)
  const a11yState = item.read ? 'okundu' : 'okunmadı'

  const handleRowActivate = () => {
    if (!item.read) onMarkRead(item.id)
  }

  return (
    <li
      data-testid={`notification-row-${item.id}`}
      data-read={item.read ? 'true' : 'false'}
      aria-label={`${item.title}, ${a11yState}`}
      className={cn(
        'group relative flex items-start gap-3 rounded-2xl border bg-card p-3 transition md:p-4',
        !item.read && 'border-l-2 border-l-foreground border-y-foreground/20 border-r-foreground/20',
        item.read && 'border-border bg-card/60',
      )}
    >
      <button
        type="button"
        onClick={handleRowActivate}
        aria-label={
          item.read
            ? `${item.title} — zaten okundu`
            : `${item.title} — okundu olarak işaretle`
        }
        data-testid={`notification-row-activate-${item.id}`}
        className="absolute inset-0 z-0 cursor-pointer rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
      />

      <span
        aria-hidden
        className={cn(
          'relative z-10 flex h-9 w-9 flex-none items-center justify-center rounded-xl',
          tone.bg,
          tone.fg,
        )}
      >
        <Icon className="h-4 w-4" />
      </span>

      <div className="relative z-10 min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <h4
            className={cn(
              'truncate font-serif text-[15px] tracking-tight',
              !item.read ? 'font-medium text-foreground' : 'font-light text-foreground/80',
            )}
          >
            {item.title}
          </h4>
          <span className="ml-auto flex-none font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            {timeAgo(item.timestamp)}
          </span>
        </div>
        <p className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-muted-foreground">
          {item.body}
        </p>
        <div className="mt-2 flex items-center gap-2">
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider',
              tone.bg,
              tone.fg,
            )}
          >
            {item.category}
          </span>
          {!item.read && (
            <span
              data-testid={`notification-unread-badge-${item.id}`}
              className="inline-flex items-center rounded-full bg-amber-500/15 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300"
            >
              Yeni
            </span>
          )}
          {item.actionLabel && item.actionHref && (
            <Link
              to={item.actionHref}
              onClick={(e) => e.stopPropagation()}
              className="relative z-10 ml-auto inline-flex items-center gap-1 rounded-lg border border-border bg-background/40 px-2.5 py-1 text-[11.5px] font-medium transition hover:bg-foreground/[0.04]"
            >
              {item.actionLabel}
              <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>
      </div>

      <div className="relative z-10">
        <NotificationActionsMenu
          id={item.id}
          onDelete={() => onDelete(item.id)}
        />
      </div>
    </li>
  )
}

interface NotificationActionsMenuProps {
  id: string
  onDelete: () => void
}

function NotificationActionsMenu({ id, onDelete }: NotificationActionsMenuProps) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
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
    deleteRef.current?.focus()
  }, [open])

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
        aria-label="Bildirim işlemleri"
        data-testid={`notification-row-actions-${id}`}
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
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
          aria-label="Bildirim işlemleri"
          onKeyDown={handleKey}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'absolute right-0 top-full z-40 mt-1 min-w-[160px] overflow-hidden rounded-xl border border-border bg-card shadow-lg',
          )}
        >
          <button
            ref={deleteRef}
            type="button"
            role="menuitem"
            data-testid={`notification-row-delete-${id}`}
            onClick={() => {
              close(false)
              onDelete()
            }}
            className={cn(
              'flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px] transition',
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
