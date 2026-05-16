import { ArrowUpRight, CreditCard, Download, FileText } from '@landx/icons'
import { Dialog, formatTL } from '@landx/ui'
import { ACCOUNT_PLAN } from '@landx/data'

interface BillingSheetProps {
  open: boolean
  onClose: () => void
}

interface InvoiceItem {
  id: string
  period: string
  amount: number
  status: 'Ödendi' | 'Beklemede'
  paidAt: string
}

const INVOICES: InvoiceItem[] = [
  {
    id: 'INV-2026-04',
    period: 'Nisan 2026',
    amount: 4890,
    status: 'Ödendi',
    paidAt: '2026-04-30',
  },
  {
    id: 'INV-2026-03',
    period: 'Mart 2026',
    amount: 4890,
    status: 'Ödendi',
    paidAt: '2026-03-30',
  },
  {
    id: 'INV-2026-02',
    period: 'Şubat 2026',
    amount: 4890,
    status: 'Ödendi',
    paidAt: '2026-02-28',
  },
  {
    id: 'INV-2026-01',
    period: 'Ocak 2026',
    amount: 3890,
    status: 'Ödendi',
    paidAt: '2026-01-30',
  },
]

export function BillingSheet({ open, onClose }: BillingSheetProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title={
        <span className="flex flex-col gap-0.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            MOD · FATURALAMA
          </span>
          <span className="font-serif text-lg font-light tracking-tight">
            Abonelik <em className="font-serif italic font-light">ve fatura</em>
          </span>
        </span>
      }
      description={`${ACCOUNT_PLAN.name} · ${formatTL(ACCOUNT_PLAN.monthlyPrice)}/ay`}
      footer={
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-1.5 text-xs font-medium text-background transition-opacity hover:opacity-90"
        >
          <ArrowUpRight className="h-3.5 w-3.5" />
          Plan yükselt
        </button>
      }
    >
      <div className="space-y-5">
        <section className="overflow-hidden rounded-2xl border border-border bg-background/40 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Mevcut plan
              </span>
              <h4 className="mt-1 font-serif text-2xl font-light tracking-tight">
                {ACCOUNT_PLAN.name}
              </h4>
              <p className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
                Yenileme:{' '}
                {new Date(ACCOUNT_PLAN.renewAt).toLocaleDateString('tr-TR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-foreground/[0.06] text-foreground/80">
              <CreditCard className="h-4 w-4" />
            </span>
          </div>
        </section>

        <section>
          <h4 className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Bu ay kullanım
          </h4>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <UsageCard label="Aktif ilan" value="47" total="∞" />
            <UsageCard
              label="Ekip üyesi"
              value={String(ACCOUNT_PLAN.seatsUsed)}
              total={String(ACCOUNT_PLAN.seatsTotal)}
            />
            <UsageCard label="Storage" value="3.2 GB" total="50 GB" />
          </div>
        </section>

        <section>
          <h4 className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Fatura geçmişi
          </h4>
          <ul className="space-y-2">
            {INVOICES.map((inv) => (
              <li
                key={inv.id}
                className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-background/40 p-3 sm:flex-nowrap sm:gap-3"
              >
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-foreground/[0.06] text-foreground/80">
                  <FileText className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <h5 className="truncate text-[13.5px] font-medium leading-tight">
                      {inv.period}
                    </h5>
                    <span className="inline-flex rounded-full bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                      {inv.status}
                    </span>
                  </div>
                  <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    {inv.id} · ödendi{' '}
                    {new Date(inv.paidAt).toLocaleDateString('tr-TR', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <span className="font-serif text-[14px] font-medium tabular-nums sm:text-[15px]">
                  {formatTL(inv.amount)}
                </span>
                <button
                  type="button"
                  aria-label="Fatura indir"
                  className="inline-flex h-8 w-8 flex-none items-center justify-center rounded-lg border border-border bg-background/60 text-muted-foreground transition hover:bg-foreground/[0.05] hover:text-foreground"
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </Dialog>
  )
}

function UsageCard({
  label,
  value,
  total,
}: {
  label: string
  value: string
  total: string
}) {
  return (
    <div className="rounded-xl border border-border bg-background/40 p-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="font-serif text-xl font-light tabular-nums">{value}</span>
        <span className="font-mono text-[11px] text-muted-foreground">
          / {total}
        </span>
      </div>
    </div>
  )
}
