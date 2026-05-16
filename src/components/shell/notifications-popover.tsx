import { Link } from 'react-router'
import {
  Activity,
  AlertCircle,
  Bell,
  CheckCircle2,
  CreditCard,
  Mail,
  Plug,
  TrendingUp,
  UserPlus,
  X,
} from '@landx/icons'
import { cn, timeAgo } from '@landx/ui'
import {
  NOTIFICATIONS_PREVIEW,
  UNREAD_COUNT,
  type NotificationItem,
} from '@/lib/notifications-mock'

const ICON_MAP = {
  UserPlus,
  TrendingUp,
  AlertCircle,
  Activity,
  Plug,
  Mail,
  CheckCircle2,
  CreditCard,
} as const

const CATEGORY_TONE: Record<NotificationItem['category'], string> = {
  müşteri: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
  satış: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  finans: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  sistem: 'bg-stone-500/10 text-stone-600 dark:text-stone-400',
  entegrasyon: 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
}

export function NotificationsPopover({ onClose }: { onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-label="Bildirimler"
      className="w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            BİLDİRİMLER
          </div>
          <div className="mt-0.5 flex items-baseline gap-2">
            <span className="font-serif text-base font-medium">Son etkinlikler</span>
            {UNREAD_COUNT > 0 && (
              <span className="rounded-full bg-foreground px-1.5 py-0.5 font-mono text-[10px] text-background tabular-nums">
                {UNREAD_COUNT} okunmamış
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Bildirimleri kapat"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-foreground/5 hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </header>

      <ul className="max-h-[480px] divide-y divide-border/60 overflow-y-auto">
        {NOTIFICATIONS_PREVIEW.length === 0 ? (
          <li className="px-4 py-6 text-center text-sm text-muted-foreground">
            <Bell className="mx-auto mb-2 h-5 w-5 opacity-50" />
            Yeni bildirim yok.
          </li>
        ) : (
          NOTIFICATIONS_PREVIEW.map((n) => {
            const Icon = ICON_MAP[n.iconName]
            return (
              <li key={n.id} className="relative">
                <Link
                  to={n.href}
                  onClick={onClose}
                  className="flex gap-3 px-4 py-3 transition hover:bg-foreground/[0.03]"
                >
                  {n.unread && (
                    <span
                      aria-hidden
                      className="absolute left-1 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-amber-500"
                    />
                  )}
                  <span
                    aria-hidden
                    className={cn(
                      'flex h-9 w-9 flex-none items-center justify-center rounded-xl',
                      CATEGORY_TONE[n.category],
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <h4
                        className={cn(
                          'text-[13.5px] leading-tight',
                          n.unread ? 'font-semibold' : 'font-medium',
                        )}
                      >
                        {n.title}
                      </h4>
                      <span className="flex-none font-mono text-[10px] text-muted-foreground tabular-nums">
                        {timeAgo(n.at)}
                      </span>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-[12px] text-muted-foreground">
                      {n.preview}
                    </p>
                  </div>
                </Link>
              </li>
            )
          })
        )}
      </ul>

      <footer className="border-t border-border bg-muted/40 px-4 py-2.5">
        <Link
          to="/notifications"
          onClick={onClose}
          className="block text-center font-mono text-[11px] uppercase tracking-[0.14em] text-foreground transition hover:text-accent-foreground"
        >
          TÜM BİLDİRİMLERİ GÖR →
        </Link>
      </footer>
    </div>
  )
}
