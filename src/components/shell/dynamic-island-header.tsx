import { useNavigate } from 'react-router'
import {
  Sparkles,
  Map,
  Layers,
  Flame,
  Users,
  Handshake,
  Wallet,
  BarChart3,
  Sun,
  CalendarRange,
  AlertCircle,
  List,
  CheckCircle2,
  PauseCircle,
  FileText,
  Plus,
  FolderOpen,
  GitCompareArrows,
  Inbox,
  Snowflake,
  ListChecks,
  Tags,
  Truck,
  Columns3,
  FileSignature,
  CalendarCheck,
  XCircle,
  ArrowDownToLine,
  Coins,
  TrendingDown,
  Receipt,
  FileSpreadsheet,
  TrendingUp,
  PieChart,
} from '@landx/icons'
import {
  DynamicIslandHeader as SharedHeader,
  type NavPage,
  type SubNavItem,
  type AiSuggestion,
} from '@landx/ui'
import { answerQuery } from '@/lib/assistant/answer'
import { NotificationsPopover } from '@/components/shell/notifications-popover'

const NAV_PAGES: NavPage[] = [
  { key: 'overview', alt: 'Gösterge', icon: <Sparkles className="h-5 w-5" /> },
  { key: 'listings', alt: 'İlanlar', icon: <Layers className="h-5 w-5" /> },
  { key: 'customers', alt: 'Müşteriler', icon: <Users className="h-5 w-5" /> },
  { key: 'sales', alt: 'Satış', icon: <Handshake className="h-5 w-5" /> },
  { key: 'finance', alt: 'Finans', icon: <Wallet className="h-5 w-5" /> },
  { key: 'reports', alt: 'Raporlar', icon: <BarChart3 className="h-5 w-5" /> },
]

const SUB_NAV: Record<string, SubNavItem[]> = {
  overview: [
    { key: 'today', label: 'Bugün', icon: <Sun className="h-5 w-5" />, target: 'overview', href: '/' },
    { key: 'this-week', label: 'Bu hafta', icon: <CalendarRange className="h-5 w-5" />, target: 'overview', href: '/' },
    { key: 'hot-leads', label: 'Sıcak adaylar', icon: <Flame className="h-5 w-5" />, target: 'customers', href: '/customers' },
    { key: 'pending', label: 'Bekleyenler', icon: <AlertCircle className="h-5 w-5" />, target: 'overview', href: '/' },
    { key: 'team', label: 'Ekip karnesi', icon: <Users className="h-5 w-5" />, target: 'reports', href: '/reports' },
  ],
  listings: [
    { key: 'all', label: 'Tüm arsalar', icon: <List className="h-5 w-5" />, target: 'listings', href: '/listings' },
    { key: 'active', label: 'Aktif', icon: <CheckCircle2 className="h-5 w-5" />, target: 'listings', href: '/listings' },
    { key: 'passive', label: 'Pasif', icon: <PauseCircle className="h-5 w-5" />, target: 'listings', href: '/listings' },
    { key: 'draft', label: 'Taslak', icon: <FileText className="h-5 w-5" />, target: 'listings', href: '/listings' },
    { key: 'new', label: 'Yeni ilan', icon: <Plus className="h-5 w-5" />, target: 'listings', href: '/listings' },
    { key: 'map', label: 'Harita', icon: <Map className="h-5 w-5" />, target: 'listings', href: '/listings' },
    { key: 'docs', label: 'Belge dolabı', icon: <FolderOpen className="h-5 w-5" />, target: 'listings', href: '/listings' },
    { key: 'compare', label: 'Karşılaştır', icon: <GitCompareArrows className="h-5 w-5" />, target: 'listings', href: '/listings' },
  ],
  customers: [
    { key: 'leads', label: 'Adaylar', icon: <Inbox className="h-5 w-5" />, target: 'customers', href: '/customers' },
    { key: 'hot', label: 'Sıcak', icon: <Flame className="h-5 w-5" />, target: 'customers', href: '/customers' },
    { key: 'warm', label: 'Ilık', icon: <Sparkles className="h-5 w-5" />, target: 'customers', href: '/customers' },
    { key: 'cold', label: 'Soğuk', icon: <Snowflake className="h-5 w-5" />, target: 'customers', href: '/customers' },
    { key: 'requests', label: 'Talep havuzu', icon: <ListChecks className="h-5 w-5" />, target: 'customers', href: '/customers' },
    { key: 'segments', label: 'Segmentler', icon: <Tags className="h-5 w-5" />, target: 'customers', href: '/customers' },
    { key: 'suppliers', label: 'Tedarikçiler', icon: <Truck className="h-5 w-5" />, target: 'customers', href: '/customers' },
  ],
  sales: [
    { key: 'kanban', label: 'Pano', icon: <Columns3 className="h-5 w-5" />, target: 'sales', href: '/sales' },
    { key: 'offers', label: 'Teklifler', icon: <Handshake className="h-5 w-5" />, target: 'sales', href: '/sales' },
    { key: 'contracts', label: 'Sözleşmeler', icon: <FileSignature className="h-5 w-5" />, target: 'sales', href: '/sales' },
    { key: 'deed', label: 'Tapu randevuları', icon: <CalendarCheck className="h-5 w-5" />, target: 'sales', href: '/sales' },
    { key: 'lost', label: 'Kayıp satışlar', icon: <XCircle className="h-5 w-5" />, target: 'sales', href: '/sales' },
  ],
  finance: [
    { key: 'overview', label: 'Cari hesap', icon: <Wallet className="h-5 w-5" />, target: 'finance', href: '/finance' },
    { key: 'collections', label: 'Tahsilat', icon: <ArrowDownToLine className="h-5 w-5" />, target: 'finance', href: '/finance' },
    { key: 'commission', label: 'Komisyon', icon: <Coins className="h-5 w-5" />, target: 'finance', href: '/finance' },
    { key: 'expenses', label: 'Giderler', icon: <TrendingDown className="h-5 w-5" />, target: 'finance', href: '/finance' },
    { key: 'pending', label: 'Bekleyen ödeme', icon: <Receipt className="h-5 w-5" />, target: 'finance', href: '/finance' },
    { key: 'tax', label: 'Vergi/KDV', icon: <FileSpreadsheet className="h-5 w-5" />, target: 'finance', href: '/finance' },
  ],
  reports: [
    { key: 'region', label: 'Bölge analizi', icon: <Map className="h-5 w-5" />, target: 'reports', href: '/reports' },
    { key: 'performance', label: 'İlan performansı', icon: <TrendingUp className="h-5 w-5" />, target: 'reports', href: '/reports' },
    { key: 'sales', label: 'Satış raporu', icon: <BarChart3 className="h-5 w-5" />, target: 'reports', href: '/reports' },
    { key: 'team', label: 'Ekip', icon: <Users className="h-5 w-5" />, target: 'reports', href: '/reports' },
    { key: 'customer', label: 'Müşteri kaynağı', icon: <PieChart className="h-5 w-5" />, target: 'reports', href: '/reports' },
    { key: 'export', label: 'Dışa aktar', icon: <FileSpreadsheet className="h-5 w-5" />, target: 'reports', href: '/reports' },
  ],
}

const AI_SUGGESTIONS: AiSuggestion[] = [
  { label: 'Çanakkale · deniz manzaralı', icon: <Map className="h-3 w-3" />, href: '/listings' },
  { label: '2.000 m² üstü villa imarlı', icon: <Layers className="h-3 w-3" />, href: '/listings' },
  { label: 'Ayvalık zeytinlik · 6.1M altı', icon: <Sparkles className="h-3 w-3" />, href: '/listings' },
  { label: 'Bu hafta sıcak müşteri', icon: <Flame className="h-3 w-3" />, href: '/customers' },
]

const AI_STAGES = [
  'Sorgun anlaşılıyor…',
  'Portföy verisi taranıyor…',
  'Sonuç hazırlanıyor…',
] as const

interface DynamicIslandHeaderProps {
  activeKey?: string
  unreadCount?: number
  onNavigate?: (key: string) => void
  onOpenAssistant?: () => void
}

export function DynamicIslandHeader(props: DynamicIslandHeaderProps) {
  const navigate = useNavigate()
  return (
    <SharedHeader
      brandIcon={<Sparkles className="h-6 w-6 flex-none" />}
      brandLabel="Atölye"
      activeKey={props.activeKey}
      navPages={NAV_PAGES}
      subNav={SUB_NAV}
      aiSearch={{
        placeholder: "Ne arıyorsun?... örn. 'Çanakkale'de deniz manzaralı'",
        suggestions: AI_SUGGESTIONS,
        answerFn: answerQuery,
        stageLabels: AI_STAGES,
      }}
      notifications={{
        unreadCount: props.unreadCount ?? 0,
        panel: ({ close }) => <NotificationsPopover onClose={close} />,
      }}
      onNavigate={props.onNavigate}
      onNavigateHref={(href) => navigate(href)}
      onOpenAssistant={props.onOpenAssistant}
    />
  )
}

