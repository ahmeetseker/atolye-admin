import { Link, useLocation } from 'react-router'
import { ChevronRight } from '@landx/icons'

const ROUTE_LABELS: Record<string, string> = {
  '/': 'Atölye',
  '/listings': 'İlanlar',
  '/customers': 'Müşteriler',
  '/sales': 'Satış',
  '/finance': 'Finans',
  '/reports': 'Raporlar',
  '/calendar': 'Takvim',
  '/messages': 'Mesajlar',
  '/search': 'Arama',
  '/profile': 'Profil',
  '/settings': 'Ayarlar',
  '/help': 'Yardım',
  '/notifications': 'Bildirimler',
}

export function AdminBreadcrumb() {
  const location = useLocation()
  if (location.pathname === '/') return null // root: no breadcrumb

  const label = ROUTE_LABELS[location.pathname] ?? location.pathname.slice(1)

  return (
    <nav
      aria-label="Sayfa hiyerarşisi"
      className="mb-3 flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
    >
      <Link to="/" className="transition hover:text-foreground">
        ATÖLYE
      </Link>
      <ChevronRight className="h-3 w-3 opacity-50" />
      <span className="text-foreground" aria-current="page">
        {label}
      </span>
    </nav>
  )
}
