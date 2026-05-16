import { describe, it, expect } from 'vitest'
import {
  LISTING_FIELDS,
  CUSTOMER_FIELDS,
  autoMapColumns,
  validateRow,
  projectRow,
  normalizeHeader,
} from '@/lib/import-schema'

describe('normalizeHeader', () => {
  it('lowercases + folds Turkish diacritics', () => {
    expect(normalizeHeader('Şehir')).toBe('sehir')
    expect(normalizeHeader('İlçe')).toBe('ilce')
    expect(normalizeHeader('  Başlık  ')).toBe('baslik')
    expect(normalizeHeader('Müşteri')).toBe('musteri')
  })

  it('passes through ASCII unchanged', () => {
    expect(normalizeHeader('price')).toBe('price')
    expect(normalizeHeader('Email')).toBe('email')
  })
})

describe('autoMapColumns — listings', () => {
  it('maps Turkish headers to listing field ids', () => {
    const headers = ['Başlık', 'İl', 'İlçe', 'Tür', 'Alan', 'Fiyat']
    const map = autoMapColumns(headers, LISTING_FIELDS)
    expect(map).toEqual({
      '0': 'title',
      '1': 'city',
      '2': 'district',
      '3': 'type',
      '4': 'size',
      '5': 'price',
    })
  })

  it('maps English headers to listing field ids', () => {
    const headers = ['title', 'city', 'district', 'size', 'price']
    const map = autoMapColumns(headers, LISTING_FIELDS)
    expect(map['0']).toBe('title')
    expect(map['1']).toBe('city')
    expect(map['4']).toBe('price')
  })

  it('leaves unrecognised headers unmapped', () => {
    const headers = ['Başlık', 'kolon-x', 'Fiyat']
    const map = autoMapColumns(headers, LISTING_FIELDS)
    expect(map['0']).toBe('title')
    expect(map['1']).toBeUndefined()
    expect(map['2']).toBe('price')
  })

  it('matches m² / metrekare aliases for size', () => {
    expect(autoMapColumns(['m²'], LISTING_FIELDS)['0']).toBe('size')
    expect(autoMapColumns(['metrekare'], LISTING_FIELDS)['0']).toBe('size')
  })
})

describe('autoMapColumns — customers', () => {
  it('maps customer headers with TR diacritics', () => {
    const headers = ['Ad Soyad', 'Segment', 'Telefon', 'E-posta', 'Notlar']
    const map = autoMapColumns(headers, CUSTOMER_FIELDS)
    expect(map['0']).toBe('name')
    expect(map['1']).toBe('segment')
    expect(map['2']).toBe('phone')
    expect(map['3']).toBe('email')
    expect(map['4']).toBe('notes')
  })
})

describe('validateRow — listings', () => {
  const mapping = autoMapColumns(['Başlık', 'İl', 'İlçe', 'Alan', 'Fiyat'], LISTING_FIELDS)

  it('returns no issues for a clean row', () => {
    const { issues } = validateRow(
      ['Cunda Bahçeli', 'Balıkesir', 'Ayvalık', '1200', '4500000'],
      mapping,
      LISTING_FIELDS,
    )
    expect(issues).toEqual([])
  })

  it('reports required-but-empty fields', () => {
    const { issues } = validateRow(['', 'Balıkesir', 'Ayvalık', '1200', '4500000'], mapping, LISTING_FIELDS)
    expect(issues).toHaveLength(1)
    expect(issues[0].field).toBe('Başlık')
    expect(issues[0].message).toMatch(/zorunlu/i)
  })

  it('reports non-numeric price', () => {
    const { issues } = validateRow(['Cunda', 'Balıkesir', 'Ayvalık', '1200', 'pahalı'], mapping, LISTING_FIELDS)
    expect(issues.some((i) => i.field === 'Fiyat (TL)')).toBe(true)
  })

  it('accepts TR-formatted price with thousands separator', () => {
    const { issues } = validateRow(
      ['Cunda', 'Balıkesir', 'Ayvalık', '1200', '4.500.000'],
      mapping,
      LISTING_FIELDS,
    )
    expect(issues).toEqual([])
  })
})

describe('validateRow — customers', () => {
  const mapping = autoMapColumns(['Ad Soyad', 'Segment', 'E-posta'], CUSTOMER_FIELDS)

  it('passes a clean customer row', () => {
    const { issues } = validateRow(['Ahmet Yılmaz', 'Sıcak', 'ahmet@ornek.com'], mapping, CUSTOMER_FIELDS)
    expect(issues).toEqual([])
  })

  it('rejects unknown segment value', () => {
    const { issues } = validateRow(['Ahmet', 'X', 'ahmet@ornek.com'], mapping, CUSTOMER_FIELDS)
    expect(issues.some((i) => i.field === 'Segment')).toBe(true)
  })

  it('rejects malformed e-mail', () => {
    const { issues } = validateRow(['Ahmet', 'Sıcak', 'not-an-email'], mapping, CUSTOMER_FIELDS)
    expect(issues.some((i) => i.field === 'E-posta')).toBe(true)
  })

  it('skips e-mail validation when cell is empty (optional field)', () => {
    const { issues } = validateRow(['Ahmet', 'Sıcak', ''], mapping, CUSTOMER_FIELDS)
    expect(issues).toEqual([])
  })
})

describe('projectRow', () => {
  it('coerces numeric strings to numbers', () => {
    const mapping = { '0': 'title', '1': 'city', '2': 'district', '3': 'size', '4': 'price' }
    const out = projectRow(['Cunda', 'Balıkesir', 'Ayvalık', '1200', '4.500.000'], mapping, LISTING_FIELDS)
    expect(out).toEqual({
      title: 'Cunda',
      city: 'Balıkesir',
      district: 'Ayvalık',
      size: 1200,
      price: 4500000,
    })
  })

  it('splits the tags column on comma/semicolon/pipe', () => {
    const mapping = { '0': 'title', '1': 'city', '2': 'district', '3': 'size', '4': 'price', '5': 'tags' }
    const out = projectRow(
      ['A', 'B', 'C', '100', '1000', 'sıcak, deniz | yatırım'],
      mapping,
      LISTING_FIELDS,
    )
    expect(out.tags).toEqual(['sıcak', 'deniz', 'yatırım'])
  })

  it('drops empty optional cells', () => {
    const mapping = { '0': 'name', '1': 'segment', '2': 'email' }
    const out = projectRow(['Ahmet', 'Sıcak', ''], mapping, CUSTOMER_FIELDS)
    expect(out).toEqual({ name: 'Ahmet', segment: 'Sıcak' })
    expect('email' in out).toBe(false)
  })
})
