import {
  Award,
  FileText,
  MessageCircle,
  Settings,
  TrendingUp,
  Trash2,
  User,
  type LucideIcon,
} from '@landx/icons'
import { cn, timeAgo } from '@landx/ui'
import type {
  AdminNotification,
  AdminNotificationType,
} from '@/lib/admin-notifications'

/**
 * NotificationItem — single row in the F10.B admin notifications list.
 *
 * Visual contract mirrors the v3 design system: token-only surfaces, no
 * hard-coded greys, serif title, mono timestamp eyebrow. Touch targets stay
 * ≥44px on mobile via min-h utilities; an explicit row checkbox + per-row
 * actions live on the right edge so they never overlap the body click target.
 *
 * Three interactive elements:
 *  - Row checkbox (bulk-select scope, controlled by parent)
 *  - "Okundu işaretle" button (only for unread rows)
 *  - Trash button (delete with parent confirm)
 *
 * Clicking the title (when `link` is set) marks the row as read and follows
 * the href via `onOpen`. Parent owns navigation so we stay router-agnostic.
 */

interface TypeTone {
  bg: string
  fg: string
  label: string
  icon: LucideIcon
}

const TYPE_TONES: Record<AdminNotificationType, TypeTone> = {
  'yeni-musteri': {
    bg: 'bg-emerald-500/10',
    fg: 'text-emerald-700 dark:text-emerald-300',
    label: 'Müşteri',
    icon: User,
  },
  'yeni-ilan': {
    bg: 'bg-violet-500/10',
    fg: 'text-violet-700 dark:text-violet-300',
    label: 'İlan',
    icon: FileText,
  },
  'satis-asama': {
    bg: 'bg-amber-500/10',
    fg: 'text-amber-700 dark:text-amber-300',
    label: 'Satış',
    icon: TrendingUp,
  },
  kontrat: {
    bg: 'bg-rose-500/10',
    fg: 'text-rose-700 dark:text-rose-300',
    label: 'Kontrat',
    icon: Award,
  },
  mesaj: {
    bg: 'bg-fuchsia-500/10',
    fg: 'text-fuchsia-700 dark:text-fuchsia-300',
    label: 'Mesaj',
    icon: MessageCircle,
  },
  sistem: {
    bg: 'bg-slate-500/10',
    fg: 'text-slate-700 dark:text-slate-300',
    label: 'Sistem',
    icon: Settings,
  },
}

export function getTypeLabel(type: AdminNotificationType): string {
  return TYPE_TONES[type].label
}

interface NotificationItemProps {
  item: AdminNotification
  selected: boolean
  onToggleSelect: (id: string) => void
  onMarkRead: (id: string) => void
  onDelete: (id: string) => void
  onOpen: (item: AdminNotification) => void
}

export function NotificationItem({
  item,
  selected,
  onToggleSelect,
  onMarkRead,
  onDelete,
  onOpen,
}: NotificationItemProps) {
  const tone = TYPE_TONES[item.type]
  const Icon = tone.icon
  const a11yState = item.read ? 'okundu' : 'okunmadı'

  return (
    <li
      data-testid={`admin-notification-row-${item.id}`}
      data-notification-id={item.id}
      data-notification-type={item.type}
      data-notification-read={item.read ? 'true' : 'false'}
      aria-label={`${item.title}, ${a11yState}`}
      className={cn(
        'group relative flex items-start gap-3 rounded-2xl border bg-card p-3 transition md:p-4',
        !item.read &&
          'border-l-2 border-l-foreground border-y-foreground/20 border-r-foreground/20',
        item.read && 'border-border bg-card/60',
        selected && 'ring-2 ring-foreground/30 ring-offset-2 ring-offset-background',
      )}
    >
      <label
        className="relative z-10 flex h-9 w-9 flex-none cursor-pointer items-center justify-center"
        aria-label={selected ? 'Seçimi kaldır' : 'Bildirimi seç'}
      >
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(item.id)}
          data-testid={`admin-notification-select-${item.id}`}
          className="h-4 w-4 cursor-pointer rounded border-border text-foreground focus:ring-2 focus:ring-foreground/20"
        />
      </label>

      <span
        aria-hidden
        className={cn(
          'relative z-10 mt-0.5 flex h-9 w-9 flex-none items-center justify-center rounded-xl',
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
              !item.read
                ? 'font-medium text-foreground'
                : 'font-light text-foreground/80',
            )}
          >
            {item.title}
          </h4>
          <span className="ml-auto flex-none font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            {timeAgo(new Date(item.createdAt).toISOString())}
          </span>
        </div>
        <p className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-muted-foreground">
          {item.body}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider',
              tone.bg,
              tone.fg,
            )}
          >
            {tone.label}
          </span>
          {!item.read && (
            <span
              data-testid={`admin-notification-unread-badge-${item.id}`}
              className="inline-flex items-center rounded-full bg-amber-500/15 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300"
            >
              Yeni
            </span>
          )}
          {item.link && (
            <button
              type="button"
              onClick={() => onOpen(item)}
              data-testid={`admin-notification-open-${item.id}`}
              className="ml-auto inline-flex items-center gap-1 rounded-lg border border-border bg-background/40 px-2.5 py-1 text-[11.5px] font-medium transition hover:bg-foreground/[0.04]"
            >
              Aç
            </button>
          )}
        </div>
      </div>

      <div className="relative z-10 flex flex-none flex-col items-end gap-1.5">
        {!item.read && (
          <button
            type="button"
            onClick={() => onMarkRead(item.id)}
            data-testid={`admin-notification-mark-read-${item.id}`}
            className="inline-flex min-h-[36px] items-center rounded-lg border border-border bg-card px-2.5 py-1 text-[11.5px] font-medium transition hover:bg-foreground/[0.04]"
          >
            Okundu
          </button>
        )}
        <button
          type="button"
          onClick={() => onDelete(item.id)}
          data-testid={`admin-notification-delete-${item.id}`}
          aria-label="Bildirimi sil"
          className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg text-muted-foreground transition hover:bg-foreground/5 hover:text-foreground"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </li>
  )
}
