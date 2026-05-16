import { useMemo, useState } from 'react'
import { ArrowUpRight, Building2, Check, Coins, Plus, Users } from '@landx/icons'
import { PageShell, cn } from '@landx/ui'
import { formatTL } from '@landx/ui'

type PlanTier = 'starter' | 'pro' | 'enterprise'

type OfficePlan = {
  id: PlanTier
  name: string
  monthly: number
  seatLimit: number | null
  listingQuota: number | null
  features: string[]
}

const PLANS: OfficePlan[] = [
  {
    id: 'starter',
    name: 'Başlangıç',
    monthly: 1490,
    seatLimit: 3,
    listingQuota: 50,
    features: ['3 çalışan koltuğu', '50 aktif ilan', 'Temel raporlama', 'E-posta destek'],
  },
  {
    id: 'pro',
    name: 'Profesyonel',
    monthly: 3990,
    seatLimit: 10,
    listingQuota: 250,
    features: [
      '10 çalışan koltuğu',
      '250 aktif ilan',
      'Gelişmiş raporlama + ihracat',
      'AI asistan (sınırlı)',
      'Öncelikli destek',
    ],
  },
  {
    id: 'enterprise',
    name: 'Kurumsal',
    monthly: 9990,
    seatLimit: null,
    listingQuota: null,
    features: [
      'Sınırsız koltuk',
      'Sınırsız ilan',
      'Özel API erişimi',
      'Adanmış hesap yöneticisi',
      'SLA garantisi',
    ],
  },
]

const CURRENT_SUBSCRIPTION = {
  planId: 'pro' as PlanTier,
  status: 'active' as const,
  renewalDate: '2026-06-15',
  seatsUsed: 7,
  listingsUsed: 184,
  startedAt: '2025-09-15',
  monthlySpend: 3990,
}

export function FinanceSubscription() {
  const [, setSelectedPlan] = useState<PlanTier | null>(null)

  const currentPlan = useMemo(
    () => PLANS.find((p) => p.id === CURRENT_SUBSCRIPTION.planId)!,
    [],
  )

  const seatPct = currentPlan.seatLimit
    ? Math.round((CURRENT_SUBSCRIPTION.seatsUsed / currentPlan.seatLimit) * 100)
    : 0
  const listingPct = currentPlan.listingQuota
    ? Math.round((CURRENT_SUBSCRIPTION.listingsUsed / currentPlan.listingQuota) * 100)
    : 0

  const renewalFmt = new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(CURRENT_SUBSCRIPTION.renewalDate))

  return (
    <PageShell
      eyebrow="MOD · FİNANS · ABONELİK"
      title={
        <>
          Ofis <em className="font-serif italic font-light">aboneliği</em>
        </>
      }
      description={`Mevcut plan: ${currentPlan.name} · Yenileme ${renewalFmt}. Çalışan kotası ve ilan limiti tek panelde.`}
      actions={
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl bg-foreground px-3.5 py-2 text-sm font-medium text-background transition hover:opacity-90"
        >
          <ArrowUpRight className="h-3.5 w-3.5" />
          Plan değiştir
        </button>
      }
    >
      <section className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-3">
        <KpiCard
          icon={Building2}
          label="Mevcut plan"
          value={currentPlan.name}
          hint={`${formatTL(currentPlan.monthly)}/ay`}
        />
        <UsageCard
          icon={Users}
          label="Çalışan kotası"
          used={CURRENT_SUBSCRIPTION.seatsUsed}
          total={currentPlan.seatLimit}
          pct={seatPct}
        />
        <UsageCard
          icon={Coins}
          label="Aktif ilan"
          used={CURRENT_SUBSCRIPTION.listingsUsed}
          total={currentPlan.listingQuota}
          pct={listingPct}
        />
      </section>

      <section className="mb-6 rounded-2xl border border-border bg-card p-5">
        <header className="mb-4 flex items-center justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Yenileme
            </div>
            <h3 className="mt-1 font-serif text-lg font-medium tracking-tight">
              {renewalFmt} tarihinde otomatik yenilenecek
            </h3>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium transition hover:bg-foreground/5"
          >
            Aboneliği yönet
          </button>
        </header>
        <p className="text-sm text-muted-foreground">
          Bir sonraki ödeme tutarı:{' '}
          <span className="font-medium text-foreground">
            {formatTL(CURRENT_SUBSCRIPTION.monthlySpend)}
          </span>{' '}
          · Kayıtlı kart ile otomatik tahsil edilir. İptal istersen yenileme tarihinden 24
          saat önce yapmalısın.
        </p>
      </section>

      <section>
        <header className="mb-4 flex items-baseline justify-between">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Mevcut planlar
            </div>
            <h3 className="mt-1 font-serif text-2xl font-light tracking-tight">
              Plan karşılaştırma
            </h3>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {PLANS.map((plan) => {
            const isCurrent = plan.id === CURRENT_SUBSCRIPTION.planId
            return (
              <article
                key={plan.id}
                className={cn(
                  'relative flex flex-col rounded-2xl border bg-card p-5 transition',
                  isCurrent ? 'border-foreground/40 ring-1 ring-foreground/10' : 'border-border',
                )}
              >
                {isCurrent && (
                  <span className="absolute -top-2.5 right-4 inline-flex items-center rounded-full bg-foreground px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-background">
                    Mevcut
                  </span>
                )}
                <header className="mb-3">
                  <h4 className="font-serif text-xl font-light tracking-tight">{plan.name}</h4>
                </header>
                <div className="mb-4 flex items-baseline gap-1">
                  <span className="font-serif text-3xl font-light tabular-nums">
                    {formatTL(plan.monthly)}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">/ay</span>
                </div>
                <ul className="mb-5 flex flex-1 flex-col gap-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[13px] leading-snug">
                      <Check className="mt-0.5 h-3.5 w-3.5 flex-none text-foreground/70" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  disabled={isCurrent}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={cn(
                    'inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium transition',
                    isCurrent
                      ? 'cursor-default bg-foreground/10 text-muted-foreground'
                      : 'bg-foreground text-background hover:opacity-90',
                  )}
                >
                  {isCurrent ? 'Mevcut plan' : 'Bu plana geç'}
                </button>
              </article>
            )
          })}
        </div>
      </section>
    </PageShell>
  )
}

function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Plus
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

function UsageCard({
  icon: Icon,
  label,
  used,
  total,
  pct,
}: {
  icon: typeof Plus
  label: string
  used: number
  total: number | null
  pct: number
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground/10 text-foreground">
        <Icon className="h-4 w-4" />
      </span>
      <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="font-serif text-2xl font-light tabular-nums">{used}</span>
        <span className="font-mono text-xs text-muted-foreground">
          / {total === null ? '∞' : total}
        </span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-foreground/[0.06]">
        <div
          className="h-full rounded-full bg-foreground/60 transition-all"
          style={{ width: total === null ? '12%' : `${Math.min(pct, 100)}%` }}
        />
      </div>
      <div className="mt-1.5 font-mono text-[11px] text-muted-foreground tabular-nums">
        {total === null ? 'Sınırsız' : `%${pct} kullanıldı`}
      </div>
    </div>
  )
}
