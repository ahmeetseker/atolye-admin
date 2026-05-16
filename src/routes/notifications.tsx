import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import {
  Activity,
  ArrowRight,
  Bell,
  BellOff,
  Inbox,
  Settings2,
} from '@landx/icons'
import { PageShell, cn } from '@landx/ui'
import { NotificationsList } from '@/components/notifications/NotificationsList'
import {
  EVENT_ADMIN_NOTIFICATIONS_CHANGED,
  getNotifications,
  seedIfEmpty,
  type AdminNotification,
} from '@/lib/admin-notifications'

/**
 * /notifications — F10.B refactor.
 *
 * Previously this route owned the entire feed UI inline against `@landx/data`'s
 * `useNotifications()` query (F1-F2 implementation). F10.B replaces that with
 * the F8.B-style localStorage backing store + `<NotificationsList />` so
 * filter / bulk / mark-read behaviour stays consistent with public-site.
 *
 * The KPI strip + right rail are kept as visual furniture but now derive from
 * the new `arsam.admin-notifications.v1` store so the page never reads from
 * two sources of truth.
 */

export function Notifications() {
  const [items, setItems] = useState<AdminNotification[]>([])
  const [muted, setMuted] = useState(false)

  const refresh = useCallback(() => {
    setItems(getNotifications())
  }, [])

  useEffect(() => {
    seedIfEmpty()
    refresh()
    const onChange = () => refresh()
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'arsam.admin-notifications.v1') refresh()
    }
    window.addEventListener(
      EVENT_ADMIN_NOTIFICATIONS_CHANGED,
      onChange as EventListener,
    )
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(
        EVENT_ADMIN_NOTIFICATIONS_CHANGED,
        onChange as EventListener,
      )
      window.removeEventListener('storage', onStorage)
    }
  }, [refresh])

  const now = Date.now()
  const today = useMemo(() => {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const startMs = start.getTime()
    return items.filter((n) => n.createdAt >= startMs).length
  }, [items])

  const thisWeek = useMemo(() => {
    const cutoff = now - 7 * 24 * 60 * 60 * 1000
    return items.filter((n) => n.createdAt >= cutoff).length
  }, [items, now])

  const unreadCount = items.filter((n) => !n.read).length

  return (
    <PageShell
      eyebrow="MOD · BİLDİRİMLER"
      title={
        <>
          Bildirim <em className="font-serif italic font-light">akışı</em>
        </>
      }
      description="Müşteri, satış, finans ve sistem olaylarını tek yerden takip et."
      actions={
        <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            data-testid="notifications-mute-toggle"
            className={cn(
              'inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border px-3 py-2 text-[12px] font-medium transition md:min-h-0 md:w-auto',
              muted
                ? 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                : 'border-border bg-card hover:bg-foreground/5',
            )}
          >
            {muted ? (
              <BellOff className="h-3.5 w-3.5" />
            ) : (
              <Bell className="h-3.5 w-3.5" />
            )}
            {muted ? 'Sessize alındı' : 'Sessize al'}
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-4 md:gap-5 lg:grid-cols-[1fr_300px]">
        <div className="space-y-4 md:space-y-5">
          {/* KPI strip */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <KpiTile label="Bugün" value={today.toString()} icon={Inbox} />
            <KpiTile
              label="Bu hafta"
              value={thisWeek.toString()}
              icon={Activity}
            />
            <KpiTile
              label="Okunmamış"
              value={unreadCount.toString()}
              icon={Bell}
              accent={unreadCount > 0}
            />
            <KpiTile
              label="Mute durumu"
              value={muted ? 'Açık' : 'Kapalı'}
              icon={muted ? BellOff : Bell}
            />
          </div>

          <NotificationsList />
        </div>

        {/* Right rail */}
        <aside className="space-y-4 md:space-y-4">
          <article className="rounded-2xl border border-border bg-card p-4 md:p-5">
            <header className="mb-3 flex items-start gap-3">
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-foreground/[0.06] text-foreground/80">
                <Settings2 className="h-4 w-4" />
              </span>
              <div>
                <h3 className="font-serif text-base font-medium tracking-tight">
                  Bildirim tercihleri
                </h3>
                <p className="mt-0.5 text-[12px] text-muted-foreground">
                  Push, e-posta, SMS kanallarını düzenle.
                </p>
              </div>
            </header>
            <Link
              to="/settings"
              className="inline-flex min-h-[44px] w-full items-center justify-between gap-2 rounded-xl border border-border bg-background/40 px-3 py-2 text-[13px] font-medium transition hover:bg-foreground/[0.04] md:min-h-0"
            >
              Tercihleri aç
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </article>
        </aside>
      </div>
    </PageShell>
  )
}

function KpiTile({
  label,
  value,
  icon: Icon,
  accent = false,
}: {
  label: string
  value: string
  icon: typeof Inbox
  accent?: boolean
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </span>
        <Icon
          className={cn(
            'h-3.5 w-3.5',
            accent
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-muted-foreground',
          )}
        />
      </div>
      <p className="mt-2 font-serif text-2xl font-light tracking-tight">
        {value}
      </p>
    </div>
  )
}
