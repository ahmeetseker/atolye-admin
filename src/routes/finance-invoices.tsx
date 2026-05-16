import { useMemo, useState, useTransition } from 'react'
import { ArrowDownToLine, Download, FileText, Filter, Search } from '@landx/icons'
import { PageShell, cn, formatTL, formatTLCompact } from '@landx/ui'
import { useListOfficeInvoices } from '@landx/data'

type DateRange = 'all' | '30d' | '90d' | '12m'

const DATE_FILTERS: Array<{ value: DateRange; label: string }> = [
  { value: 'all', label: 'Tümü' },
  { value: '30d', label: 'Son 30g' },
  { value: '90d', label: 'Son 90g' },
  { value: '12m', label: 'Son 12 ay' },
]

function rangeToCutoff(range: DateRange): number | null {
  if (range === 'all') return null
  const now = Date.now()
  const days = range === '30d' ? 30 : range === '90d' ? 90 : 365
  return now - days * 24 * 60 * 60 * 1000
}

export function FinanceInvoices() {
  const { data: invoices = [], isLoading } = useListOfficeInvoices()
  const [range, setRange] = useState<DateRange>('all')
  const [query, setQuery] = useState('')
  const [, startTransition] = useTransition()

  const filtered = useMemo(() => {
    const cutoff = rangeToCutoff(range)
    const q = query.trim().toLowerCase()
    return invoices
      .filter((inv) => {
        if (cutoff !== null && new Date(inv.issuedAt).getTime() < cutoff) return false
        if (!q) return true
        return (
          inv.number.toLowerCase().includes(q) ||
          inv.buyerName.toLowerCase().includes(q) ||
          inv.lineItems.some((li) => li.name.toLowerCase().includes(q))
        )
      })
      .sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime())
  }, [invoices, range, query])

  const kpis = useMemo(() => {
    const total = filtered.reduce((s, i) => s + i.total, 0)
    const vat = filtered.reduce((s, i) => s + i.vatAmount, 0)
    return { total, vat, count: filtered.length }
  }, [filtered])

  return (
    <PageShell
      eyebrow="MOD · FİNANS · FATURALAR"
      title={
        <>
          E-fatura <em className="font-serif italic font-light">arşivi</em>
        </>
      }
      description={`${invoices.length} fatura · ${formatTLCompact(kpis.total / 100)} toplam · ${formatTLCompact(kpis.vat / 100)} KDV. KEP/e-fatura kayıtlarını indir.`}
      actions={
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium transition hover:bg-foreground/5"
        >
          <ArrowDownToLine className="h-3.5 w-3.5" />
          Toplu indir
        </button>
      }
    >
      <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3">
        <KpiCard
          icon={FileText}
          label="Fatura sayısı"
          value={`${kpis.count}`}
          hint={range === 'all' ? 'tüm dönem' : `${DATE_FILTERS.find((f) => f.value === range)?.label} aralığı`}
        />
        <KpiCard
          icon={FileText}
          label="Toplam tutar"
          value={formatTLCompact(kpis.total / 100)}
          hint="KDV dahil"
        />
        <KpiCard
          icon={FileText}
          label="KDV"
          value={formatTLCompact(kpis.vat / 100)}
          hint="hesaplanan KDV"
        />
      </section>

      <section className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Fatura no / kalem ara"
            aria-label="Faturalarda ara"
            className="w-full rounded-xl border border-border bg-card py-2 pl-9 pr-3 text-sm outline-none focus:border-foreground"
          />
        </div>

        <div
          role="tablist"
          aria-label="Tarih aralığı"
          className="inline-flex flex-wrap rounded-xl border border-border bg-card p-1"
        >
          {DATE_FILTERS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="tab"
              aria-selected={range === opt.value}
              onClick={() => startTransition(() => setRange(opt.value))}
              className={cn(
                'rounded-lg px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] transition',
                range === opt.value
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium transition hover:bg-foreground/5"
        >
          <Filter className="h-3.5 w-3.5" />
          Daha fazla filtre
        </button>
      </section>

      {isLoading ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          Faturalar yükleniyor…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          {query
            ? `"${query}" ile eşleşen fatura yok.`
            : 'Bu filtreyle eşleşen fatura bulunamadı.'}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-foreground/[0.02] font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Fatura no</th>
                <th className="px-4 py-3 font-medium">Tarih</th>
                <th className="px-4 py-3 font-medium">Kalemler</th>
                <th className="px-4 py-3 font-medium">Durum</th>
                <th className="px-4 py-3 text-right font-medium">KDV</th>
                <th className="px-4 py-3 text-right font-medium">Tutar</th>
                <th className="px-4 py-3 text-right font-medium">İndir</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((inv) => {
                const dateFmt = new Intl.DateTimeFormat('tr-TR', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                }).format(new Date(inv.issuedAt))
                const itemSummary =
                  inv.lineItems[0]?.name +
                  (inv.lineItems.length > 1 ? ` (+${inv.lineItems.length - 1})` : '')
                return (
                  <tr key={inv.id} className="transition hover:bg-foreground/[0.02]">
                    <td className="px-4 py-3">
                      <div className="font-mono text-[12px] font-medium text-foreground">
                        {inv.number}
                      </div>
                      <div className="font-mono text-[10px] text-muted-foreground">
                        {inv.buyerName}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-[12px] text-muted-foreground">
                        {dateFmt}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[13px] text-muted-foreground">
                      {itemSummary}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Gönderildi
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-mono text-[12px] tabular-nums text-muted-foreground">
                        {formatTL(inv.vatAmount / 100)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-serif text-[14px] font-medium tabular-nums">
                        {formatTL(inv.total / 100)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        aria-label={`Faturayı indir ${inv.number}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition hover:bg-foreground/5 hover:text-foreground"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </PageShell>
  )
}

function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof FileText
  label: string
  value: string
  hint: string
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground/10 text-foreground">
        <Icon className="h-4 w-4" />
      </span>
      <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 font-serif text-2xl font-light tracking-tight">{value}</div>
      <div className="mt-1.5 text-[11px] text-muted-foreground">{hint}</div>
    </div>
  )
}
