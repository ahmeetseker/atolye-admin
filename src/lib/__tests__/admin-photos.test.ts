/**
 * admin-photos — Wave F10.A
 *
 * ObjectURL lifecycle + validation for /listings/new photo upload.
 * Mirrors apps/public-site/src/lib/__tests__/foto-objects.test.ts patterns,
 * adapted for admin (no locale, TR-only).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  createPhotoEntry,
  revokePhoto,
  revokeAll,
  validatePhotoFile,
  toPhotoMeta,
  MAX_PHOTOS,
  MAX_PHOTO_BYTES,
  type PhotoEntry,
} from '@/lib/admin-photos'

/**
 * Stub URL.createObjectURL / revokeObjectURL — jsdom 29 exposes them but the
 * default implementation is no-op-ish; we want call observation.
 */
let createSpy: ReturnType<typeof vi.fn>
let revokeSpy: ReturnType<typeof vi.fn>
let originalCreate: typeof URL.createObjectURL | undefined
let originalRevoke: typeof URL.revokeObjectURL | undefined

beforeEach(() => {
  originalCreate = URL.createObjectURL
  originalRevoke = URL.revokeObjectURL
  let counter = 0
  createSpy = vi.fn(() => `blob:mock://obj-${++counter}`)
  revokeSpy = vi.fn()
  ;(URL as any).createObjectURL = createSpy
  ;(URL as any).revokeObjectURL = revokeSpy
})

afterEach(() => {
  ;(URL as any).createObjectURL = originalCreate as any
  ;(URL as any).revokeObjectURL = originalRevoke as any
})

function makeFile(name: string, size: number, type = 'image/png'): File {
  // File reads its own size from the blob parts at construction; we can't
  // override the underlying blob's size, so we mutate the File's size prop
  // directly after construction (jsdom allows the redefine).
  const file = new File([new Uint8Array(0)], name, { type })
  Object.defineProperty(file, 'size', { value: size, configurable: true })
  return file
}

describe('admin-photos', () => {
  it('createPhotoEntry produces a stable id, blob url, and copies name/size', () => {
    const f = makeFile('arsa-front.png', 1024 * 200)
    const entry = createPhotoEntry(f)
    expect(entry.id).toMatch(/.+/) // non-empty
    expect(entry.url).toMatch(/^blob:mock:\/\//)
    expect(entry.name).toBe('arsa-front.png')
    expect(entry.size).toBe(1024 * 200)
    expect(createSpy).toHaveBeenCalledTimes(1)
  })

  it('revokePhoto calls URL.revokeObjectURL exactly once per non-empty url', () => {
    const f = makeFile('a.png', 1024)
    const entry = createPhotoEntry(f)
    revokePhoto(entry)
    expect(revokeSpy).toHaveBeenCalledTimes(1)
    expect(revokeSpy).toHaveBeenCalledWith(entry.url)
    // Empty url short-circuits.
    revokeSpy.mockClear()
    revokePhoto({ url: '' })
    expect(revokeSpy).not.toHaveBeenCalled()
  })

  it('revokeAll releases every entry url and is safe for empty arrays', () => {
    const entries: PhotoEntry[] = [
      createPhotoEntry(makeFile('a.png', 1024)),
      createPhotoEntry(makeFile('b.png', 2048)),
      createPhotoEntry(makeFile('c.png', 4096)),
    ]
    revokeAll(entries)
    expect(revokeSpy).toHaveBeenCalledTimes(3)
    revokeSpy.mockClear()
    revokeAll([])
    expect(revokeSpy).not.toHaveBeenCalled()
  })

  it('validatePhotoFile returns "size" when file exceeds MAX_PHOTO_BYTES', () => {
    const tooBig = makeFile('huge.png', MAX_PHOTO_BYTES + 1)
    expect(validatePhotoFile(tooBig)).toBe('size')
    const okSize = makeFile('ok.png', MAX_PHOTO_BYTES - 1)
    expect(validatePhotoFile(okSize)).toBeNull()
  })

  it('validatePhotoFile returns "type" for non-image mime and accepts image/*', () => {
    const pdf = makeFile('plan.pdf', 1024, 'application/pdf')
    expect(validatePhotoFile(pdf)).toBe('type')
    const png = makeFile('foto.png', 1024, 'image/png')
    expect(validatePhotoFile(png)).toBeNull()
    const webp = makeFile('foto.webp', 1024, 'image/webp')
    expect(validatePhotoFile(webp)).toBeNull()
  })

  it('toPhotoMeta strips url and keeps id/name/size (persistable subset)', () => {
    const entries: PhotoEntry[] = [
      createPhotoEntry(makeFile('a.png', 100)),
      createPhotoEntry(makeFile('b.png', 200)),
    ]
    const meta = toPhotoMeta(entries)
    expect(meta).toHaveLength(2)
    expect(meta[0]).toEqual({ id: entries[0].id, name: 'a.png', size: 100 })
    expect((meta[0] as any).url).toBeUndefined()
  })

  it('exports constants MAX_PHOTOS=8 and MAX_PHOTO_BYTES=5 MB', () => {
    expect(MAX_PHOTOS).toBe(8)
    expect(MAX_PHOTO_BYTES).toBe(5 * 1024 * 1024)
  })
})
