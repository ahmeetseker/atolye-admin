import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import {
  ArrowRight,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
  FileText,
  Flame,
  Layers,
  MapPin,
  Sparkles,
  TrendingUp,
  Users,
} from '@landx/icons'
import { cn } from '@landx/ui'
import { PageShell } from '@landx/ui'

function greetingByHour(hour: number) {
  if (hour < 5) return 'İyi geceler'
  if (hour < 12) return 'Günaydın'
  if (hour < 18) return 'İyi günler'
  return 'İyi akşamlar'
}

const KPI_CARDS = [
  {
    key: 'listings',
    label: 'Aktif İlan',
    value: '47',
    delta: { tone: 'positive' as const, text: '▲ 8 yeni bu hafta' },
    icon: Layers,
    href: '/listings',
    contextLine: 'İmarlı 22 · Tarla 14 · Zeytinlik 11',
  },
  {
    key: 'hot-customers',
    label: 'Sıcak Müşteri',
    value: '12',
    delta: { tone: 'positive' as const, text: '▲ 3 bu hafta' },
    icon: Flame,
    href: '/customers',
    contextLine: 'Görüşmesi devam eden 9 aday',
  },
  {
    key: 'monthly-sales',
    label: 'Bu Ay Satış',
    value: '4',
    delta: { tone: 'positive' as const, text: '₺ 14.2M ciro' },
    icon: TrendingUp,
    href: '/sales',
    contextLine: 'Tapu randevusu 2 bekliyor',
  },
  {
    key: 'pending-collection',
    label: 'Bekleyen Tahsilat',
    value: '₺ 2.4M',
    delta: { tone: 'neutral' as const, text: '6 işlem' },
    icon: Coins,
    href: '/finance',
    contextLine: 'En eski 18 gün önce',
  },
] as const

const ACTIVITY = [
  {
    icon: Flame,
    text: 'Burhan Kaynak (Sıcak) Ayvalık zeytinlik için ikinci ziyareti istedi.',
    time: '12 dk önce',
    href: '/customers',
  },
  {
    icon: CheckCircle2,
    text: 'Datça villa imarlı arsası için kaparo alındı.',
    time: '38 dk önce',
    href: '/sales',
  },
  {
    icon: FileText,
    text: 'Mehmet Yılmaz teklif 8.4M ile imzalandı.',
    time: '2 sa önce',
    href: '/sales',
  },
  {
    icon: Calendar,
    text: 'Yarın 14:00 Cunda yer gösterimi.',
    time: '4 sa önce',
    href: '/calendar',
  },
  {
    icon: MapPin,
    text: 'Söke tarla ilanı (28.AK.0142) yayına alındı.',
    time: 'Dün',
    href: '/listings',
  },
] as const

const SUGGESTED_PROMPTS = [
  'Bu hafta sıcak müşterilere ne sundum?',
  'Ayvalık zeytinlik 6.1M altı ilanlar',
  '2.000 m² üstü villa imarlı arsalar',
  'Tahsilat bekleyen 3 işlem',
] as const

export function Home() {
  const now = new Date()
  const greeting = greetingByHour(now.getHours())
  const dateLabel = now.toLocaleDateString('tr-TR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  })

  const [draft, setDraft] = useState('')
  const [cmdHint, setCmdHint] = useState('⌘K')

  useEffect(() => {
    if (typeof navigator === 'undefined') return
    const isMac = /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent)
    setCmdHint(isMac ? '⌘K' : 'Ctrl+K')
  }, [])

  return (
    <PageShell
      eyebrow={`HOŞ GELDİN · ${dateLabel}`}
      title={
        <>
          {greeting}, <em className="font-serif italic font-light">Ahmet</em>.
        </>
      }
      description="Bugün portföyünde 47 aktif ilan, 12 sıcak müşteri ve 6 bekleyen tahsilat var."
      actions={
        <Link
          to="/listings"
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90"
        >
          Yeni ilan ekle
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      }
    >
      <section className="mb-8 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {KPI_CARDS.map((c) => {
          const Icon = c.icon
          return (
            <Link
              key={c.key}
              to={c.href}
              className="group relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(80,60,40,0.10)]"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground/[0.06] text-foreground/80">
                  <Icon className="h-4 w-4" />
                </span>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  {c.label}
                </div>
                <div className="mt-1 font-serif text-3xl font-light tracking-tight">
                  {c.value}
                </div>
              </div>
              <div className="mt-auto space-y-1.5">
                <div
                  className={cn(
                    'inline-flex items-center gap-1 font-mono text-[11px]',
                    c.delta.tone === 'positive' && 'text-emerald-700 dark:text-emerald-400',
                    c.delta.tone === 'neutral' && 'text-muted-foreground',
                  )}
                >
                  {c.delta.text}
                </div>
                <div className="text-[12px] text-muted-foreground">{c.contextLine}</div>
              </div>
            </Link>
          )
        })}
      </section>

      <section className="mb-8 overflow-hidden rounded-2xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Atölye Asistanı
          </p>
          <kbd className="hidden rounded-md border border-border/80 bg-background/40 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline">
            {cmdHint}
          </kbd>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-border bg-background/50 px-3 py-2.5 transition hover:bg-foreground/[0.04]">
          <Sparkles className="h-4 w-4 flex-none text-stone-800 dark:text-stone-200" />
          <label htmlFor="search-input-home" className="sr-only">
            Atölye asistanına soru sor
          </label>
          <input
            id="search-input-home"
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onFocus={() => {
              if (draft) sessionStorage.setItem('assistant-prefill', draft)
              window.dispatchEvent(new Event('open-assistant'))
            }}
            placeholder="Bana sor… (örn. 'Ayvalık zeytinlik 6.1M altı')"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <button
            type="button"
            onClick={() => {
              if (draft) sessionStorage.setItem('assistant-prefill', draft)
              window.dispatchEvent(new Event('open-assistant'))
            }}
            aria-label="Asistanı aç"
            className="flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-accent text-accent-foreground transition-opacity hover:opacity-90"
          >
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {SUGGESTED_PROMPTS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                sessionStorage.setItem('assistant-prefill', p)
                window.dispatchEvent(new Event('open-assistant'))
              }}
              className="rounded-full border border-border/70 bg-background/30 px-3 py-1 text-[12px] text-muted-foreground transition hover:bg-foreground/[0.04] hover:text-foreground"
            >
              {p}
            </button>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <article className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
          <header className="mb-3 flex items-baseline justify-between">
            <h3 className="font-serif text-lg font-medium tracking-tight">
              Son aktiviteler
            </h3>
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              5 olay
            </span>
          </header>
          <ul className="-mx-2 divide-y divide-border/70">
            {ACTIVITY.map((a, i) => {
              const Icon = a.icon
              return (
                <li key={i}>
                  <Link
                    to={a.href}
                    className="flex items-start gap-3 rounded-xl px-2 py-3 transition hover:bg-foreground/[0.03]"
                  >
                    <span className="mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-foreground/[0.06] text-foreground/80">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-snug">{a.text}</p>
                      <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {a.time}
                      </div>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        </article>

        <article className="rounded-2xl border border-border bg-card p-5">
          <header className="mb-3">
            <h3 className="font-serif text-lg font-medium tracking-tight">
              Hızlı erişim
            </h3>
          </header>
          <ul className="space-y-1.5">
            <QuickLink to="/sales" icon={TrendingUp} label="Satış panosu" hint="3 yeni teklif" />
            <QuickLink to="/calendar" icon={Calendar} label="Yarınki randevular" hint="2 yer gösterimi" />
            <QuickLink to="/customers" icon={Users} label="Sıcak müşteriler" hint="12 aktif" />
            <QuickLink to="/finance" icon={Coins} label="Tahsilat" hint="6 bekliyor" />
          </ul>
        </article>
      </section>
    </PageShell>
  )
}

function QuickLink({
  to,
  icon: Icon,
  label,
  hint,
}: {
  to: string
  icon: typeof Calendar
  label: string
  hint: string
}) {
  return (
    <li>
      <Link
        to={to}
        className="group flex items-center gap-3 rounded-xl border border-transparent px-2 py-2.5 transition hover:border-border hover:bg-foreground/[0.03]"
      >
        <span className="flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-foreground/[0.06] text-foreground/80">
          <Icon className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium leading-tight">{label}</div>
          <div className="text-[11px] text-muted-foreground">{hint}</div>
        </div>
        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
      </Link>
    </li>
  )
}
