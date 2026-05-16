import { useMemo, useState } from 'react'
import { PageShell, cn } from '@landx/ui'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Bar,
  BarChart,
  Cell,
} from 'recharts'

type Range = '7d' | '30d' | '90d'

interface FunnelStep {
  label: string
  value: number
}

interface DailyPoint {
  date: string
  views: number
  favorites: number
  messages: number
  offers: number
}

const FUNNEL_30D: FunnelStep[] = [
  { label: 'Görüntülenme', value: 4_280 },
  { label: 'Favori', value: 412 },
  { label: 'Mesaj', value: 138 },
  { label: 'Görme talebi', value: 64 },
  { label: 'Teklif', value: 23 },
  { label: 'Kapanış', value: 5 },
]

const FUNNEL_7D: FunnelStep[] = [
  { label: 'Görüntülenme', value: 1_120 },
  { label: 'Favori', value: 98 },
  { label: 'Mesaj', value: 32 },
  { label: 'Görme talebi', value: 14 },
  { label: 'Teklif', value: 6 },
  { label: 'Kapanış', value: 1 },
]

const FUNNEL_90D: FunnelStep[] = [
  { label: 'Görüntülenme', value: 12_840 },
  { label: 'Favori', value: 1_236 },
  { label: 'Mesaj', value: 412 },
  { label: 'Görme talebi', value: 198 },
  { label: 'Teklif', value: 73 },
  { label: 'Kapanış', value: 18 },
]

const DAILY: DailyPoint[] = [
  { date: '01 May', views: 134, favorites: 12, messages: 4, offers: 1 },
  { date: '03 May', views: 142, favorites: 11, messages: 5, offers: 0 },
  { date: '05 May', views: 178, favorites: 18, messages: 6, offers: 1 },
  { date: '07 May', views: 156, favorites: 14, messages: 5, offers: 2 },
  { date: '09 May', views: 198, favorites: 19, messages: 7, offers: 1 },
  { date: '11 May', views: 215, favorites: 22, messages: 8, offers: 2 },
  { date: '13 May', views: 244, favorites: 28, messages: 9, offers: 3 },
  { date: '15 May', views: 261, favorites: 31, messages: 11, offers: 2 },
]

const FUNNEL_BY_RANGE: Record<Range, FunnelStep[]> = {
  '7d': FUNNEL_7D,
  '30d': FUNNEL_30D,
  '90d': FUNNEL_90D,
}

export function Performance() {
  const [range, setRange] = useState<Range>('30d')
  const funnel = FUNNEL_BY_RANGE[range]

  const max = funnel[0].value
  const conversions = useMemo(() => {
    return funnel.slice(1).map((step, i) => {
      const prev = funnel[i].value
      return prev > 0 ? (step.value / prev) * 100 : 0
    })
  }, [funnel])

  const totalConv = funnel.length > 1 ? (funnel[funnel.length - 1].value / funnel[0].value) * 100 : 0

  return (
    <PageShell
      eyebrow="MOD · PERFORMANS"
      title={
        <>
          İlan <em className="font-serif italic font-light">performansı</em>
        </>
      }
      description={`Görüntüleme → kapanış dönüşüm hunisi · seçili aralık: ${range === '7d' ? '7 gün' : range === '30d' ? '30 gün' : '90 gün'}.`}
    >
      <section className="mb-5 flex items-center gap-2">
        {(['7d', '30d', '90d'] as const).map((k) => {
          const active = range === k
          return (
            <button
              key={k}
              type="button"
              onClick={() => setRange(k)}
              data-testid={`perf-range-${k}`}
              className={cn(
                'rounded-full border px-3 py-1.5 text-[13px] font-medium transition',
                active
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-border bg-card text-muted-foreground hover:text-foreground',
              )}
            >
              {k === '7d' ? '7 gün' : k === '30d' ? '30 gün' : '90 gün'}
            </button>
          )
        })}
      </section>

      <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Görüntülenme" value={funnel[0].value.toLocaleString('tr-TR')} />
        <Stat label="Mesaj" value={funnel[2].value.toLocaleString('tr-TR')} />
        <Stat label="Teklif" value={funnel[4].value.toLocaleString('tr-TR')} />
        <Stat label="Kapanış oranı" value={`%${totalConv.toFixed(2)}`} />
      </section>

      <section className="mb-6 rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-4 font-serif text-lg font-medium">Dönüşüm hunisi</h2>
        <ul className="space-y-3">
          {funnel.map((step, i) => {
            const pct = (step.value / max) * 100
            const conv = i > 0 ? conversions[i - 1] : 100
            return (
              <li key={step.label} data-testid={`funnel-step-${i}`}>
                <div className="mb-1 flex items-baseline justify-between text-sm">
                  <span className="font-medium">{step.label}</span>
                  <span className="font-mono text-[12px] tabular-nums">
                    {step.value.toLocaleString('tr-TR')}
                    {i > 0 && (
                      <span className="ml-2 text-muted-foreground">({conv.toFixed(1)}%)</span>
                    )}
                  </span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-foreground/[0.06]">
                  <div
                    className="h-full rounded-full bg-foreground transition-all"
                    style={{ width: `${pct}%`, opacity: 1 - i * 0.1 }}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-medium">Günlük görüntüleme</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={DAILY} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="views"
                  stroke="hsl(var(--foreground))"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-medium">Günlük etkileşim (favori · mesaj · teklif)</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={DAILY} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="favorites" radius={[6, 6, 0, 0]} fill="hsl(var(--foreground))" fillOpacity={0.85}>
                  {DAILY.map((_, i) => (
                    <Cell key={`f${i}`} />
                  ))}
                </Bar>
                <Bar dataKey="messages" radius={[6, 6, 0, 0]} fill="hsl(var(--foreground))" fillOpacity={0.6}>
                  {DAILY.map((_, i) => (
                    <Cell key={`m${i}`} />
                  ))}
                </Bar>
                <Bar dataKey="offers" radius={[6, 6, 0, 0]} fill="hsl(var(--foreground))" fillOpacity={0.4}>
                  {DAILY.map((_, i) => (
                    <Cell key={`o${i}`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
    </PageShell>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-2xl border border-border bg-card p-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 font-serif text-2xl font-light tabular-nums">{value}</div>
    </article>
  )
}
