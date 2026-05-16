import { lazy, useMemo, useRef, useState, useTransition } from 'react'
import {
  BarChart3,
  Building2,
  Download,
  Filter,
  PieChart as PieIcon,
  TrendingUp,
} from '@landx/icons'
import { PageShell, ErrorState, SkeletonChart, SkeletonTable } from '@landx/ui'
import { LazyChart } from '@landx/ui'
import { Sparkline } from '@landx/ui'
import {
  STAGE_CONVERSION,
  useCustomerSources,
  useMonthlyClose,
  useRegionRanking,
  useTeamPerformance,
} from '@landx/data'
import { formatTL, formatTLCompact } from '@landx/ui'
import { cn } from '@landx/ui'
import { ChartExportMenu } from '@/components/charts/ChartExportMenu'

const TeamPerformanceBar = lazy(() =>
  import('@landx/ui').then((m) => ({
    default: m.TeamPerformanceBar,
  })),
)
const MonthlySalesLine = lazy(() =>
  import('@landx/ui').then((m) => ({
    default: m.MonthlySalesLine,
  })),
)
const SourceDonut = lazy(() =>
  import('@landx/ui').then((m) => ({ default: m.SourceDonut })),
)
const RegionRankingBar = lazy(() =>
  import('@landx/ui').then((m) => ({
    default: m.RegionRankingBar,
  })),
)

type TabId = 'performance' | 'sales' | 'customer' | 'region'

const TABS: Array<{ id: TabId; label: string; Icon: typeof TrendingUp }> = [
  { id: 'performance', label: 'Performans', Icon: TrendingUp },
  { id: 'sales', label: 'Satış', Icon: BarChart3 },
  { id: 'customer', label: 'Müşteri', Icon: PieIcon },
  { id: 'region', label: 'Bölge', Icon: Building2 },
]

export function Reports() {
  const [tab, setTab] = useState<TabId>('performance')
  const [, startTransition] = useTransition()

  const changeTab = (next: TabId) => startTransition(() => setTab(next))

  return (
    <PageShell
      eyebrow="MOD · RAPORLAR"
      title={
        <>
          Atölye <em className="font-serif italic font-light">karnesi</em>
        </>
      }
      description="Performans, satış, müşteri ve bölge analizleri tek panelde."
      actions={
        <>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium transition hover:bg-foreground/5"
          >
            <Filter className="h-3.5 w-3.5" />
            Dönem
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90"
          >
            <Download className="h-3.5 w-3.5" />
            Dışa aktar
          </button>
        </>
      }
    >
      <nav className="mb-6 -mx-1 flex items-center gap-1 overflow-x-auto rounded-full border border-border bg-card p-1 sm:mx-0 sm:inline-flex">
        {TABS.map(({ id, label, Icon }) => {
          const active = tab === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => changeTab(id)}
              className={cn(
                'inline-flex flex-none items-center gap-2 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition',
                active
                  ? 'bg-foreground text-background shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          )
        })}
      </nav>

      {tab === 'performance' && <PerformanceTab />}
      {tab === 'sales' && <SalesTab />}
      {tab === 'customer' && <CustomerTab />}
      {tab === 'region' && <RegionTab />}
    </PageShell>
  )
}

function PerformanceTab() {
  const { data: team = [], isLoading, error, refetch } = useTeamPerformance()
  const teamChartRef = useRef<HTMLDivElement | null>(null)

  if (error) {
    return (
      <ErrorState
        title="Performans verisi yüklenemedi"
        error={error}
        onRetry={() => refetch()}
      />
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6" data-testid="reports-team-skeleton">
        <SkeletonChart />
        <div className="rounded-2xl border border-border bg-card">
          <SkeletonTable rows={6} cells={6} />
        </div>
      </div>
    )
  }

  const totalRevenue = team.reduce((s, r) => s + r.revenue, 0)
  const totalClosed = team.reduce((s, r) => s + r.closed, 0)
  const avgResponse =
    team.length === 0
      ? 0
      : Math.round(team.reduce((s, r) => s + r.avgResponseMin, 0) / team.length)
  const bestConversion =
    team.length === 0 ? 0 : Math.max(...team.map((r) => r.conversion))
  const bestOwner =
    team.length === 0
      ? '—'
      : team.reduce((b, r) => (r.conversion > b.conversion ? r : b)).owner

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat
          label="Bu ay toplam ciro"
          value={formatTLCompact(totalRevenue)}
          hint={`${totalClosed} kapanan satış`}
        />
        <Stat
          label="Ortalama yanıt"
          value={`${avgResponse} dk`}
          hint="ekip ortalaması"
        />
        <Stat
          label="En iyi conversion"
          value={`%${Math.round(bestConversion * 100)}`}
          hint={bestOwner}
        />
        <Stat
          label="Aktif fırsat"
          value={String(team.reduce((s, r) => s + r.active, 0))}
          hint="ekip toplamı"
        />
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <header className="mb-3 flex items-start justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Ekip ciro karşılaştırması
            </div>
            <h3 className="font-serif text-lg font-medium tracking-tight">
              Kişi başına bu ay
            </h3>
          </div>
          <ChartExportMenu
            pngTarget={teamChartRef}
            csvData={team as unknown as Record<string, unknown>[]}
            filename="ekip-performansi"
          />
        </header>
        <div ref={teamChartRef}>
          <LazyChart height={260}>
            <TeamPerformanceBar data={[...team]} />
          </LazyChart>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <header className="mb-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Detaylı tablo
          </div>
          <h3 className="font-serif text-lg font-medium tracking-tight">Ekip karnesi</h3>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left">
            <thead>
              <tr className="border-b border-border font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                <th className="px-3 py-2.5">Üye</th>
                <th className="px-3 py-2.5 text-right">Kapanan</th>
                <th className="px-3 py-2.5 text-right">Aktif</th>
                <th className="px-3 py-2.5 text-right">Ciro</th>
                <th className="px-3 py-2.5 text-right">Dönüşüm</th>
                <th className="px-3 py-2.5 text-right">Ort. yanıt</th>
              </tr>
            </thead>
            <tbody>
              {team.map((r) => (
                <tr key={r.owner} className="border-b border-border/60 last:border-0">
                  <td className="px-3 py-3 text-[14px] font-medium">{r.owner}</td>
                  <td className="px-3 py-3 text-right font-mono tabular-nums">{r.closed}</td>
                  <td className="px-3 py-3 text-right font-mono tabular-nums">{r.active}</td>
                  <td className="px-3 py-3 text-right font-serif font-medium tabular-nums">
                    {formatTL(r.revenue)}
                  </td>
                  <td className="px-3 py-3 text-right font-mono tabular-nums">
                    %{Math.round(r.conversion * 100)}
                  </td>
                  <td
                    className={cn(
                      'px-3 py-3 text-right font-mono tabular-nums',
                      r.avgResponseMin > 60
                        ? 'text-rose-700 dark:text-rose-300'
                        : 'text-muted-foreground',
                    )}
                  >
                    {r.avgResponseMin} dk
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function SalesTab() {
  const { data: monthly = [], isLoading, error, refetch } = useMonthlyClose()
  const monthlyChartRef = useRef<HTMLDivElement | null>(null)

  if (error) {
    return (
      <ErrorState
        title="Satış verisi yüklenemedi"
        error={error}
        onRetry={() => refetch()}
      />
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SkeletonChart />
        <SkeletonChart />
      </div>
    )
  }

  const totalRev = monthly.reduce((s, r) => s + r.revenue, 0)
  const totalCount = monthly.reduce((s, r) => s + r.count, 0)
  const avgDeal = totalCount > 0 ? totalRev / totalCount : 0
  const lastTwo = monthly.slice(-2)
  const growth =
    lastTwo.length === 2 && lastTwo[0].revenue > 0
      ? ((lastTwo[1].revenue - lastTwo[0].revenue) / lastTwo[0].revenue) * 100
      : 0

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Son 6 ay ciro" value={formatTLCompact(totalRev)} hint={`${totalCount} satış`} />
        <Stat label="Ortalama tutar" value={formatTLCompact(avgDeal)} hint="satış başına" />
        <Stat
          label="Bu ay büyüme"
          value={`${growth >= 0 ? '▲' : '▼'} %${Math.abs(Math.round(growth))}`}
          hint="önceki aya göre"
        />
        <Stat
          label="Conversion (huni)"
          value={`%${Math.round(
            (STAGE_CONVERSION[STAGE_CONVERSION.length - 1].value /
              STAGE_CONVERSION[0].value) *
              100,
          )}`}
          hint="ilk temas → tapu"
        />
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <header className="mb-3 flex items-start justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Aylık trend
            </div>
            <h3 className="font-serif text-lg font-medium tracking-tight">
              Ciro & kapanan satış
            </h3>
          </div>
          <ChartExportMenu
            pngTarget={monthlyChartRef}
            csvData={monthly as unknown as Record<string, unknown>[]}
            filename="aylik-satis"
          />
        </header>
        <div ref={monthlyChartRef}>
          <LazyChart height={260}>
            <MonthlySalesLine data={[...monthly]} />
          </LazyChart>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <header className="mb-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Dönüşüm hunisi
          </div>
          <h3 className="font-serif text-lg font-medium tracking-tight">
            İlk temas → tapu yolculuğu
          </h3>
        </header>
        <div className="space-y-2.5">
          {STAGE_CONVERSION.map((row, i) => {
            const pct = (row.value / STAGE_CONVERSION[0].value) * 100
            return (
              <div key={row.stage} className="flex items-center gap-2 sm:gap-3">
                <span className="w-16 text-[12px] font-medium sm:w-20">{row.stage}</span>
                <div className="relative h-7 flex-1 overflow-hidden rounded-md bg-foreground/[0.06]">
                  <div
                    className="absolute inset-y-0 left-0 rounded-md transition-all"
                    style={{
                      width: `${pct}%`,
                      background: `hsl(160, 84%, ${39 + i * 6}%)`,
                    }}
                  />
                </div>
                <span className="w-9 text-right font-mono text-[12px] tabular-nums sm:w-10">
                  {row.value}
                </span>
                <span className="hidden w-24 text-right font-mono text-[10px] text-muted-foreground sm:inline">
                  {row.hint}
                </span>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

function CustomerTab() {
  const { data: sources = [], isLoading, error, refetch } = useCustomerSources()
  const sourceChartRef = useRef<HTMLDivElement | null>(null)

  const sorted = useMemo(
    () => [...sources].sort((a, b) => b.count - a.count),
    [sources],
  )

  if (error) {
    return (
      <ErrorState
        title="Müşteri kaynakları yüklenemedi"
        error={error}
        onRetry={() => refetch()}
      />
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SkeletonChart />
      </div>
    )
  }

  const totalCustomers = sorted.reduce((s, r) => s + r.count, 0)
  const bestSource =
    sorted.length === 0
      ? null
      : sorted.reduce((b, r) => (r.conversion > b.conversion ? r : b))

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Toplam müşteri" value={String(totalCustomers)} hint="son 6 ay" />
        <Stat
          label="En çok dönüşüm"
          value={bestSource ? `%${Math.round(bestSource.conversion * 100)}` : '—'}
          hint={bestSource?.source ?? ''}
        />
        <Stat
          label="Sahibinden payı"
          value={`%${
            totalCustomers === 0
              ? 0
              : Math.round(
                  ((sorted.find((s) => s.source === 'Sahibinden')?.count ?? 0) /
                    totalCustomers) *
                    100,
                )
          }`}
          hint="kaynak"
        />
        <Stat
          label="Referans payı"
          value={`%${
            totalCustomers === 0
              ? 0
              : Math.round(
                  ((sorted.find((s) => s.source === 'Referans')?.count ?? 0) /
                    totalCustomers) *
                    100,
                )
          }`}
          hint="organik"
        />
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[360px_1fr]">
        <article className="rounded-2xl border border-border bg-card p-5">
          <header className="mb-2 flex items-start justify-between gap-3">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Müşteri kaynakları
              </div>
              <h3 className="font-serif text-lg font-medium tracking-tight">Dağılım</h3>
            </div>
            <ChartExportMenu
              pngTarget={sourceChartRef}
              csvData={sorted as unknown as Record<string, unknown>[]}
              filename="musteri-kaynaklari"
            />
          </header>
          <div ref={sourceChartRef}>
            <LazyChart height={220}>
              <SourceDonut data={[...sorted]} />
            </LazyChart>
          </div>
        </article>

        <article className="rounded-2xl border border-border bg-card p-5">
          <header className="mb-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Kaynak başına dönüşüm
            </div>
            <h3 className="font-serif text-lg font-medium tracking-tight">
              Hangi kanal kapıyor?
            </h3>
          </header>
          <ul className="space-y-2.5">
            {sorted.map((row) => (
              <li key={row.source} className="space-y-1">
                <div className="flex items-baseline justify-between text-[12px]">
                  <span className="font-medium">{row.source}</span>
                  <span className="font-mono tabular-nums">
                    {row.count} müşteri ·{' '}
                    <span className="text-foreground/80">
                      %{Math.round(row.conversion * 100)}
                    </span>
                  </span>
                </div>
                <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-foreground/[0.06]">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-foreground/70"
                    style={{ width: `${(row.conversion / 0.5) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[11px] text-muted-foreground">
            Bar 0.5'lik tam dönüşüme normalize edilmiştir.
          </p>
        </article>
      </section>
    </div>
  )
}

function RegionTab() {
  const { data: regions = [], isLoading, error, refetch } = useRegionRanking()
  const regionChartRef = useRef<HTMLDivElement | null>(null)

  const sorted = useMemo(
    () => [...regions].sort((a, b) => b.listings - a.listings),
    [regions],
  )

  if (error) {
    return (
      <ErrorState
        title="Bölge verisi yüklenemedi"
        error={error}
        onRetry={() => refetch()}
      />
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SkeletonChart />
        <div className="rounded-2xl border border-border bg-card">
          <SkeletonTable rows={6} cells={5} />
        </div>
      </div>
    )
  }

  const totalListings = sorted.reduce((s, r) => s + r.listings, 0)
  const avgPrice =
    sorted.length === 0
      ? 0
      : Math.round(sorted.reduce((s, r) => s + r.avgPricePerSqm, 0) / sorted.length)
  const top = sorted[0]

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Toplam bölge" value={String(sorted.length)} hint="aktif portföyde" />
        <Stat label="Toplam ilan" value={String(totalListings)} hint="bölgelerde" />
        <Stat
          label="Ort. m² fiyatı"
          value={`₺ ${avgPrice.toLocaleString('tr-TR')}`}
          hint="ağırlıklı ortalama"
        />
        <Stat
          label="En çok ilanlı"
          value={top?.district ?? '—'}
          hint={top ? `${top.listings} ilan · ${top.activeBuyers} alıcı` : ''}
        />
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <header className="mb-3 flex items-start justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              İlan sayısına göre
            </div>
            <h3 className="font-serif text-lg font-medium tracking-tight">Bölge sıralaması</h3>
          </div>
          <ChartExportMenu
            pngTarget={regionChartRef}
            csvData={sorted as unknown as Record<string, unknown>[]}
            filename="bolge-siralamasi"
          />
        </header>
        <div ref={regionChartRef}>
          <LazyChart height={Math.max(260, sorted.length * 36)}>
            <RegionRankingBar data={[...sorted]} />
          </LazyChart>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <header className="mb-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Detay
          </div>
          <h3 className="font-serif text-lg font-medium tracking-tight">
            Bölge bazında özet
          </h3>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead>
              <tr className="border-b border-border font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                <th className="px-3 py-2.5">Bölge</th>
                <th className="px-3 py-2.5 text-right">İlan</th>
                <th className="px-3 py-2.5 text-right">Alıcı</th>
                <th className="px-3 py-2.5 text-right">m² fiyatı</th>
                <th className="px-3 py-2.5">Bu hafta trendi</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => (
                <tr key={r.district} className="border-b border-border/60 last:border-0">
                  <td className="px-3 py-3">
                    <div className="flex flex-col">
                      <span className="text-[14px] font-medium">{r.district}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">{r.city}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right font-mono tabular-nums">{r.listings}</td>
                  <td className="px-3 py-3 text-right font-mono tabular-nums">{r.activeBuyers}</td>
                  <td className="px-3 py-3 text-right font-mono tabular-nums">
                    ₺ {r.avgPricePerSqm.toLocaleString('tr-TR')}
                  </td>
                  <td className="px-3 py-3">
                    <Sparkline data={r.weeklyTrend} width={100} height={24} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 font-serif text-3xl font-light tracking-tight">{value}</div>
      {hint && <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  )
}
