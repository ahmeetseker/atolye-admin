import { useEffect, useId, type ReactNode } from 'react'
import { AnimatePresence, motion, type Transition } from 'framer-motion'
import {
  AlertCircle,
  Clock,
  MapPin,
  Pencil,
  Trash2,
  User,
  X,
} from '@landx/icons'
import {
  cn,
  formatTL,
  formatTLCompact,
  timeAgo,
} from '@landx/ui'
import {
  FAST_FADE,
  REDUCED_MOTION_TRANSITION,
  STANDARD_SPRING,
  motionGate,
} from '@landx/ui/lib'
import type { Deal } from '@landx/data'

interface DealDetailDrawerProps {
  open: boolean
  deal: Deal | null
  onClose: () => void
  onEdit: (deal: Deal) => void
  onDelete: (deal: Deal) => void
}

/**
 * Read-only side drawer for a sales deal. Surfaces customer / commercial /
 * activity sections plus Edit + Delete CTAs that hand off to F3A's mutation
 * drawers.
 *
 * - Width: full-width on mobile / 480px md / 560px lg
 * - Esc + backdrop click close
 * - URL state (?detail=<id>) is owned by the parent route
 */
export function DealDetailDrawer({
  open,
  deal,
  onClose,
  onEdit,
  onDelete,
}: DealDetailDrawerProps) {
  const titleId = useId()
  const backdropTransition = motionGate<Transition>(REDUCED_MOTION_TRANSITION, FAST_FADE)
  const panelTransition = motionGate<Transition>(REDUCED_MOTION_TRANSITION, STANDARD_SPRING)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && deal && (
        <div
          role="presentation"
          data-testid="deal-detail-drawer"
          className="fixed inset-0 z-[65]"
        >
          <motion.button
            type="button"
            aria-label="Kapat"
            data-testid="deal-detail-backdrop"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={backdropTransition}
            className="absolute inset-0 cursor-default bg-foreground/40 backdrop-blur-sm"
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={panelTransition}
            className={cn(
              'absolute right-0 top-0 flex h-full w-full flex-col border-l border-border bg-card shadow-2xl',
              'md:w-[480px] lg:w-[560px]',
            )}
          >
            <header className="sticky top-0 z-10 flex flex-col gap-3 border-b border-border bg-card px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    MOD · FIRSAT DETAYI
                  </div>
                  <h2
                    id={titleId}
                    className="mt-1 font-serif text-xl font-light leading-tight"
                  >
                    Fırsat <em className="font-serif italic font-light">özeti</em>
                  </h2>
                  <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                    {deal.id}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Drawer'ı kapat"
                  data-testid="deal-detail-close"
                  onClick={onClose}
                  className={cn(
                    'flex h-9 w-9 flex-none items-center justify-center rounded-lg text-muted-foreground transition',
                    'hover:bg-foreground/5 hover:text-foreground',
                  )}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex flex-col items-stretch gap-2 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-2">
                  <StageBadge stage={deal.stage} />
                  <StatusBadge status={deal.status} />
                </div>
                <div className="flex flex-col gap-2 md:flex-row md:items-center">
                  <button
                    type="button"
                    data-testid="deal-detail-edit"
                    onClick={() => onEdit(deal)}
                    className={cn(
                      'inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-foreground px-4 py-2 text-[13px] font-medium text-background transition',
                      'hover:opacity-90 md:min-h-[36px]',
                    )}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Düzenle
                  </button>
                  <button
                    type="button"
                    data-testid="deal-detail-delete"
                    onClick={() => onDelete(deal)}
                    className={cn(
                      'inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-[13px] font-medium transition',
                      'text-foreground/70 hover:bg-foreground/5 hover:text-foreground md:min-h-[36px]',
                    )}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Sil
                  </button>
                </div>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              <h3 className="font-serif text-lg font-light leading-snug">
                {deal.customerName}
              </h3>
              <p className="mt-1 inline-flex items-center gap-1 text-[12px] text-muted-foreground">
                <MapPin className="h-3 w-3" />
                {deal.listingTitle}
              </p>

              <div className="mt-5 space-y-5">
                <Section title="Kişi">
                  <Row
                    label="Müşteri"
                    value={
                      <span className="inline-flex items-center gap-1.5 text-[13px]">
                        <User className="h-3 w-3 text-muted-foreground" />
                        {deal.customerName}
                      </span>
                    }
                  />
                  <Row label="Müşteri ID" value={deal.customerId} mono />
                  <Row label="Temsilci" value={deal.owner} />
                </Section>

                <Section title="Ticari">
                  <Row
                    label="Değer"
                    value={
                      <span className="font-serif text-base font-medium tabular-nums">
                        {formatTL(deal.value)}
                      </span>
                    }
                  />
                  <Row
                    label="Kısa"
                    value={
                      <span className="font-mono text-[12px] tabular-nums">
                        {formatTLCompact(deal.value)}
                      </span>
                    }
                  />
                  <Row label="Aşama" value={<StageBadge stage={deal.stage} />} />
                  <Row label="Durum" value={<StatusBadge status={deal.status} />} />
                </Section>

                <Section title="İlan">
                  <Row label="Başlık" value={deal.listingTitle} />
                  <Row label="İlan ID" value={deal.listingId || '—'} mono />
                </Section>

                <Section title="Aktivite">
                  <Row
                    label="Aşamada gün"
                    value={
                      <span className="inline-flex items-center gap-1.5 font-mono text-[12.5px] tabular-nums">
                        <Clock className="h-3 w-3" />
                        {deal.daysInStage} gün
                      </span>
                    }
                  />
                  <Row
                    label="Son güncelleme"
                    value={
                      <span className="text-[12.5px]">{timeAgo(deal.updatedAt)}</span>
                    }
                  />
                </Section>
              </div>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h4 className="mb-2.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {title}
      </h4>
      <div className="space-y-2.5 rounded-2xl border border-border bg-card p-3.5">
        {children}
      </div>
    </section>
  )
}

function Row({
  label,
  value,
  mono = false,
}: {
  label: string
  value: ReactNode
  mono?: boolean
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          'text-right text-[13px] text-foreground',
          mono && 'font-mono tabular-nums',
        )}
      >
        {value}
      </span>
    </div>
  )
}

function StageBadge({ stage }: { stage: Deal['stage'] }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2.5 py-0.5 text-[11px] font-medium text-foreground/80">
      {stage}
    </span>
  )
}

function StatusBadge({ status }: { status: Deal['status'] }) {
  const isRisk = status === 'Risk'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium',
        isRisk
          ? 'border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300'
          : 'border-border bg-muted/30 text-foreground/80',
      )}
    >
      {isRisk && <AlertCircle className="h-3 w-3" />}
      {status}
    </span>
  )
}
