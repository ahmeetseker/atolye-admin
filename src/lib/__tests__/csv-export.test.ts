import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { toCsv, downloadCsv } from '@/lib/csv-export'

const BOM = '﻿'

describe('toCsv', () => {
  it('returns header-only line when given empty rows', () => {
    const out = toCsv<{ id: string }>([], [{ key: 'id', label: 'ID' }])
    expect(out).toBe('"ID"')
  })

  it('produces header + rows joined with newlines', () => {
    const rows = [
      { id: 'L-1', title: 'Bodrum arsa' },
      { id: 'L-2', title: 'Çeşme arsa' },
    ]
    const out = toCsv(rows, [
      { key: 'id', label: 'ID' },
      { key: 'title', label: 'Başlık' },
    ])
    expect(out).toBe(
      '"ID","Başlık"\n"L-1","Bodrum arsa"\n"L-2","Çeşme arsa"',
    )
  })

  it('escapes embedded double quotes by doubling them', () => {
    const rows = [{ title: 'Ali "Veli"' }]
    const out = toCsv(rows, [{ key: 'title', label: 'Başlık' }])
    expect(out).toBe('"Başlık"\n"Ali ""Veli"""')
  })

  it('renders null and undefined cells as empty strings', () => {
    type Row = { id: string; tags: string | null; note?: string }
    const rows: Row[] = [
      { id: '1', tags: null },
      { id: '2', tags: 'a', note: undefined },
    ]
    const out = toCsv(rows, [
      { key: 'id', label: 'ID' },
      { key: 'tags', label: 'Tags' },
      { key: 'note', label: 'Note' },
    ])
    expect(out).toBe('"ID","Tags","Note"\n"1","",""\n"2","a",""')
  })

  it('coerces numeric and boolean values via String()', () => {
    type Row = { n: number; b: boolean }
    const out = toCsv<Row>(
      [
        { n: 42, b: true },
        { n: 0, b: false },
      ],
      [
        { key: 'n', label: 'N' },
        { key: 'b', label: 'B' },
      ],
    )
    expect(out).toBe('"N","B"\n"42","true"\n"0","false"')
  })
})

describe('downloadCsv', () => {
  beforeEach(() => {
    // jsdom: stub URL.createObjectURL / revokeObjectURL
    const blobs: Blob[] = []
    ;(globalThis as any).__downloadedBlobs = blobs
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn((b: Blob) => {
        blobs.push(b)
        return 'blob:mock'
      }),
      revokeObjectURL: vi.fn(),
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    delete (globalThis as any).__downloadedBlobs
  })

  it('triggers an anchor click with the right filename and BOM-prefixed content', async () => {
    const click = vi.fn()
    const anchor = { href: '', download: '', click, style: {} as any }
    const create = vi
      .spyOn(document, 'createElement')
      .mockReturnValue(anchor as unknown as HTMLAnchorElement)

    downloadCsv('listings-2026-05-13.csv', '"ID"\n"1"')

    expect(create).toHaveBeenCalledWith('a')
    expect(anchor.download).toBe('listings-2026-05-13.csv')
    expect(click).toHaveBeenCalled()

    // BOM (0xEF 0xBB 0xBF) must prefix the UTF-8 bytes so Excel auto-detects encoding.
    const blobs = (globalThis as any).__downloadedBlobs as Blob[]
    expect(blobs).toHaveLength(1)
    const buf = new Uint8Array(await blobs[0].arrayBuffer())
    expect(buf[0]).toBe(0xef)
    expect(buf[1]).toBe(0xbb)
    expect(buf[2]).toBe(0xbf)
    // Sanity-check: when decoded as text the content starts with the BOM char + header.
    const text = new TextDecoder('utf-8', { ignoreBOM: true }).decode(buf)
    expect(text.startsWith(BOM + '"ID"')).toBe(true)

    create.mockRestore()
  })
})
