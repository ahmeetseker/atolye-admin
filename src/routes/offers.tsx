import { useCallback, useMemo, useState } from 'react'
import { Check, MessageSquare, X } from '@landx/icons'
import { PageShell, cn } from '@landx/ui'

type Status = 'pending' | 'countered' | 'accepted' | 'rejected' | 'expired'

interface Offer {
  id: string
  listingId: string
  listingTitle: string
  buyerName: string
  buyerScore: number
  amount: number
  listingPrice: number
  message: string
  status: Status
  createdAt: string
  validUntil: string
}

const SEED: Offer[] = [
  {
    id: 'O-4001',
    listingId: 'L-2401',
    listingTitle: 'Beykoz Acarkent · 1.250 m² konut arsa',
    buyerName: 'Hakan Şener',
    buyerScore: 88,
    amount: 7_500_000,
    listingPrice: 8_400_000,
    message: 'Nakit teklif, hızlı kapanış.',
    status: 'pending',
    createdAt: '2026-05-13T14:30:00Z',
    validUntil: '2026-05-20T23:59:59Z',
  },
  {
    id: 'O-4002',
    listingId: 'L-2403',
    listingTitle: 'Bodrum Yalıkavak · 850 m² ticari arsa',
    buyerName: 'Zeynep Tan',
    buyerScore: 72,
    amount: 14_000_000,
    listingPrice: 15_500_000,
    message: 'Yarısı peşin, 6 ay vade.',
    status: 'pending',
    createdAt: '2026-05-14T09:15:00Z',
    validUntil: '2026-05-21T23:59:59Z',
  },
  {
    id: 'O-4003',
    listingId: 'L-2402',
    listingTitle: 'Çeşme Alaçatı · 4.500 m² zeytinlik',
    buyerName: 'Murat Aydın',
    buyerScore: 65,
    amount: 11_200_000,
    listingPrice: 12_000_000,
    message: 'Banka kredisiyle alıyorum, ekspertiz gerekli.',
    status: 'countered',
    createdAt: '2026-05-12T16:45:00Z',
    validUntil: '2026-05-19T23:59:59Z',
  },
  {
    id: 'O-4004',
    listingId: 'L-2406',
    listingTitle: 'Kuşadası Davutlar · 2.100 m² konut',
    buyerName: 'Ayla Demir',
    buyerScore: 92,
    amount: 6_500_000,
    listingPrice: 6_500_000,
    message: 'Liste fiyatını kabul ediyorum, tapu hazır.',
    status: 'accepted',
    createdAt: '2026-05-10T11:00:00Z',
    validUntil: '2026-05-17T23:59:59Z',
  },
  {
    id: 'O-4005',
    listingId: 'L-2404',
    listingTitle: 'Kaş Çukurbağ · 3.200 m² turizm imarlı',
    buyerName: 'Ozan Kaya',
    buyerScore: 41,
    amount: 6_500_000,
    listingPrice: 9_800_000,
    message: 'Düşük teklif — pazarlık payı var mı?',
    status: 'rejected',
    createdAt: '2026-05-08T08:20:00Z',
    validUntil: '2026-05-15T23:59:59Z',
  },
]

const STATUS_TONE: Record<Status, string> = {
  pending: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  countered: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  accepted: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  rejected: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
  expired: 'bg-foreground/10 text-muted-foreground',
}

const STATUS_LABEL: Record<Status, string> = {
  pending: 'Bekliyor',
  countered: 'Karşı teklif',
  accepted: 'Kabul',
  rejected: 'Red',
  expired: 'Süresi doldu',
}

export function Offers() {
  const [items, setItems] = useState<Offer[]>(SEED)
  const [filter, setFilter] = useState<Status | 'all'>('all')
  const [counterFor, setCounterFor] = useState<string | null>(null)
  const [counterValue, setCounterValue] = useState('')

  const update = useCallback((id: string, status: Status, newAmount?: number) => {
    setItems((prev) =>
      prev.map((it) =>
        it.id === id ? { ...it, status, amount: newAmount ?? it.amount } : it,
      ),
    )
  }, [])

  const submitCounter = () => {
    if (!counterFor) return
    const v = Number(counterValue)
    if (!Number.isFinite(v) || v <= 0) return
    update(counterFor, 'countered', v)
    setCounterFor(null)
    setCounterValue('')
  }

  const filtered = useMemo(
    () => (filter === 'all' ? items : items.filter((it) => it.status === filter)),
    [items, filter],
  )

  const counts = useMemo(
    () => ({
      pending: items.filter((it) => it.status === 'pending').length,
      countered: items.filter((it) => it.status === 'countered').length,
      accepted: items.filter((it) => it.status === 'accepted').length,
      rejected: items.filter((it) => it.status === 'rejected').length,
      all: items.length,
    }),
    [items],
  )

  return (
    <PageShell
      eyebrow="MOD · TEKLİFLER"
      title={
        <>
          Aldığım <em className="font-serif italic font-light">teklifler</em>
        </>
      }
      description={`${counts.pending} bekleyen · ${counts.countered} karşı teklif · ${counts.accepted} kabul · ${counts.rejected} red.`}
    >
      <section className="mb-5 flex flex-wrap items-center gap-2">
        {(['all', 'pending', 'countered', 'accepted', 'rejected'] as const).map((k) => {
          const active = filter === k
          const count = counts[k]
          const label = k === 'all' ? 'Hepsi' : STATUS_LABEL[k as Status]
          return (
            <button
              key={k}
              type="button"
              onClick={() => setFilter(k)}
              data-testid={`offers-filter-${k}`}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium transition',
                active
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-border bg-card text-muted-foreground hover:text-foreground',
              )}
            >
              {label}
              <span className="font-mono text-[10px] tabular-nums opacity-70">{count}</span>
            </button>
          )
        })}
      </section>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center text-muted-foreground">
          Bu filtrede teklif yok.
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((o) => {
            const pct = ((o.amount / o.listingPrice - 1) * 100).toFixed(1)
            const isCountering = counterFor === o.id

            return (
              <li
                key={o.id}
                data-testid="offer-row"
                className="rounded-2xl border border-border bg-card p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[10px] text-muted-foreground">{o.id}</span>
                      <span className="font-medium">{o.listingTitle}</span>
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[10px] font-medium uppercase',
                          STATUS_TONE[o.status],
                        )}
                      >
                        {STATUS_LABEL[o.status]}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-3 text-[12px]">
                      <span className="font-medium">{o.buyerName}</span>
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        Alıcı skoru:
                        <span
                          className={cn(
                            'rounded-full px-1.5 py-0.5 font-mono tabular-nums',
                            o.buyerScore >= 80
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                              : o.buyerScore >= 50
                                ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
                                : 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
                          )}
                        >
                          {o.buyerScore}
                        </span>
                      </span>
                      <span className="text-muted-foreground">
                        {new Date(o.createdAt).toLocaleDateString('tr-TR')}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-[12px]">
                      <span>
                        Teklif: <strong>₺{o.amount.toLocaleString('tr-TR')}</strong>
                      </span>
                      <span className="text-muted-foreground">
                        Liste: ₺{o.listingPrice.toLocaleString('tr-TR')}
                      </span>
                      <span
                        className={
                          Number(pct) < 0
                            ? 'text-rose-700 dark:text-rose-300'
                            : 'text-emerald-700 dark:text-emerald-300'
                        }
                      >
                        ({pct}%)
                      </span>
                    </div>
                    <div className="mt-2 rounded-xl bg-foreground/[0.04] p-2 text-[12px] text-muted-foreground">
                      "{o.message}"
                    </div>
                  </div>
                  {o.status === 'pending' || o.status === 'countered' ? (
                    <div className="flex flex-col gap-1.5">
                      <button
                        type="button"
                        onClick={() => update(o.id, 'accepted')}
                        data-testid={`offer-accept-${o.id}`}
                        className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white hover:opacity-90"
                      >
                        <Check className="h-3 w-3" />
                        Kabul
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCounterFor(o.id)
                          setCounterValue(String(Math.round(((o.amount + o.listingPrice) / 2) / 1000) * 1000))
                        }}
                        data-testid={`offer-counter-${o.id}`}
                        className="inline-flex items-center gap-1 rounded-xl border border-border bg-card px-2.5 py-1.5 text-xs font-medium hover:bg-foreground/5"
                      >
                        <MessageSquare className="h-3 w-3" />
                        Karşı teklif
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm('Teklifi reddetmek istediğinden emin misin?')) {
                            update(o.id, 'rejected')
                          }
                        }}
                        data-testid={`offer-reject-${o.id}`}
                        className="inline-flex items-center gap-1 rounded-xl bg-rose-600 px-2.5 py-1.5 text-xs font-medium text-white hover:opacity-90"
                      >
                        <X className="h-3 w-3" />
                        Red
                      </button>
                    </div>
                  ) : null}
                </div>

                {isCountering && (
                  <div className="mt-3 flex gap-2 rounded-xl border border-border bg-background p-3">
                    <input
                      type="number"
                      value={counterValue}
                      onChange={(e) => setCounterValue(e.target.value)}
                      placeholder="Karşı teklif tutarı (TL)"
                      className="flex-1 rounded-lg border border-border bg-card px-3 py-1.5 text-sm outline-none focus:border-foreground"
                    />
                    <button
                      type="button"
                      onClick={submitCounter}
                      className="rounded-lg bg-foreground px-3 py-1.5 text-sm font-medium text-background"
                    >
                      Gönder
                    </button>
                    <button
                      type="button"
                      onClick={() => setCounterFor(null)}
                      className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium"
                    >
                      Vazgeç
                    </button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </PageShell>
  )
}
