import { lazy, useRef, useState } from 'react'
import {
  AlertCircle,
  ArrowDownToLine,
  Clock,
  Coins,
  Download,
  Filter,
  Plus,
  Receipt,
  TrendingDown,
} from '@landx/icons'
import { PageShell, ErrorState, SkeletonTable, SkeletonChart } from '@landx/ui'
import { LazyChart } from '@landx/ui'
import { DataTable, type Column } from '@/components/data-table/data-table'
import {
  useTransactions,
  useCashflow,
  usePendingByAge,
  useFinanceKpis,
  type Transaction,
  type TxnStatus,
  type TxnType,
} from '@landx/data'
import { formatTL, formatTLCompact, timeAgo } from '@landx/ui'
import { cn } from '@landx/ui'
import { ChartExportMenu } from '@/components/charts/ChartExportMenu'

const CashflowChart = lazy(() =>
  import('@landx/ui').then((m) => ({ default: m.CashflowChart })),
)
const AgingDonut = lazy(() =>
  import('@landx/ui').then((m) => ({ default: m.AgingDonut })),
)

const TYPE_TABS: Array<'Tümü' | TxnType> = ['Tümü', 'Tahsilat', 'Komisyon', 'Gider', 'Vergi']

const STATUS_TONES: Record<TxnStatus, { bg: string; fg: string; dot: string }> = {
  Tamamlandı: {
    bg: 'bg-emerald-500/10 dark:bg-emerald-400/10',
    fg: 'text-emerald-700 dark:text-emerald-300',
    dot: 'bg-emerald-500 dark:bg-emerald-400',
  },
  Bekliyor: {
    bg: 'bg-amber-500/10 dark:bg-amber-400/10',
    fg: 'text-amber-700 dark:text-amber-300',
    dot: 'bg-amber-500 dark:bg-amber-400',
  },
  Gecikmiş: {
    bg: 'bg-rose-500/10 dark:bg-rose-400/10',
    fg: 'text-rose-700 dark:text-rose-300',
    dot: 'bg-rose-500 dark:bg-rose-400',
  },
}

export function Finance() {
  const [typeFilter, setTypeFilter] = useState<(typeof TYPE_TABS)[number]>('Tümü')
  const cashflowChartRef = useRef<HTMLDivElement | null>(null)
  const agingChartRef = useRef<HTMLDivElement | null>(null)

  const { data: kpis } = useFinanceKpis()
  const { data: aging = [] } = usePendingByAge()
  const { data: cashflow = [] } = useCashflow()
  const { data: allTransactions = [] } = useTransactions({})
  const {
    data: filtered = [],
    isLoading,
    isPlaceholderData,
    error,
    refetch,
  } = useTransactions({ type: typeFilter === 'Tümü' ? undefined : typeFilter })

  const columns: Column<Transaction>[] = [
    {
      key: 'date',
      header: 'Tarih',
      className: 'whitespace-nowrap',
      sortValue: (r) => new Date(r.date).getTime(),
      cell: (r) => (
        <span className="font-mono text-[12px] text-muted-foreground">{timeAgo(r.date)}</span>
      ),
    },
    {
      key: 'type',
      header: 'Tip',
      sortValue: (r) => r.type,
      cell: (r) => <TypePill type={r.type} />,
    },
    {
      key: 'description',
      header: 'Açıklama',
      sortValue: (r) => r.description,
      cell: (r) => (
        <div className="flex flex-col">
          <span className="text-[13px] font-medium leading-snug">{r.description}</span>
          <span className="font-mono text-[11px] text-muted-foreground">
            {r.party}
            {r.dealId && ` · ${r.dealId}`}
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Durum',
      sortValue: (r) => r.status,
      cell: (r) => <StatusPill status={r.status} daysOverdue={r.daysOverdue} />,
    },
    {
      key: 'amount',
      header: 'Tutar',
      className: 'text-right whitespace-nowrap',
      sortValue: (r) => r.amount,
      cell: (r) => (
        <span
          className={cn(
            'font-serif text-[14px] font-medium tabular-nums',
            r.amount < 0 && 'text-rose-700 dark:text-rose-300',
          )}
        >
          {r.amount < 0 ? '−' : ''}
          {formatTL(Math.abs(r.amount))}
        </span>
      ),
    },
  ]

  return (
    <PageShell
      eyebrow="MOD · FİNANS"
      title={
        <>
          Cari <em className="font-serif italic font-light">hesap</em>
        </>
      }
      description="Tahsilat, komisyon, gider ve bekleyen ödemeleri tek panelde takip et."
      actions={
        <>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium transition hover:bg-foreground/5"
          >
            <Download className="h-3.5 w-3.5" />
            Dışa aktar
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90"
          >
            <Plus className="h-3.5 w-3.5" />
            Yeni işlem
          </button>
        </>
      }
    >
      <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          icon={ArrowDownToLine}
          label="Bu ay tahsilat"
          value={kpis ? formatTLCompact(kpis.tahsilatBuMonth) : '…'}
          hint="tamamlanan"
          tone="emerald"
        />
        <KpiCard
          icon={Clock}
          label="Bekleyen tahsilat"
          value={kpis ? formatTLCompact(kpis.bekleyen) : '…'}
          hint={`${aging.reduce((s, b) => s + b.count, 0)} işlem`}
          tone="amber"
        />
        <KpiCard
          icon={Coins}
          label="Bu ay komisyon"
          value={kpis ? formatTLCompact(kpis.komisyonBuMonth) : '…'}
          hint="tamamlanan"
          tone="violet"
        />
        <KpiCard
          icon={TrendingDown}
          label="Bu ay gider + vergi"
          value={kpis ? formatTLCompact(kpis.giderBuMonth) : '…'}
          hint="ofis · marketing · KDV"
          tone="rose"
        />
      </section>

      <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
        <article className="rounded-2xl border border-border bg-card p-5">
          <header className="mb-3 flex items-baseline justify-between gap-3">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Son 6 ay
              </div>
              <h3 className="font-serif text-lg font-medium tracking-tight">
                Tahsilat & komisyon akışı
              </h3>
            </div>
            <div className="flex items-center gap-3 font-mono text-[10px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                Tahsilat
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-600" />
                Komisyon
              </span>
              <ChartExportMenu
                pngTarget={cashflowChartRef}
                csvData={cashflow as unknown as Record<string, unknown>[]}
                filename="nakit-akisi"
              />
            </div>
          </header>
          <div ref={cashflowChartRef}>
            {cashflow.length === 0 ? (
              <SkeletonChart className="border-0 p-0" />
            ) : (
              <LazyChart height={260}>
                <CashflowChart data={cashflow} />
              </LazyChart>
            )}
          </div>
        </article>

        <article className="rounded-2xl border border-border bg-card p-5">
          <header className="mb-2 flex items-start justify-between gap-3">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Yaşa göre
              </div>
              <h3 className="font-serif text-lg font-medium tracking-tight">
                Bekleyen tahsilat
              </h3>
            </div>
            <ChartExportMenu
              pngTarget={agingChartRef}
              csvData={aging as unknown as Record<string, unknown>[]}
              filename="bekleyen-tahsilat"
            />
          </header>
          <div ref={agingChartRef}>
            <LazyChart height={200}>
              <AgingDonut data={aging} />
            </LazyChart>
          </div>
          <div className="mt-4 space-y-1.5">
            {aging.map((b, i) => (
              <div key={b.label} className="flex items-center justify-between text-[12px]">
                <span className="inline-flex items-center gap-2">
                  <span
                    className={cn(
                      'h-1.5 w-1.5 rounded-full',
                      i === 0 && 'bg-emerald-500',
                      i === 1 && 'bg-amber-500',
                      i === 2 && 'bg-rose-500',
                    )}
                  />
                  <span className="text-muted-foreground">{b.label}</span>
                </span>
                <span className="font-mono tabular-nums">
                  {b.count} · {formatTLCompact(b.amount)}
                </span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="-mx-1 max-w-full overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card p-1">
          {TYPE_TABS.map((t) => {
            const count =
              t === 'Tümü'
                ? allTransactions.length
                : allTransactions.filter((x) => x.type === t).length
            const active = typeFilter === t
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTypeFilter(t)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition',
                  active
                    ? 'bg-foreground text-background shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {t}
                <span
                  className={cn(
                    'rounded-full px-1.5 font-mono text-[10px] tabular-nums',
                    active ? 'bg-background/20' : 'bg-foreground/[0.06]',
                  )}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium transition hover:bg-foreground/5"
        >
          <Filter className="h-3.5 w-3.5" />
          Daha fazla filtre
        </button>
      </section>

      {error ? (
        <ErrorState
          title="İşlemler yüklenemedi"
          error={error}
          onRetry={() => refetch()}
        />
      ) : isLoading ? (
        <div className="rounded-2xl border border-border bg-card">
          <SkeletonTable rows={6} cells={6} />
        </div>
      ) : (
      <div className={cn('transition-opacity', isPlaceholderData && 'opacity-60')}>
      <DataTable
        rows={filtered}
        columns={columns}
        rowKey={(r) => r.id}
        emptyTitle="İşlem yok"
        emptyDescription="Bu tipte kayıt bulunamadı."
        bulkActions={(selected, clear) => (
          <>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-[12px] font-medium transition hover:bg-foreground/5"
              onClick={clear}
            >
              Hatırlatma gönder ({selected.length})
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-1.5 text-[12px] font-medium text-background transition hover:opacity-90"
              onClick={clear}
            >
              <Receipt className="h-3 w-3" />
              Makbuz
            </button>
          </>
        )}
      />
      </div>
      )}
    </PageShell>
  )
}

function TypePill({ type }: { type: TxnType }) {
  const tones: Record<TxnType, string> = {
    Tahsilat: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    Komisyon: 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
    Gider: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
    Vergi: 'bg-slate-500/10 text-slate-700 dark:text-slate-300',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
        tones[type],
      )}
    >
      {type}
    </span>
  )
}

function StatusPill({
  status,
  daysOverdue,
}: {
  status: TxnStatus
  daysOverdue?: number
}) {
  const t = STATUS_TONES[status]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium',
        t.bg,
        t.fg,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', t.dot)} />
      {status}
      {status === 'Gecikmiş' && daysOverdue && (
        <span className="font-mono">+{daysOverdue}g</span>
      )}
    </span>
  )
}

const TONE_MAP = {
  emerald: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 dark:bg-emerald-400/10',
  amber: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 dark:bg-amber-400/10',
  rose: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 dark:bg-rose-400/10',
  violet: 'bg-violet-500/10 text-violet-700 dark:text-violet-300 dark:bg-violet-400/10',
  slate: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 dark:bg-slate-400/10',
} as const

function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: typeof AlertCircle
  label: string
  value: string
  hint: string
  tone: keyof typeof TONE_MAP
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <span className={cn('flex h-9 w-9 items-center justify-center rounded-xl', TONE_MAP[tone])}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 font-serif text-3xl font-light tracking-tight">{value}</div>
      <div className="mt-1.5 text-[11px] text-muted-foreground">{hint}</div>
    </div>
  )
}
