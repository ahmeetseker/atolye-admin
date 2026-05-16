/**
 * F6.C — Saved filter views for admin tables.
 *
 * Persistence: `localStorage` key `arsam.admin-views.v1`. SSR-safe — every
 * accessor guards on `typeof window` so vitest jsdom + Node renders don't
 * explode. Sorted oldest-first on read so list ordering is stable across
 * sessions; dedupe-by-id (last write wins) handles multi-tab races.
 *
 * Sistem default'lar `SYSTEM_VIEWS` map'inde sabit — kullanıcı silemez. URL
 * `params` string'i `URLSearchParams.toString()` çıktısı; `applySavedView`
 * helper'ı page-level history push'a delege eder (component layer'da).
 */

const STORAGE_KEY = 'arsam.admin-views.v1'

export type AdminApp = 'listings' | 'customers'

export interface SavedView {
  id: string
  app: AdminApp
  name: string
  /** URL search params string, e.g. "status=Aktif&search=Bodrum". May be empty. */
  params: string
  createdAt: number
}

export interface SystemView {
  id: string
  name: string
  /** Pre-baked URL params; `''` ⇒ "all / no filter" view. */
  params: string
  /** True when this is the "no filter" default — used for current-view highlighting. */
  isAll?: boolean
}

export const SYSTEM_VIEWS: Record<AdminApp, SystemView[]> = {
  listings: [
    { id: 'sys-tum', name: 'Tümü', params: '', isAll: true },
    { id: 'sys-aktif', name: 'Aktif', params: 'status=Aktif' },
    { id: 'sys-pasif', name: 'Pasif', params: 'status=Pasif' },
    // 'Bu hafta' removed pending @landx/data window filter (F7 follow-up)
  ],
  customers: [
    { id: 'sys-tum', name: 'Tümü', params: '', isAll: true },
    { id: 'sys-sicak', name: 'Sıcak', params: 'segment=Sıcak' },
    // 'Bu hafta' removed pending @landx/data window filter (F7 follow-up)
  ],
}

function safeStorage(): Storage | undefined {
  try {
    if (typeof window === 'undefined') return undefined
    return window.localStorage
  } catch {
    return undefined
  }
}

function readAll(): SavedView[] {
  const storage = safeStorage()
  if (!storage) return []
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    // Dedupe by id — last write wins (later entries in array overwrite earlier).
    const map = new Map<string, SavedView>()
    for (const entry of parsed) {
      if (
        entry &&
        typeof entry.id === 'string' &&
        typeof entry.name === 'string' &&
        typeof entry.params === 'string' &&
        typeof entry.createdAt === 'number' &&
        (entry.app === 'listings' || entry.app === 'customers')
      ) {
        map.set(entry.id, entry as SavedView)
      }
    }
    return Array.from(map.values())
  } catch {
    return []
  }
}

function writeAll(views: SavedView[]): void {
  const storage = safeStorage()
  if (!storage) return
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(views))
  } catch {
    /* quota / private mode — silently no-op so the UI doesn't crash. */
  }
}

export function getSavedViews(app: AdminApp): SavedView[] {
  return readAll()
    .filter((v) => v.app === app)
    .sort((a, b) => a.createdAt - b.createdAt)
}

export function addSavedView(input: {
  app: AdminApp
  name: string
  params: string
}): SavedView {
  const id = `${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`
  const view: SavedView = {
    id,
    app: input.app,
    name: input.name,
    params: input.params,
    createdAt: Date.now(),
  }
  const all = readAll()
  all.push(view)
  writeAll(all)
  return view
}

export function removeSavedView(id: string): void {
  const next = readAll().filter((v) => v.id !== id)
  writeAll(next)
}

/** Helper: are two URL param strings equivalent (order-independent)? */
export function paramsEqual(a: string, b: string): boolean {
  const pa = new URLSearchParams(a)
  const pb = new URLSearchParams(b)
  const ea = Array.from(pa.entries()).sort()
  const eb = Array.from(pb.entries()).sort()
  if (ea.length !== eb.length) return false
  return ea.every(([k, v], i) => eb[i][0] === k && eb[i][1] === v)
}
