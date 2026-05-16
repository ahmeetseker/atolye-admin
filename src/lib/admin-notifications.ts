/**
 * admin-notifications — `arsam.admin-notifications.v1` localStorage adapter (Wave F10.B).
 *
 * Admin notification inbox backing store for `/notifications`. Mirrors
 * the public-site F8.B pattern (`apps/public-site/src/lib/notifications.ts`)
 * but with admin-specific types (yeni-musteri, yeni-ilan, satis-asama,
 * kontrat, mesaj, sistem) and 10 deterministic seeded mocks instead of 5.
 *
 * Persistence is fully client-side — atolye-admin has no real backend
 * connected to this surface during MVP. Storage is SSR-safe; every accessor
 * guards on `typeof window`.
 *
 * Spec: `docs/superpowers/specs/2026-05-14-wave-f10-admin-core-design.md` §5.
 */

export const ADMIN_NOTIFICATIONS_KEY = 'arsam.admin-notifications.v1'
export const EVENT_ADMIN_NOTIFICATIONS_CHANGED = 'arsam:admin-notifications-changed'

export type AdminNotificationType =
  | 'yeni-musteri'
  | 'yeni-ilan'
  | 'satis-asama'
  | 'kontrat'
  | 'mesaj'
  | 'sistem'

export interface AdminNotification {
  id: string
  type: AdminNotificationType
  title: string
  body: string
  link?: string
  read: boolean
  createdAt: number
}

const ADMIN_NOTIFICATION_TYPES: readonly AdminNotificationType[] = [
  'yeni-musteri',
  'yeni-ilan',
  'satis-asama',
  'kontrat',
  'mesaj',
  'sistem',
]

const SEED_ANCHOR_MS = Date.parse('2026-05-14T12:00:00Z')

function safeWindow(): Window | null {
  return typeof window !== 'undefined' ? window : null
}

function isAdminNotification(v: unknown): v is AdminNotification {
  if (!v || typeof v !== 'object') return false
  const o = v as Record<string, unknown>
  return (
    typeof o.id === 'string' &&
    typeof o.type === 'string' &&
    ADMIN_NOTIFICATION_TYPES.includes(o.type as AdminNotificationType) &&
    typeof o.title === 'string' &&
    typeof o.body === 'string' &&
    typeof o.read === 'boolean' &&
    typeof o.createdAt === 'number' &&
    (o.link === undefined || typeof o.link === 'string')
  )
}

function readRaw(): AdminNotification[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(ADMIN_NOTIFICATIONS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const valid = parsed.filter(isAdminNotification)
    // Dedupe by id — last write wins.
    const seen = new Set<string>()
    const out: AdminNotification[] = []
    for (const n of valid) {
      if (seen.has(n.id)) continue
      seen.add(n.id)
      out.push(n)
    }
    return out
  } catch {
    return []
  }
}

function writeRaw(list: AdminNotification[]): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(ADMIN_NOTIFICATIONS_KEY, JSON.stringify(list))
  } catch {
    /* quota / private-mode — swallow */
  }
  const w = safeWindow()
  if (w) {
    try {
      w.dispatchEvent(
        new CustomEvent(EVENT_ADMIN_NOTIFICATIONS_CHANGED, { detail: list }),
      )
    } catch {
      /* ignore */
    }
  }
}

/** Returns all admin notifications, sorted newest first. */
export function getNotifications(): AdminNotification[] {
  return [...readRaw()].sort((a, b) => b.createdAt - a.createdAt)
}

/** Count of unread admin notifications. */
export function getUnreadCount(): number {
  return readRaw().reduce((acc, n) => acc + (n.read ? 0 : 1), 0)
}

/** Flips read=true on the matching id. No-op if missing or already read. */
export function markAsRead(id: string): void {
  const current = readRaw()
  const idx = current.findIndex((n) => n.id === id)
  if (idx < 0) return
  if (current[idx].read) return
  const next = [
    ...current.slice(0, idx),
    { ...current[idx], read: true },
    ...current.slice(idx + 1),
  ]
  writeRaw(next)
}

/** Flips read=true on every admin notification. */
export function markAllAsRead(): void {
  const current = readRaw()
  if (current.every((n) => n.read)) return
  writeRaw(current.map((n) => ({ ...n, read: true })))
}

/** Bulk flip read=true on a subset of ids. */
export function markManyAsRead(ids: string[]): void {
  if (ids.length === 0) return
  const idSet = new Set(ids)
  const current = readRaw()
  let mutated = false
  const next = current.map((n) => {
    if (!idSet.has(n.id) || n.read) return n
    mutated = true
    return { ...n, read: true }
  })
  if (!mutated) return
  writeRaw(next)
}

/** Hard-deletes a notification by id. */
export function deleteNotification(id: string): void {
  const current = readRaw()
  const next = current.filter((n) => n.id !== id)
  if (next.length === current.length) return
  writeRaw(next)
}

/** Hard-deletes multiple notifications by id. */
export function deleteMany(ids: string[]): void {
  if (ids.length === 0) return
  const idSet = new Set(ids)
  const current = readRaw()
  const next = current.filter((n) => !idSet.has(n.id))
  if (next.length === current.length) return
  writeRaw(next)
}

/**
 * Populates storage with 10 deterministic admin mock notifications if empty.
 *
 * Timestamps are anchored to `SEED_ANCHOR_MS` so ordering is stable across
 * test runs. Each of the 6 admin types appears at least once; mix of read +
 * unread ensures filter chips have content in every state.
 */
export function seedIfEmpty(): void {
  if (readRaw().length > 0) return
  const anchor = SEED_ANCHOR_MS
  const seeded: AdminNotification[] = [
    {
      id: 'adm-ntf-001',
      type: 'yeni-musteri',
      title: 'Yeni müşteri kaydı: Mehmet Yıldız',
      body: 'Sıcak lead — Bodrum bölgesi 1000 m² civarında arsa arıyor.',
      link: '/customers',
      read: false,
      createdAt: anchor - 15 * 60 * 1000,
    },
    {
      id: 'adm-ntf-002',
      type: 'yeni-ilan',
      title: 'Yeni ilan yayınlandı: Çeşme Dalyan',
      body: '1500 m² imar müsait arsa, ekibin yeni paylaştığı portföyde.',
      link: '/listings',
      read: false,
      createdAt: anchor - 2 * 60 * 60 * 1000,
    },
    {
      id: 'adm-ntf-003',
      type: 'satis-asama',
      title: 'Satış aşaması güncellendi: Datça villa arsası',
      body: '"Görüşme" aşamasından "Teklif" aşamasına taşındı.',
      link: '/sales',
      read: false,
      createdAt: anchor - 4 * 60 * 60 * 1000,
    },
    {
      id: 'adm-ntf-004',
      type: 'kontrat',
      title: 'Kontrat imzalandı: Karaburun Çat',
      body: '₺ 4.250.000 değerinde satış sözleşmesi tamamlandı.',
      link: '/sales',
      read: false,
      createdAt: anchor - 6 * 60 * 60 * 1000,
    },
    {
      id: 'adm-ntf-005',
      type: 'mesaj',
      title: 'Yeni mesaj: Ayşe Demir',
      body: 'Bodrum portföyündeki 3 ilan için bilgi talep ediyor.',
      link: '/customers',
      read: false,
      createdAt: anchor - 8 * 60 * 60 * 1000,
    },
    {
      id: 'adm-ntf-006',
      type: 'sistem',
      title: 'Sistem: Yedekleme tamamlandı',
      body: 'Günlük veri yedekleme başarıyla tamamlandı (12.4 MB).',
      read: true,
      createdAt: anchor - 12 * 60 * 60 * 1000,
    },
    {
      id: 'adm-ntf-007',
      type: 'yeni-musteri',
      title: 'Yeni müşteri kaydı: Selin Aydın',
      body: 'Soğuk lead — Datça bölgesi yatırım arsası araştırıyor.',
      link: '/customers',
      read: true,
      createdAt: anchor - 24 * 60 * 60 * 1000,
    },
    {
      id: 'adm-ntf-008',
      type: 'mesaj',
      title: 'Mesaj yanıtı: Ali Kara',
      body: 'Kontrat şartlarına dair sorularına dönüş bekleniyor.',
      link: '/customers',
      read: true,
      createdAt: anchor - 36 * 60 * 60 * 1000,
    },
    {
      id: 'adm-ntf-009',
      type: 'sistem',
      title: 'Sistem: KVKK metni güncellendi',
      body: 'Aydınlatma metni v2.4 yayında — ekibe duyurmayı unutma.',
      read: true,
      createdAt: anchor - 2 * 24 * 60 * 60 * 1000,
    },
    {
      id: 'adm-ntf-010',
      type: 'satis-asama',
      title: 'Satış kaybı: Marmaris Hisarönü',
      body: '"Müzakere" aşamasından "Kayıp" durumuna geçti — rakip ajans kazandı.',
      link: '/sales',
      read: true,
      createdAt: anchor - 3 * 24 * 60 * 60 * 1000,
    },
  ]
  writeRaw(seeded)
}

/** Test-only helper to wipe storage. */
export function clearAllNotifications(): void {
  writeRaw([])
}
