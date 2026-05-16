export type NotificationCategory = 'müşteri' | 'satış' | 'finans' | 'sistem' | 'entegrasyon'

export type NotificationIconName =
  | 'UserPlus'
  | 'TrendingUp'
  | 'AlertCircle'
  | 'Activity'
  | 'Plug'
  | 'Mail'
  | 'CheckCircle2'
  | 'CreditCard'

export interface NotificationItem {
  id: string
  category: NotificationCategory
  iconName: NotificationIconName
  title: string
  preview: string
  at: string // ISO
  unread: boolean
  href: string // where to navigate on click
}

// Mock for popover preview (max 5 items shown in popover)
export const NOTIFICATIONS_PREVIEW: NotificationItem[] = [
  {
    id: 'n1',
    category: 'müşteri',
    iconName: 'UserPlus',
    title: 'Yeni müşteri eşleşmesi',
    preview: 'Hakan Y. Cunda denize 80m parselini favorilerine ekledi',
    at: '2026-05-11T11:00:00Z',
    unread: true,
    href: '/customers',
  },
  {
    id: 'n2',
    category: 'satış',
    iconName: 'TrendingUp',
    title: 'Fırsat aşama değişti',
    preview: 'Esra K. — Görüşme → Teklif',
    at: '2026-05-11T10:30:00Z',
    unread: true,
    href: '/sales',
  },
  {
    id: 'n3',
    category: 'finans',
    iconName: 'AlertCircle',
    title: 'Tahsilat gecikti',
    preview: 'INV-2026-0142 · 14 gün geçmiş',
    at: '2026-05-11T09:14:00Z',
    unread: false,
    href: '/finance',
  },
  {
    id: 'n4',
    category: 'müşteri',
    iconName: 'Mail',
    title: 'Yeni mesaj',
    preview: 'Mert D.: "Yarın 14:00 müsait misiniz?"',
    at: '2026-05-11T06:42:00Z',
    unread: false,
    href: '/messages',
  },
  {
    id: 'n5',
    category: 'sistem',
    iconName: 'Activity',
    title: 'Haftalık özet hazır',
    preview: '4 yeni ilan, 2 satış, 12 yeni müşteri',
    at: '2026-05-11T05:00:00Z',
    unread: false,
    href: '/reports',
  },
]

export const UNREAD_COUNT = NOTIFICATIONS_PREVIEW.filter((n) => n.unread).length
