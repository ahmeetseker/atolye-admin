export interface NavCommand {
  label: string
  href: string
}

interface NavKeyword {
  pattern: RegExp
  label: string
  href: string
}

const NAV_KEYWORDS: NavKeyword[] = [
  { pattern: /\b(ilan|listing|portfoy|portföy)\b/i, label: 'İlanlara git', href: '/listings' },
  {
    pattern: /\b(müşter|musteri|crm|client)\b/i,
    label: 'Müşterilere git',
    href: '/customers',
  },
  {
    pattern: /\b(satış|satis|pipeline|deal|fırsat|firsat)\b/i,
    label: 'Satış panosuna git',
    href: '/sales',
  },
  {
    pattern: /\b(finans|tahsilat|komisyon|fatura|invoice)\b/i,
    label: 'Finansa git',
    href: '/finance',
  },
  { pattern: /\b(rapor|reports|karne|analiz)\b/i, label: 'Raporlara git', href: '/reports' },
  {
    pattern: /\b(takvim|calendar|ajanda|randevu)\b/i,
    label: 'Takvime git',
    href: '/calendar',
  },
  { pattern: /\b(mesaj|message|sohbet|chat)\b/i, label: 'Mesajlara git', href: '/messages' },
  {
    pattern: /\b(profil|profile|hesap|account|ayar|settings)\b/i,
    label: 'Profile git',
    href: '/profile',
  },
  { pattern: /\b(bildirim|notification)\b/i, label: 'Bildirimlere git', href: '/notifications' },
]

const NAV_VERBS = /\b(git|aç|ac|göster|goster|navig|open)\b/i

export function extractNavCommands(query: string): NavCommand[] {
  const trimmed = query.trim()
  if (!trimmed) return []

  const wordCount = trimmed.split(/\s+/).length
  const looksLikeNav = NAV_VERBS.test(trimmed) || wordCount <= 3
  if (!looksLikeNav) return []

  const matches: NavCommand[] = []
  const seen = new Set<string>()
  for (const k of NAV_KEYWORDS) {
    if (k.pattern.test(trimmed) && !seen.has(k.href)) {
      matches.push({ label: k.label, href: k.href })
      seen.add(k.href)
    }
  }
  return matches.slice(0, 3)
}
