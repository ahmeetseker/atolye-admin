import { useMemo, useState, useTransition } from 'react'
import { useSearchParams } from 'react-router'
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Filter,
  Handshake,
  MapPin,
  Plus,
  TrendingUp,
} from '@landx/icons'
import { PageShell, ErrorState, SkeletonCard } from '@landx/ui'
import {
  STAGE_ORDER,
  useDealMove,
  useDeals,
  useCreateDeal,
  useUpdateDeal,
  useDeleteDeal,
  type Deal,
} from '@landx/data'
import type { CustomerStage } from '@landx/data'
import { formatTLCompact, timeAgo } from '@landx/ui'
import { cn } from '@landx/ui'
import { DealDetailDrawer } from '@/components/deal-edit/DealDetailDrawer'
import { EditDealDrawer } from '@/components/deal-edit/EditDealDrawer'
import { DeleteDealDialog } from '@/components/deal-edit/DeleteDealDialog'
import { NewDealModal } from '@/components/deal-edit/NewDealModal'
import { RowActionsMenu } from '@/components/deal-edit/RowActionsMenu'

const STAGE_META: Record<CustomerStage, { tone: string; subtitle: string }> = {
  'İlk temas': { tone: 'slate', subtitle: 'Yeni gelen' },
  'Görüşme': { tone: 'sky', subtitle: 'Aktif görüşme' },
  'Teklif': { tone: 'violet', subtitle: 'Teklif sunuldu' },
  'Kaparo': { tone: 'amber', subtitle: 'Kaparo alındı' },
  'Tapu': { tone: 'emerald', subtitle: 'Tapuda' },
}

const TONE_MAP = {
  slate: 'text-slate-700 dark:text-slate-300 bg-slate-500/10 dark:bg-slate-400/10 border-slate-500/20',
  sky: 'text-sky-700 dark:text-sky-300 bg-sky-500/10 dark:bg-sky-400/10 border-sky-500/20',
  violet:
    'text-violet-700 dark:text-violet-300 bg-violet-500/10 dark:bg-violet-400/10 border-violet-500/20',
  amber:
    'text-amber-700 dark:text-amber-300 bg-amber-500/10 dark:bg-amber-400/10 border-amber-500/20',
  emerald:
    'text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 dark:bg-emerald-400/10 border-emerald-500/20',
  rose:
    'text-rose-700 dark:text-rose-300 bg-rose-500/10 dark:bg-rose-400/10 border-rose-500/20',
} as const

export function Sales() {
  const { data: deals = [], isLoading, error, refetch } = useDeals()
  const moveDealMutation = useDealMove()
  const createMutation = useCreateDeal()
  const updateMutation = useUpdateDeal()
  const deleteMutation = useDeleteDeal()

  const [searchParams, setSearchParams] = useSearchParams()
  const detailId = searchParams.get('detail')
  const [editTarget, setEditTarget] = useState<Deal | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Deal | null>(null)
  const [newOpen, setNewOpen] = useState(false)
  const [, startUiTransition] = useTransition()

  const stageMap = useMemo(() => {
    const m: Record<CustomerStage, Deal[]> = {
      'İlk temas': [],
      'Görüşme': [],
      'Teklif': [],
      'Kaparo': [],
      'Tapu': [],
    }
    for (const d of deals) m[d.stage].push(d)
    return m
  }, [deals])

  const detailTarget = useMemo(
    () => (detailId ? deals.find((d) => d.id === detailId) ?? null : null),
    [detailId, deals],
  )

  const openDetail = (deal: Deal) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set('detail', deal.id)
        return next
      },
      { replace: false },
    )
  }

  const closeDetail = () => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('detail')
        return next
      },
      { replace: true },
    )
  }

  const moveDeal = (deal: Deal, toStage: CustomerStage) => {
    if (deal.stage === toStage) return
    moveDealMutation.mutate({ id: deal.id, toStage })
  }

  const handleEditSubmit = (input: Parameters<typeof updateMutation.mutate>[0]) => {
    updateMutation.mutate(input, {
      onSuccess: () => {
        startUiTransition(() => setEditTarget(null))
      },
    })
  }

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        startUiTransition(() => setDeleteTarget(null))
      },
    })
  }

  const handleCreateSubmit = (input: Parameters<typeof createMutation.mutate>[0]) => {
    createMutation.mutate(input, {
      onSuccess: () => {
        startUiTransition(() => setNewOpen(false))
      },
    })
  }

  const totalValue = deals.reduce((s, d) => s + d.value, 0)
  const riskCount = deals.filter((d) => d.status === 'Risk').length
  const closedThisMonth = stageMap['Tapu'].length

  return (
    <PageShell
      eyebrow="MOD · SATIŞ"
      title={
        <>
          Satış <em className="font-serif italic font-light">panosu</em>
        </>
      }
      description={`${deals.length} aktif fırsat · ${stageMap['Kaparo'].length} kaparo · ${closedThisMonth} bu ay kapatıldı.`}
      actions={
        <>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium transition hover:bg-foreground/5"
          >
            <Filter className="h-3.5 w-3.5" />
            Filtre
          </button>
          <button
            type="button"
            data-testid="deal-new-open"
            onClick={() => startUiTransition(() => setNewOpen(true))}
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90"
          >
            <Plus className="h-3.5 w-3.5" />
            Yeni fırsat
          </button>
        </>
      }
    >
      {error ? (
        <ErrorState
          title="Fırsatlar yüklenemedi"
          description="Sunucuya ulaşılamadı. Tekrar dener misin?"
          error={error}
          onRetry={() => refetch()}
        />
      ) : isLoading && deals.length === 0 ? (
        <section
          data-testid="sales-skeleton"
          className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5"
        >
          {STAGE_ORDER.map((stage) => (
            <div key={stage} className="flex flex-col gap-3 rounded-2xl border border-border bg-card/60 p-3">
              <div className="px-1">
                <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  {stage}
                </div>
              </div>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ))}
        </section>
      ) : (
        <>
          <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <KpiCard
              icon={Handshake}
              label="Toplam değer"
              value={formatTLCompact(totalValue)}
              hint={`${deals.length} fırsat`}
              tone="emerald"
            />
            <KpiCard
              icon={CheckCircle2}
              label="Tapuya gidiyor"
              value={String(stageMap['Kaparo'].length + stageMap['Tapu'].length)}
              hint="Kaparo + Tapu aşamasında"
              tone="amber"
            />
            <KpiCard
              icon={AlertCircle}
              label="Risk altında"
              value={String(riskCount)}
              hint="14+ gün hareketsiz"
              tone={riskCount > 0 ? 'rose' : 'slate'}
            />
            <KpiCard
              icon={TrendingUp}
              label="Bu ay kapanan"
              value={String(closedThisMonth)}
              hint={`₺ ${formatTLCompact(
                stageMap['Tapu'].reduce((s, d) => s + d.value, 0),
              ).replace('₺ ', '')} ciro`}
              tone="emerald"
            />
          </section>

          <FunnelStrip stageMap={stageMap} totalDeals={deals.length} />

          <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
            {STAGE_ORDER.map((stage) => (
              <StageColumn
                key={stage}
                stage={stage}
                deals={stageMap[stage]}
                allStages={STAGE_ORDER}
                onMove={moveDeal}
                onOpenDetail={(d) => startUiTransition(() => openDetail(d))}
                onEdit={(d) => startUiTransition(() => setEditTarget(d))}
                onDelete={(d) => startUiTransition(() => setDeleteTarget(d))}
                isMoving={moveDealMutation.isPending}
              />
            ))}
          </section>
        </>
      )}

      <DealDetailDrawer
        open={detailTarget !== null}
        deal={detailTarget}
        onClose={() => startUiTransition(() => closeDetail())}
        onEdit={(d) =>
          startUiTransition(() => {
            closeDetail()
            setEditTarget(d)
          })
        }
        onDelete={(d) =>
          startUiTransition(() => {
            closeDetail()
            setDeleteTarget(d)
          })
        }
      />

      <EditDealDrawer
        open={editTarget !== null}
        deal={editTarget}
        pending={updateMutation.isPending}
        error={updateMutation.error}
        onSubmit={handleEditSubmit}
        onClose={() => {
          if (updateMutation.isPending) return
          startUiTransition(() => {
            setEditTarget(null)
            updateMutation.reset()
          })
        }}
      />

      <DeleteDealDialog
        open={deleteTarget !== null}
        id={deleteTarget?.id}
        customerName={deleteTarget?.customerName}
        pending={deleteMutation.isPending}
        error={deleteMutation.error}
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          if (deleteMutation.isPending) return
          startUiTransition(() => {
            setDeleteTarget(null)
            deleteMutation.reset()
          })
        }}
      />

      <NewDealModal
        open={newOpen}
        pending={createMutation.isPending}
        error={createMutation.error}
        onSubmit={handleCreateSubmit}
        onClose={() => {
          if (createMutation.isPending) return
          startUiTransition(() => {
            setNewOpen(false)
            createMutation.reset()
          })
        }}
      />
    </PageShell>
  )
}

function StageColumn({
  stage,
  deals,
  allStages,
  onMove,
  onOpenDetail,
  onEdit,
  onDelete,
  isMoving,
}: {
  stage: CustomerStage
  deals: Deal[]
  allStages: CustomerStage[]
  onMove: (deal: Deal, to: CustomerStage) => void
  onOpenDetail: (deal: Deal) => void
  onEdit: (deal: Deal) => void
  onDelete: (deal: Deal) => void
  isMoving?: boolean
}) {
  const meta = STAGE_META[stage]
  const total = deals.reduce((s, d) => s + d.value, 0)

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card/60 p-3">
      <header className="flex items-center justify-between gap-2 px-1">
        <div>
          <div className="flex items-center gap-2">
            <span
              aria-hidden
              className={cn(
                'inline-block h-2 w-2 rounded-full',
                meta.tone === 'slate' && 'bg-slate-500',
                meta.tone === 'sky' && 'bg-sky-500',
                meta.tone === 'violet' && 'bg-violet-500',
                meta.tone === 'amber' && 'bg-amber-500',
                meta.tone === 'emerald' && 'bg-emerald-500',
              )}
            />
            <h2 className="font-serif text-base font-medium tracking-tight">{stage}</h2>
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            {meta.subtitle} · {deals.length} fırsat
          </p>
        </div>
        <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
          {total > 0 ? formatTLCompact(total) : '—'}
        </span>
      </header>

      <ul className={cn('flex flex-col gap-2', isMoving && 'opacity-80')}>
        {deals.length === 0 && (
          <li className="rounded-xl border border-dashed border-border/60 bg-background/40 px-3 py-6 text-center font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            Boş kolon
          </li>
        )}
        {deals.map((d) => (
          <li key={d.id}>
            <DealCard
              deal={d}
              currentStage={stage}
              allStages={allStages}
              onMove={onMove}
              onOpenDetail={onOpenDetail}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          </li>
        ))}
      </ul>
    </section>
  )
}

function DealCard({
  deal,
  currentStage,
  allStages,
  onMove,
  onOpenDetail,
  onEdit,
  onDelete,
}: {
  deal: Deal
  currentStage: CustomerStage
  allStages: CustomerStage[]
  onMove: (deal: Deal, to: CustomerStage) => void
  onOpenDetail: (deal: Deal) => void
  onEdit: (deal: Deal) => void
  onDelete: (deal: Deal) => void
}) {
  const [stageMenuOpen, setStageMenuOpen] = useState(false)
  const isRisk = deal.status === 'Risk'

  return (
    <article
      data-testid={`deal-card-${deal.id}`}
      onClick={() => onOpenDetail(deal)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpenDetail(deal)
        }
      }}
      role="button"
      tabIndex={0}
      className={cn(
        'group relative cursor-pointer rounded-xl border border-border bg-card p-3 transition hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(80,60,40,0.10)] focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30',
        isRisk && 'border-rose-500/40',
      )}
    >
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[10px] text-muted-foreground">{deal.id}</span>
            {isRisk && (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-1.5 py-0 text-[9px] font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-300">
                <AlertCircle className="h-2.5 w-2.5" />
                Risk
              </span>
            )}
          </div>
          <h3 className="mt-0.5 truncate text-[13px] font-semibold leading-tight">
            {deal.customerName}
          </h3>
        </div>
        <div
          className="flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            aria-label="Aşama değiştir"
            data-testid={`deal-stage-toggle-${deal.id}`}
            onClick={(e) => {
              e.stopPropagation()
              setStageMenuOpen((v) => !v)
            }}
            className="flex h-7 items-center rounded-md px-1.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground transition hover:bg-foreground/10 hover:text-foreground"
          >
            Aşama
          </button>
          <RowActionsMenu
            id={deal.id}
            label={`${deal.id} işlemleri`}
            onDetail={() => onOpenDetail(deal)}
            onEdit={() => onEdit(deal)}
            onDelete={() => onDelete(deal)}
          />
        </div>
      </header>

      <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
        <MapPin className="h-3 w-3" />
        <span className="truncate">{deal.listingTitle}</span>
      </p>

      <div className="mt-2 flex items-center justify-between">
        <span className="font-serif text-[15px] font-medium tabular-nums">
          {formatTLCompact(deal.value)}
        </span>
        <span className="inline-flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
          <Clock className="h-3 w-3" />
          {deal.daysInStage} gün
        </span>
      </div>

      <footer className="mt-2 flex items-center justify-between border-t border-border/60 pt-2">
        <span className="font-mono text-[10px] text-muted-foreground">{deal.owner}</span>
        <span className="font-mono text-[10px] text-muted-foreground">
          {timeAgo(deal.updatedAt)}
        </span>
      </footer>

      {stageMenuOpen && (
        <div
          className="absolute right-2 top-9 z-10 w-44 overflow-hidden rounded-xl border border-border bg-card shadow-[var(--glass-shadow)]"
          onMouseLeave={() => setStageMenuOpen(false)}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="border-b border-border/60 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
            Aşamaya taşı
          </div>
          {allStages.map((s) => {
            const active = s === currentStage
            return (
              <button
                key={s}
                type="button"
                disabled={active}
                onClick={(e) => {
                  e.stopPropagation()
                  setStageMenuOpen(false)
                  onMove(deal, s)
                }}
                className={cn(
                  'flex w-full items-center justify-between px-3 py-1.5 text-left text-[12px] font-medium transition',
                  active
                    ? 'bg-muted/40 text-muted-foreground'
                    : 'hover:bg-foreground/5',
                )}
              >
                <span>{s}</span>
                {active ? (
                  <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                    Şu an
                  </span>
                ) : (
                  <ArrowRight className="h-3 w-3 opacity-50" />
                )}
              </button>
            )
          })}
        </div>
      )}
    </article>
  )
}

function FunnelStrip({
  stageMap,
  totalDeals,
}: {
  stageMap: Record<CustomerStage, Deal[]>
  totalDeals: number
}) {
  return (
    <section className="mb-6 rounded-2xl border border-border bg-card p-5">
      <div className="mb-3 flex items-baseline justify-between">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Dönüşüm hunisi
          </div>
          <h3 className="font-serif text-lg font-medium tracking-tight">
            Aşama dağılımı
          </h3>
        </div>
        <span className="font-mono text-[11px] text-muted-foreground">
          Toplam {totalDeals} fırsat
        </span>
      </div>
      <div className="-mx-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex min-w-[520px] items-end gap-1.5 md:min-w-0">
        {STAGE_ORDER.map((stage, i) => {
          const count = stageMap[stage].length
          const value = stageMap[stage].reduce((s, d) => s + d.value, 0)
          const width = `${100 - i * 14}%`
          const tone = STAGE_META[stage].tone
          return (
            <div key={stage} className="flex-1">
              <div className="mb-1 flex items-baseline justify-between text-[11px]">
                <span className="font-medium">{stage}</span>
                <span className="font-mono tabular-nums text-foreground/80">{count}</span>
              </div>
              <div
                className={cn(
                  'h-9 rounded-md border transition-all',
                  TONE_MAP[tone as keyof typeof TONE_MAP],
                )}
                style={{ width }}
                title={`${stage}: ${count} fırsat · ${formatTLCompact(value)}`}
              />
              <div className="mt-1 font-mono text-[10px] text-muted-foreground">
                {value > 0 ? formatTLCompact(value) : '—'}
              </div>
            </div>
          )
        })}
      </div>
      </div>
    </section>
  )
}

function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: typeof Handshake
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
