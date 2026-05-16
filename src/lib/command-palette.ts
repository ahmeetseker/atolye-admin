import {
  Building2,
  Calendar as CalendarIcon,
  Coins,
  Home,
  LayoutDashboard,
  Mail,
  MessageSquare,
  Moon,
  Plus,
  Settings as SettingsIcon,
  User,
  UserPlus,
  Users,
  type LucideIcon,
} from '@landx/icons'
import { LISTINGS, CUSTOMERS, TRANSACTIONS, EVENTS } from '@landx/data'

export type PaletteItemType =
  | 'action'
  | 'page'
  | 'listing'
  | 'customer'
  | 'transaction'
  | 'event'

export interface PaletteItem {
  id: string
  type: PaletteItemType
  label: string
  hint?: string
  shortcut?: string
  Icon: LucideIcon
  to?: string
  action?: () => void
}

export const RECENT_STORAGE_KEY = 'arsam.command-palette.recent.v1'
const RECENT_LIMIT = 5

export const ACTIONS: ReadonlyArray<PaletteItem> = [
  {
    id: 'new-listing',
    type: 'action',
    label: 'Yeni ilan oluştur',
    hint: 'İlanlar · Yeni',
    to: '/listings/new',
    Icon: Plus,
  },
  {
    id: 'new-customer',
    type: 'action',
    label: 'Yeni müşteri ekle',
    hint: 'Müşteriler · Yeni',
    to: '/customers/new',
    Icon: UserPlus,
  },
  {
    id: 'open-search',
    type: 'action',
    label: 'Gelişmiş arama',
    hint: 'Tam sayfa arama',
    to: '/search',
    Icon: Mail,
  },
  {
    id: 'open-profile',
    type: 'action',
    label: 'Profil ayarları',
    to: '/profile',
    Icon: User,
  },
  {
    id: 'open-settings',
    type: 'action',
    label: 'Ayarlar',
    to: '/settings',
    Icon: SettingsIcon,
  },
  {
    id: 'open-theme',
    type: 'action',
    label: 'Tema değiştir',
    hint: 'Ayarlar · Görünüm',
    to: '/settings#appearance',
    Icon: Moon,
  },
]

export const PAGES: ReadonlyArray<PaletteItem> = [
  { id: 'page-home', type: 'page', label: 'Anasayfa', to: '/', shortcut: 'g h', Icon: Home },
  {
    id: 'page-listings',
    type: 'page',
    label: 'İlanlar',
    to: '/listings',
    shortcut: 'g l',
    Icon: Building2,
  },
  {
    id: 'page-customers',
    type: 'page',
    label: 'Müşteriler',
    to: '/customers',
    shortcut: 'g c',
    Icon: Users,
  },
  {
    id: 'page-sales',
    type: 'page',
    label: 'Satış',
    to: '/sales',
    shortcut: 'g s',
    Icon: Coins,
  },
  {
    id: 'page-finance',
    type: 'page',
    label: 'Finans',
    to: '/finance',
    Icon: Coins,
  },
  {
    id: 'page-reports',
    type: 'page',
    label: 'Raporlar',
    to: '/reports',
    shortcut: 'g r',
    Icon: LayoutDashboard,
  },
  {
    id: 'page-calendar',
    type: 'page',
    label: 'Takvim',
    to: '/calendar',
    shortcut: 'g k',
    Icon: CalendarIcon,
  },
  {
    id: 'page-messages',
    type: 'page',
    label: 'Mesajlar',
    to: '/messages',
    shortcut: 'g m',
    Icon: MessageSquare,
  },
]

function includesCI(haystack: string, needle: string): boolean {
  return haystack.toLocaleLowerCase('tr-TR').includes(needle.toLocaleLowerCase('tr-TR'))
}

const ENTITY_LIMIT = 6

export function searchEntities(query: string): PaletteItem[] {
  if (!query.trim()) return []
  const q = query.trim()
  const out: PaletteItem[] = []

  for (const l of LISTINGS) {
    if (
      includesCI(l.title, q) ||
      includesCI(l.city, q) ||
      includesCI(l.district, q)
    ) {
      out.push({
        id: `listing-${l.id}`,
        type: 'listing',
        label: l.title,
        hint: `${l.city} · ${l.district}`,
        to: `/listings?highlight=${encodeURIComponent(l.id)}`,
        Icon: Building2,
      })
      if (out.length >= ENTITY_LIMIT) break
    }
  }

  for (const c of CUSTOMERS) {
    if (out.length >= ENTITY_LIMIT * 2) break
    const hay = [c.name, c.email ?? '', c.phone ?? '', c.interestArea].join(' ')
    if (includesCI(hay, q)) {
      out.push({
        id: `customer-${c.id}`,
        type: 'customer',
        label: c.name,
        hint: `${c.segment} · ${c.interestArea}`,
        to: `/customers?highlight=${encodeURIComponent(c.id)}`,
        Icon: Users,
      })
    }
  }

  for (const t of TRANSACTIONS) {
    if (out.length >= ENTITY_LIMIT * 3) break
    if (
      includesCI(t.description, q) ||
      includesCI(t.party, q) ||
      includesCI(t.type, q)
    ) {
      out.push({
        id: `transaction-${t.id}`,
        type: 'transaction',
        label: t.description,
        hint: `${t.type} · ${t.party}`,
        to: '/finance',
        Icon: Coins,
      })
    }
  }

  for (const e of EVENTS) {
    if (out.length >= ENTITY_LIMIT * 4) break
    if (includesCI(e.title, q) || (e.customerName && includesCI(e.customerName, q))) {
      out.push({
        id: `event-${e.id}`,
        type: 'event',
        label: e.title,
        hint: e.date.slice(0, 10),
        to: '/calendar',
        Icon: CalendarIcon,
      })
    }
  }

  return out
}

export function readRecent(): string[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(RECENT_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : []
  } catch {
    return []
  }
}

export function pushRecent(query: string): string[] {
  const q = query.trim()
  if (!q) return readRecent()
  const current = readRecent()
  const next = [q, ...current.filter((v) => v !== q)].slice(0, RECENT_LIMIT)
  try {
    localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
  return next
}

export function clearRecent(): void {
  try {
    localStorage.removeItem(RECENT_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

export interface FlatPaletteSection {
  label: string
  items: ReadonlyArray<PaletteItem>
}

export function filteredSections(query: string): FlatPaletteSection[] {
  if (!query.trim()) {
    return [
      { label: 'AKSİYONLAR', items: ACTIONS },
      { label: 'SAYFALAR', items: PAGES },
    ]
  }
  const q = query.trim().toLocaleLowerCase('tr-TR')
  const matchAction = ACTIONS.filter((a) => a.label.toLocaleLowerCase('tr-TR').includes(q))
  const matchPage = PAGES.filter((p) => p.label.toLocaleLowerCase('tr-TR').includes(q))
  const entities = searchEntities(query)
  const sections: FlatPaletteSection[] = []
  if (matchAction.length) sections.push({ label: 'AKSİYONLAR', items: matchAction })
  if (matchPage.length) sections.push({ label: 'SAYFALAR', items: matchPage })
  if (entities.length) sections.push({ label: 'SONUÇLAR', items: entities })
  return sections
}
