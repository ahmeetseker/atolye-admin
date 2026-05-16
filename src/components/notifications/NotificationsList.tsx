import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from 'react'
import { CheckCheck, Inbox, Trash2 } from '@landx/icons'
import { cn } from '@landx/ui'
import {
  EVENT_ADMIN_NOTIFICATIONS_CHANGED,
  deleteMany,
  deleteNotification,
  getNotifications,
  markAllAsRead,
  markAsRead,
  markManyAsRead,
  seedIfEmpty,
  type AdminNotification,
  type AdminNotificationType,
} from '@/lib/admin-notifications'
import { useToast } from '@/lib/use-toast'
import { NotificationItem, getTypeLabel } from './NotificationItem'

/**
 * NotificationsList — F10.B admin notifications list orchestrator.
 *
 * Owns the storage-bound state for `/notifications`:
 *  - Seeds 10 deterministic admin mocks on first mount via `seedIfEmpty`.
 *  - Subscribes to cross-tab `EVENT_ADMIN_NOTIFICATIONS_CHANGED` + `storage`
 *    events so a delete in another tab updates this view immediately.
 *  - Drives filter chips (Tümü / Okunmadı / Okundu + 6 per-type chips).
 *  - Manages bulk selection scoped to the currently visible filter result.
 *
 * Bulk pattern is borrowed from `BulkActionBar` (F6.C) — sticky toolbar at the
 * top with count + actions. We reuse the visual contract but inline the bar
 * because the entities are smaller (no status / tag flows here).
 *
 * State transitions are wrapped in `useTransition` where the resulting render
 * spans the whole list (filter switch, bulk apply) to keep INP under 200ms.
 */

type ReadFilterKey = 'all' | 'unread' | 'read'

const READ_FILTERS: { key: ReadFilterKey; label: string }[] = [
  { key: 'all', label: 'Tümü' },
  { key: 'unread', label: 'Okunmadı' },
  { key: 'read', label: 'Okundu' },
]

const TYPE_FILTERS: { key: AdminNotificationType; label: string }[] = [
  { key: 'yeni-musteri', label: getTypeLabel('yeni-musteri') },
  { key: 'yeni-ilan', label: getTypeLabel('yeni-ilan') },
  { key: 'satis-asama', label: getTypeLabel('satis-asama') },
  { key: 'kontrat', label: getTypeLabel('kontrat') },
  { key: 'mesaj', label: getTypeLabel('mesaj') },
  { key: 'sistem', label: getTypeLabel('sistem') },
]

export function NotificationsList() {
  const [items, setItems] = useState<AdminNotification[]>([])
  const [readFilter, setReadFilter] = useState<ReadFilterKey>('all')
  const [typeFilter, setTypeFilter] = useState<AdminNotificationType | null>(
    null,
  )
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [, startTransition] = useTransition()
  const { toast } = useToast()

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

  const filtered = useMemo(() => {
    let out = items
    if (readFilter === 'unread') out = out.filter((n) => !n.read)
    else if (readFilter === 'read') out = out.filter((n) => n.read)
    if (typeFilter) out = out.filter((n) => n.type === typeFilter)
    return out
  }, [items, readFilter, typeFilter])

  const counts = useMemo(() => {
    return {
      all: items.length,
      unread: items.filter((n) => !n.read).length,
      read: items.filter((n) => n.read).length,
    }
  }, [items])

  const typeCounts = useMemo(() => {
    const map: Record<AdminNotificationType, number> = {
      'yeni-musteri': 0,
      'yeni-ilan': 0,
      'satis-asama': 0,
      kontrat: 0,
      mesaj: 0,
      sistem: 0,
    }
    for (const n of items) map[n.type] += 1
    return map
  }, [items])

  // Strip any selections that no longer match the current filter to keep the
  // bulk bar count honest (selection scope = visible rows).
  useEffect(() => {
    if (selected.size === 0) return
    const visibleIds = new Set(filtered.map((n) => n.id))
    let mutated = false
    const next = new Set<string>()
    for (const id of selected) {
      if (visibleIds.has(id)) {
        next.add(id)
      } else {
        mutated = true
      }
    }
    if (mutated) setSelected(next)
  }, [filtered, selected])

  const setReadFilterTransition = (key: ReadFilterKey) => {
    startTransition(() => setReadFilter(key))
  }

  const setTypeFilterTransition = (key: AdminNotificationType | null) => {
    startTransition(() => setTypeFilter(key))
  }

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSelectAllVisible = () => {
    if (filtered.every((n) => selected.has(n.id)) && filtered.length > 0) {
      setSelected(new Set())
      return
    }
    setSelected(new Set(filtered.map((n) => n.id)))
  }

  const handleClearSelection = () => setSelected(new Set())

  const handleMarkRead = (id: string) => {
    markAsRead(id)
    refresh()
  }

  const handleDelete = (id: string) => {
    deleteNotification(id)
    refresh()
    toast('Bildirim silindi', { variant: 'success' })
  }

  const handleOpen = (item: AdminNotification) => {
    if (!item.read) {
      markAsRead(item.id)
      refresh()
    }
    if (item.link && typeof window !== 'undefined') {
      window.location.href = item.link
    }
  }

  const handleMarkAllRead = () => {
    if (counts.unread === 0) {
      toast('Okunmamış bildirim yok', { variant: 'info' })
      return
    }
    markAllAsRead()
    refresh()
    toast('Tüm bildirimler okundu olarak işaretlendi', { variant: 'success' })
  }

  const handleBulkMarkRead = () => {
    if (selected.size === 0) return
    const ids = Array.from(selected)
    markManyAsRead(ids)
    refresh()
    setSelected(new Set())
    toast(`${ids.length} bildirim okundu olarak işaretlendi`, {
      variant: 'success',
    })
  }

  const handleBulkDelete = () => {
    if (selected.size === 0) return
    const count = selected.size
    deleteMany(Array.from(selected))
    refresh()
    setSelected(new Set())
    toast(`${count} bildirim silindi`, { variant: 'success' })
  }

  const allVisibleSelected =
    filtered.length > 0 && filtered.every((n) => selected.has(n.id))

  return (
    <div className="space-y-4" data-testid="admin-notifications-list">
      {/* Header actions row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          className="flex flex-wrap gap-1.5"
          role="tablist"
          aria-label="Okunma durumu filtreleri"
        >
          {READ_FILTERS.map((f) => {
            const active = readFilter === f.key
            return (
              <button
                key={f.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setReadFilterTransition(f.key)}
                data-testid={`admin-notification-filter-${f.key}`}
                data-active={active ? 'true' : 'false'}
                className={cn(
                  'inline-flex min-h-[36px] items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition md:min-h-0',
                  active
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border bg-card text-foreground/80 hover:bg-foreground/[0.04]',
                )}
              >
                <span>{f.label}</span>
                <span
                  className={cn(
                    'rounded-full px-1.5 font-mono text-[10px] tabular-nums',
                    active
                      ? 'bg-background/20'
                      : 'bg-foreground/[0.06] text-muted-foreground',
                  )}
                >
                  {counts[f.key]}
                </span>
              </button>
            )
          })}
        </div>

        <button
          type="button"
          onClick={handleMarkAllRead}
          disabled={counts.unread === 0}
          data-testid="admin-notifications-mark-all-read"
          className="inline-flex min-h-[36px] items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-[12px] font-medium transition hover:bg-foreground/5 disabled:cursor-not-allowed disabled:opacity-50 md:min-h-0"
        >
          <CheckCheck className="h-3.5 w-3.5" />
          Tümünü okundu işaretle
        </button>
      </div>

      {/* Per-type filter chips */}
      <div
        className="-mx-1 flex flex-wrap gap-1.5 px-1"
        role="tablist"
        aria-label="Bildirim tipi filtreleri"
      >
        <button
          type="button"
          role="tab"
          aria-selected={typeFilter === null}
          onClick={() => setTypeFilterTransition(null)}
          data-testid="admin-notification-type-filter-all"
          data-active={typeFilter === null ? 'true' : 'false'}
          className={cn(
            'inline-flex min-h-[32px] items-center gap-1.5 rounded-full border px-3 py-1 text-[11.5px] font-medium transition md:min-h-0',
            typeFilter === null
              ? 'border-foreground/30 bg-foreground/10 text-foreground'
              : 'border-border bg-card text-foreground/70 hover:bg-foreground/[0.04]',
          )}
        >
          Tüm tipler
        </button>
        {TYPE_FILTERS.map((f) => {
          const active = typeFilter === f.key
          return (
            <button
              key={f.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTypeFilterTransition(active ? null : f.key)}
              data-testid={`admin-notification-type-filter-${f.key}`}
              data-active={active ? 'true' : 'false'}
              className={cn(
                'inline-flex min-h-[32px] items-center gap-1.5 rounded-full border px-3 py-1 text-[11.5px] font-medium transition md:min-h-0',
                active
                  ? 'border-foreground/30 bg-foreground/10 text-foreground'
                  : 'border-border bg-card text-foreground/70 hover:bg-foreground/[0.04]',
              )}
            >
              <span>{f.label}</span>
              <span
                className={cn(
                  'rounded-full px-1.5 font-mono text-[10px] tabular-nums',
                  active
                    ? 'bg-foreground/10 text-foreground'
                    : 'bg-foreground/[0.06] text-muted-foreground',
                )}
              >
                {typeCounts[f.key]}
              </span>
            </button>
          )
        })}
      </div>

      {/* Bulk toolbar — F6.C inline pattern */}
      {selected.size > 0 && (
        <div
          data-testid="admin-notifications-bulk-bar"
          role="region"
          aria-label="Toplu işlem çubuğu"
          className="sticky top-2 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-foreground/20 bg-card/95 px-3 py-2 shadow-md backdrop-blur"
        >
          <div className="flex items-center gap-2">
            <span
              data-testid="admin-notifications-bulk-count"
              className="inline-flex items-center rounded-full bg-foreground px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-background"
            >
              {selected.size} seçili
            </span>
            <button
              type="button"
              onClick={handleClearSelection}
              data-testid="admin-notifications-bulk-clear"
              className="text-[12px] font-medium text-muted-foreground transition hover:text-foreground"
            >
              Temizle
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={handleBulkMarkRead}
              data-testid="admin-notifications-bulk-mark-read"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-[12px] font-medium transition hover:bg-foreground/5"
            >
              <CheckCheck className="h-3 w-3" />
              Okundu işaretle
            </button>
            <button
              type="button"
              onClick={handleBulkDelete}
              data-testid="admin-notifications-bulk-delete"
              className="inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-1.5 text-[12px] font-medium text-background transition hover:opacity-90"
            >
              <Trash2 className="h-3 w-3" />
              Sil
            </button>
          </div>
        </div>
      )}

      {/* Select-all row (only when there's content) */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-between px-1">
          <label className="inline-flex cursor-pointer items-center gap-2 text-[12px] text-muted-foreground transition hover:text-foreground">
            <input
              type="checkbox"
              checked={allVisibleSelected}
              onChange={handleSelectAllVisible}
              data-testid="admin-notifications-select-all"
              className="h-4 w-4 rounded border-border text-foreground focus:ring-2 focus:ring-foreground/20"
            />
            <span>{allVisibleSelected ? 'Seçimi kaldır' : 'Tümünü seç'}</span>
          </label>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            {filtered.length} kayıt
          </span>
        </div>
      )}

      {/* Feed */}
      {filtered.length === 0 ? (
        <div
          data-testid="admin-notifications-empty"
          className="rounded-2xl border border-dashed border-border bg-background/40 p-6 text-center md:p-10"
        >
          <Inbox className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="mt-2 text-[13px] text-muted-foreground">
            {items.length === 0
              ? 'Bildirim yok.'
              : 'Bu filtreyle bildirim yok.'}
          </p>
        </div>
      ) : (
        <ul className="space-y-2" data-testid="admin-notifications-feed">
          {filtered.map((n) => (
            <NotificationItem
              key={n.id}
              item={n}
              selected={selected.has(n.id)}
              onToggleSelect={toggleSelect}
              onMarkRead={handleMarkRead}
              onDelete={handleDelete}
              onOpen={handleOpen}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
