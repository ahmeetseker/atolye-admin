/**
 * admin-photos — ObjectURL lifecycle helpers for the /listings/new
 * photo upload step (Wave F10.A).
 *
 * Why this file exists separately from the FotoUpload component:
 *   1. **Pure & testable.** `URL.createObjectURL` is the only side-effecting
 *      call here; we centralise it so component code can stay declarative.
 *   2. **No localStorage.** Blob URLs MUST stay in-memory. Persisting them to
 *      any `arsam.admin-*.v1` store would burst the 5 MB quota and crash in
 *      Safari private mode. Wizard form state holds *metadata only*
 *      (`{ id, name, size }`); the URLs are recreated on each session mount.
 *   3. **Validation is decoupled.** Both Drag-Drop and file-picker code paths
 *      reuse `validatePhotoFile` so the size/type rule lives in one place.
 *
 * Mirrors apps/public-site/src/lib/foto-objects.ts (F6.A). The admin variant
 * is TR-only (no locale arg), so message lookup happens in the component.
 */

/** Hard cap — matches FotoUpload's max grid size + spec §4. */
export const MAX_PHOTOS = 8

/** 5 MB per photo — client-side guard, NOT a security boundary. */
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024

/**
 * In-memory photo entry surfaced to the FotoUpload grid. Only `{ id, name,
 * size }` is sent upward via `toPhotoMeta` for form-state persistence; `url`
 * is regenerated on each mount.
 */
export interface PhotoEntry {
  /** Stable per-session id — survives reorder, used as React key. */
  id: string
  /** `blob:` URL produced by URL.createObjectURL. Empty when restored from metadata. */
  url: string
  /** Original filename — shown in alt text + preview fallback caption. */
  name: string
  /** Bytes — used to drive the "Foto · 2.3 MB" metadata fallback. */
  size: number
}

/**
 * Persisted metadata snapshot. The wizard form keeps this subset so reload
 * can re-render thumbnails (with empty URLs) after a refresh round trip.
 */
export interface PhotoMeta {
  id: string
  name: string
  size: number
}

let idCounter = 0

/** Stable id generator. crypto.randomUUID is preferred when present. */
function nextId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  idCounter += 1
  return `photo-${Date.now().toString(36)}-${idCounter}`
}

/**
 * Build a PhotoEntry from a browser `File`. Caller is responsible for
 * eventually invoking `revokePhoto` / `revokeAll` when the entry leaves state.
 */
export function createPhotoEntry(file: File): PhotoEntry {
  const url =
    typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function'
      ? URL.createObjectURL(file)
      : ''
  return {
    id: nextId(),
    url,
    name: file.name,
    size: file.size,
  }
}

/** Release the ObjectURL backing a single entry. Safe to call multiple times. */
export function revokePhoto(entry: Pick<PhotoEntry, 'url'>): void {
  if (!entry.url) return
  if (typeof URL === 'undefined' || typeof URL.revokeObjectURL !== 'function') return
  try {
    URL.revokeObjectURL(entry.url)
  } catch {
    /* ignore — already revoked */
  }
}

/** Convenience wrapper — revokes every entry in the array. */
export function revokeAll(entries: ReadonlyArray<Pick<PhotoEntry, 'url'>>): void {
  for (const e of entries) revokePhoto(e)
}

/** Reduce a PhotoEntry array down to the metadata persisted in the wizard. */
export function toPhotoMeta(entries: ReadonlyArray<PhotoEntry>): PhotoMeta[] {
  return entries.map((e) => ({ id: e.id, name: e.name, size: e.size }))
}

/**
 * Validate a single File. Returns a stable error code or `null` when the file
 * is acceptable. Component code resolves the (TR-only) message.
 */
export type PhotoValidationError = 'type' | 'size'

export function validatePhotoFile(file: File): PhotoValidationError | null {
  if (!file.type.startsWith('image/')) return 'type'
  if (file.size > MAX_PHOTO_BYTES) return 'size'
  return null
}
