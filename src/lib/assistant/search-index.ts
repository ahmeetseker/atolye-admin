import { LISTINGS, CUSTOMERS, DEALS, EVENTS } from '@landx/data'
import type {
  EntityType,
  SearchDoc,
  SearchIndex,
  SearchOptions,
  SearchResult,
} from './types'

const TR = 'tr-TR'

/** Locale-aware Turkish lowercase. */
export function trLower(input: string): string {
  return input.toLocaleLowerCase(TR)
}

/** Split a string into lower-cased tokens (split on non-alphanumeric, drop empties). */
export function tokenize(input: string): string[] {
  const lowered = trLower(input)
  const parts = lowered.split(/[^\p{L}\p{N}]+/u)
  const out: string[] = []
  for (const p of parts) {
    if (p.length === 0) continue
    out.push(p)
  }
  return out
}

function pushTokens(target: Set<string>, ...sources: Array<string | undefined>) {
  for (const s of sources) {
    if (!s) continue
    for (const t of tokenize(s)) target.add(t)
  }
}

/**
 * Build an in-memory search index over LISTINGS, CUSTOMERS, DEALS, EVENTS.
 * Pure function — no React, no DOM. Call once and memoize.
 */
export function buildIndex(): SearchIndex {
  const docs: SearchDoc[] = []

  for (const l of LISTINGS) {
    const titleTokens = new Set<string>()
    pushTokens(titleTokens, l.title)
    const tagTokens = new Set<string>()
    pushTokens(tagTokens, l.city, l.district, l.type, ...(l.tags ?? []))
    const haystack = trLower(
      [l.id, l.title, l.city, l.district, l.type, ...(l.tags ?? [])].join(' '),
    )
    docs.push({
      type: 'listing',
      id: l.id,
      label: l.title,
      sublabel: `${l.district} · ${l.type}`,
      href: '/listings',
      titleTokens: Array.from(titleTokens),
      tagTokens: Array.from(tagTokens),
      haystack,
      idLower: trLower(l.id),
    })
  }

  for (const c of CUSTOMERS) {
    const titleTokens = new Set<string>()
    pushTokens(titleTokens, c.name)
    const tagTokens = new Set<string>()
    pushTokens(tagTokens, c.segment, c.stage, c.owner, c.interestArea, c.source)
    const haystack = trLower(
      [c.id, c.name, c.segment, c.stage, c.owner, c.interestArea, c.source].join(' '),
    )
    docs.push({
      type: 'customer',
      id: c.id,
      label: c.name,
      sublabel: `${c.segment} · ${c.stage} · ${c.owner}`,
      href: '/customers',
      titleTokens: Array.from(titleTokens),
      tagTokens: Array.from(tagTokens),
      haystack,
      idLower: trLower(c.id),
    })
  }

  for (const d of DEALS) {
    const titleTokens = new Set<string>()
    pushTokens(titleTokens, d.customerName, d.listingTitle)
    const tagTokens = new Set<string>()
    pushTokens(tagTokens, d.stage, d.status, d.owner)
    const haystack = trLower(
      [
        d.id,
        d.customerId,
        d.customerName,
        d.listingId,
        d.listingTitle,
        d.stage,
        d.status,
        d.owner,
      ].join(' '),
    )
    docs.push({
      type: 'deal',
      id: d.id,
      label: `${d.customerName} → ${d.listingTitle}`,
      sublabel: `${d.stage} · ${d.status} · ${d.owner}`,
      href: '/sales',
      titleTokens: Array.from(titleTokens),
      tagTokens: Array.from(tagTokens),
      haystack,
      idLower: trLower(d.id),
    })
  }

  for (const e of EVENTS) {
    const titleTokens = new Set<string>()
    pushTokens(titleTokens, e.title)
    const tagTokens = new Set<string>()
    pushTokens(tagTokens, e.type, e.owner, e.location, e.customerName)
    const haystack = trLower(
      [
        e.id,
        e.title,
        e.type,
        e.owner,
        e.location ?? '',
        e.customerName ?? '',
      ].join(' '),
    )
    const dateLabel = new Date(e.date).toLocaleDateString(TR, {
      day: '2-digit',
      month: 'short',
    })
    docs.push({
      type: 'event',
      id: e.id,
      label: e.title,
      sublabel: `${dateLabel}${e.time ? ' · ' + e.time : ''} · ${e.owner}`,
      href: '/calendar',
      titleTokens: Array.from(titleTokens),
      tagTokens: Array.from(tagTokens),
      haystack,
      idLower: trLower(e.id),
    })
  }

  return { docs, builtAt: Date.now() }
}

const TITLE_BOOST = 3
const ID_PREFIX_BOOST = 5
const TAG_BOOST = 1.5

function scoreDoc(doc: SearchDoc, qLower: string, qTokens: string[]): number {
  let score = 0

  // ID prefix match — strongest signal.
  if (qLower.length > 0 && doc.idLower.startsWith(qLower)) {
    score += ID_PREFIX_BOOST
  } else if (qLower.length >= 2 && doc.idLower.includes(qLower)) {
    // weaker boost for substring id match
    score += 2
  }

  // Title (label) token match.
  for (const qt of qTokens) {
    if (qt.length === 0) continue
    let titleHit = false
    for (const tt of doc.titleTokens) {
      if (tt === qt) {
        score += TITLE_BOOST * 1.5
        titleHit = true
        break
      } else if (tt.startsWith(qt) || tt.includes(qt)) {
        score += TITLE_BOOST
        titleHit = true
        break
      }
    }
    if (titleHit) continue
    // Tag/secondary token match.
    let tagHit = false
    for (const tt of doc.tagTokens) {
      if (tt === qt) {
        score += TAG_BOOST * 1.4
        tagHit = true
        break
      } else if (tt.startsWith(qt) || tt.includes(qt)) {
        score += TAG_BOOST
        tagHit = true
        break
      }
    }
    if (tagHit) continue
    // Fallback haystack substring (cheapest signal). Min 3 chars to avoid noise.
    if (qt.length >= 3 && doc.haystack.includes(qt)) {
      score += 0.5
    }
  }

  // Whole-query substring boost (cross-token phrase like "burhan kaynak").
  if (qLower.length >= 3 && doc.haystack.includes(qLower)) {
    score += 1.2
  }

  return score
}

/**
 * Search the index. Threshold filter at score > 0. Sorted desc by score, then label.
 */
export function search(
  idx: SearchIndex,
  query: string,
  opts: SearchOptions = {},
): SearchResult[] {
  const q = query.trim()
  if (!q) return []
  const qLower = trLower(q)
  const qTokens = tokenize(q)
  const limit = Math.max(1, opts.limit ?? 12)
  const filter = opts.entities && opts.entities.length > 0
    ? new Set<EntityType>(opts.entities)
    : null

  const results: SearchResult[] = []
  for (const doc of idx.docs) {
    if (filter && !filter.has(doc.type)) continue
    const s = scoreDoc(doc, qLower, qTokens)
    if (s <= 0) continue
    results.push({
      type: doc.type,
      id: doc.id,
      label: doc.label,
      sublabel: doc.sublabel,
      href: doc.href,
      score: s,
    })
  }

  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return a.label.localeCompare(b.label, TR)
  })

  return results.slice(0, limit)
}

// ── Recent searches (last 5, dedupe — newest first) ─────────────────────────

export const RECENT_KEY = 'arsam.admin.recent.v1'
const RECENT_LIMIT = 5

export function loadRecent(storage: Storage | undefined = safeStorage()): string[] {
  if (!storage) return []
  try {
    const raw = storage.getItem(RECENT_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((x): x is string => typeof x === 'string').slice(0, RECENT_LIMIT)
  } catch {
    return []
  }
}

export function addRecent(
  query: string,
  current: string[] = loadRecent(),
  storage: Storage | undefined = safeStorage(),
): string[] {
  const q = query.trim()
  if (!q) return current
  const qLower = trLower(q)
  const deduped = current.filter((x) => trLower(x) !== qLower)
  const next = [q, ...deduped].slice(0, RECENT_LIMIT)
  if (storage) {
    try {
      storage.setItem(RECENT_KEY, JSON.stringify(next))
    } catch {
      /* quota/security — non-fatal */
    }
  }
  return next
}

export function clearRecent(storage: Storage | undefined = safeStorage()): void {
  if (!storage) return
  try {
    storage.removeItem(RECENT_KEY)
  } catch {
    /* non-fatal */
  }
}

function safeStorage(): Storage | undefined {
  try {
    if (typeof window === 'undefined') return undefined
    return window.localStorage
  } catch {
    return undefined
  }
}
