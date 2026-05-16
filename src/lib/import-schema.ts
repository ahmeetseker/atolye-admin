/**
 * Wave F18.C — Entity field schema for the CSV import wizard.
 *
 * Each entity (`listing`, `customer`) exposes a frozen field list. The wizard
 * uses this list to:
 *   - Drive Step 3's column → field dropdowns
 *   - Auto-detect a sensible initial mapping from CSV headers (Turkish + English
 *     aliases, lowercase + diacritic-insensitive match)
 *   - Validate each row in Step 4 (required + per-field validator)
 *
 * Keep the schema dependency-free and small enough to live inside the route
 * lazy chunk — no @landx/data or runtime regex compilers; everything is
 * declarative.
 */

export type ImportEntity = 'listing' | 'customer'

export interface ImportField {
  /** Entity field name (matches the @landx/data input shape, e.g. `title`, `price`). */
  id: string
  /** Turkish label shown in the wizard. */
  label: string
  /** Required fields must have a mapped, non-empty value in every row. */
  required: boolean
  /**
   * Optional per-field validator.
   * Return `null` when the value is OK; return a Turkish error message string
   * otherwise. Empty strings on optional fields skip validation.
   */
  validator?: (value: string) => string | null
  /**
   * Alternative CSV header spellings that should auto-map to this field
   * (lowercase, diacritic-folded). The entity field id is always included as
   * the first alias implicitly.
   */
  aliases?: string[]
}

const NUMERIC = (v: string): string | null => {
  const cleaned = v.replace(/[\s,₺.]/g, (m) => (m === '.' ? '' : m === ',' ? '.' : ''))
  return /^-?\d+(\.\d+)?$/.test(cleaned) ? null : 'Sayısal olmalı'
}

const POSITIVE_NUMBER = (v: string): string | null => {
  const err = NUMERIC(v)
  if (err) return err
  const cleaned = v.replace(/[\s,₺]/g, '').replace(/\./g, '').replace(/,/g, '.')
  return Number(cleaned) > 0 ? null : 'Sıfırdan büyük olmalı'
}

const EMAIL = (v: string): string | null => {
  if (!v) return null
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v) ? null : 'E-posta formatı hatalı'
}

const ONE_OF =
  (allowed: ReadonlyArray<string>, message?: string) =>
  (v: string): string | null => {
    if (!v) return null
    return allowed.includes(v) ? null : message ?? `Geçerli değer: ${allowed.join(' / ')}`
  }

export const LISTING_FIELDS: ReadonlyArray<ImportField> = [
  {
    id: 'title',
    label: 'Başlık',
    required: true,
    aliases: ['title', 'baslik', 'başlık', 'ad', 'isim'],
  },
  {
    id: 'city',
    label: 'İl',
    required: true,
    aliases: ['city', 'il', 'şehir', 'sehir', 'province'],
  },
  {
    id: 'district',
    label: 'İlçe',
    required: true,
    aliases: ['district', 'ilce', 'ilçe', 'county'],
  },
  {
    id: 'type',
    label: 'Tür',
    required: false,
    validator: ONE_OF(['İmarlı', 'Tarla', 'Zeytinlik', 'Villa Arsası']),
    aliases: ['type', 'tur', 'tür', 'kategori', 'category'],
  },
  {
    id: 'size',
    label: 'Alan (m²)',
    required: true,
    validator: POSITIVE_NUMBER,
    aliases: ['size', 'alan', 'metrekare', 'm2', 'm²', 'area'],
  },
  {
    id: 'price',
    label: 'Fiyat (TL)',
    required: true,
    validator: POSITIVE_NUMBER,
    aliases: ['price', 'fiyat', 'tl', 'tutar', 'amount'],
  },
  {
    id: 'status',
    label: 'Durum',
    required: false,
    validator: ONE_OF(['Aktif', 'Pasif', 'Taslak']),
    aliases: ['status', 'durum', 'state'],
  },
  {
    id: 'tags',
    label: 'Etiketler (virgüllü)',
    required: false,
    aliases: ['tags', 'etiket', 'etiketler', 'labels'],
  },
]

export const CUSTOMER_FIELDS: ReadonlyArray<ImportField> = [
  {
    id: 'name',
    label: 'Ad Soyad',
    required: true,
    aliases: ['name', 'isim', 'ad soyad', 'müşteri', 'musteri', 'ad'],
  },
  {
    id: 'segment',
    label: 'Segment',
    required: false,
    validator: ONE_OF(['Sıcak', 'Ilık', 'Soğuk'], 'Sıcak / Ilık / Soğuk olmalı'),
    aliases: ['segment', 'seviye'],
  },
  {
    id: 'stage',
    label: 'Aşama',
    required: false,
    validator: ONE_OF(['İlk temas', 'Görüşme', 'Teklif', 'Kaparo', 'Tapu']),
    aliases: ['stage', 'aşama', 'asama'],
  },
  {
    id: 'value',
    label: 'Değer (TL)',
    required: false,
    validator: (v) => (v ? NUMERIC(v) : null),
    aliases: ['value', 'deger', 'değer', 'tutar'],
  },
  {
    id: 'source',
    label: 'Kaynak',
    required: false,
    validator: ONE_OF(['Sahibinden', 'Hürriyet Emlak', 'Referans', 'Sosyal Medya', 'Walk-in']),
    aliases: ['source', 'kaynak'],
  },
  {
    id: 'owner',
    label: 'Sorumlu',
    required: false,
    aliases: ['owner', 'sorumlu', 'temsilci'],
  },
  {
    id: 'interestArea',
    label: 'İlgi Alanı',
    required: false,
    aliases: ['interestarea', 'ilgi alanı', 'ilgi alani', 'ilgi', 'bölge', 'bolge'],
  },
  {
    id: 'phone',
    label: 'Telefon',
    required: false,
    aliases: ['phone', 'telefon', 'tel', 'gsm', 'cep'],
  },
  {
    id: 'email',
    label: 'E-posta',
    required: false,
    validator: EMAIL,
    aliases: ['email', 'eposta', 'e-posta', 'mail'],
  },
  {
    id: 'notes',
    label: 'Notlar',
    required: false,
    aliases: ['notes', 'not', 'notlar', 'note', 'aciklama', 'açıklama'],
  },
]

export function getFieldsForEntity(entity: ImportEntity): ReadonlyArray<ImportField> {
  return entity === 'listing' ? LISTING_FIELDS : CUSTOMER_FIELDS
}

/**
 * Diacritic-folded lowercase form for alias matching. Turkish letters fold to
 * their ASCII counterparts so "Şehir" matches "sehir" and vice versa.
 */
export function normalizeHeader(raw: string): string {
  return raw
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/[şŞ]/g, 's')
    .replace(/[ğĞ]/g, 'g')
    .replace(/[üÜ]/g, 'u')
    .replace(/[öÖ]/g, 'o')
    .replace(/[çÇ]/g, 'c')
    .replace(/[İI]/g, 'i')
    .trim()
}

/**
 * Best-effort header → field id auto-mapping.
 *
 * @returns Record keyed by **column index as string** (`"0"`, `"1"`, …) →
 *   entity field id. Missing entries mean the column is unmapped. Multiple
 *   columns can map to the same field; the LAST occurrence wins.
 */
export function autoMapColumns(
  csvHeaders: ReadonlyArray<string>,
  fields: ReadonlyArray<ImportField>,
): Record<string, string> {
  const mapping: Record<string, string> = {}
  csvHeaders.forEach((header, index) => {
    const norm = normalizeHeader(header)
    if (!norm) return
    for (const field of fields) {
      const candidates = [field.id, ...(field.aliases ?? [])]
      if (candidates.some((c) => normalizeHeader(c) === norm)) {
        mapping[String(index)] = field.id
        return
      }
    }
  })
  return mapping
}

export interface RowValidationIssue {
  field: string
  message: string
}

/**
 * Validate a single row against the mapping + entity field list.
 *
 * @param row String cells from the CSV (positional).
 * @param mapping Column-index-string → field-id (output of `autoMapColumns`,
 *   optionally edited by the user in Step 3).
 * @param fields The entity's field list (LISTING_FIELDS / CUSTOMER_FIELDS).
 * @returns Empty `issues` means the row is clean. Required-but-missing fields
 *   are reported with message "Zorunlu alan boş".
 */
export function validateRow(
  row: ReadonlyArray<string>,
  mapping: Readonly<Record<string, string>>,
  fields: ReadonlyArray<ImportField>,
): { issues: RowValidationIssue[] } {
  const issues: RowValidationIssue[] = []
  // Build field-id → cell-value lookup.
  const values: Record<string, string> = {}
  for (const [colIdx, fieldId] of Object.entries(mapping)) {
    const cell = row[Number(colIdx)] ?? ''
    // If multiple columns map to the same field, the later one overwrites —
    // matches autoMapColumns "last wins" semantics.
    values[fieldId] = cell.trim()
  }
  for (const field of fields) {
    const value = values[field.id] ?? ''
    if (field.required && !value) {
      issues.push({ field: field.label, message: 'Zorunlu alan boş' })
      continue
    }
    if (field.validator) {
      const err = field.validator(value)
      if (err) issues.push({ field: field.label, message: err })
    }
  }
  return { issues }
}

/**
 * Coerce a validated row into the entity input shape consumed by
 * `useCreateListing` / `useCreateCustomer`. Missing optional values are
 * dropped; numeric fields are parsed.
 *
 * Caller is responsible for skipping rows that have validation issues.
 */
export function projectRow(
  row: ReadonlyArray<string>,
  mapping: Readonly<Record<string, string>>,
  fields: ReadonlyArray<ImportField>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const field of fields) {
    const colIdx = Object.entries(mapping).find(([, id]) => id === field.id)?.[0]
    if (colIdx == null) continue
    const raw = (row[Number(colIdx)] ?? '').trim()
    if (!raw) continue
    if (field.id === 'size' || field.id === 'price' || field.id === 'value') {
      const cleaned = raw.replace(/[\s₺]/g, '').replace(/\./g, '').replace(/,/g, '.')
      const n = Number(cleaned)
      if (Number.isFinite(n)) out[field.id] = n
    } else if (field.id === 'tags') {
      out[field.id] = raw
        .split(/[,;|]/)
        .map((s) => s.trim())
        .filter(Boolean)
    } else {
      out[field.id] = raw
    }
  }
  return out
}
