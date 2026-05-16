import { useEffect, useState, type ReactNode } from 'react'
import { Mail, Pencil, Phone, Trash2, X } from '@landx/icons'
import { SegmentChip, StageChip, formatTLCompact, timeAgo, cn } from '@landx/ui'
import type { Customer } from '@landx/data'
import { CustomerTimeline } from '@/components/customers/CustomerTimeline'

interface CustomerDetailDrawerProps {
  open: boolean
  customer: Customer | null
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
}

/**
 * Read-only drill-in for a customer. Triggered by row click on the customers
 * table. Pairs with `EditCustomerDrawer` (Düzenle CTA in header) and
 * `DeleteCustomerDialog` (Sil CTA).
 *
 * Layout mirrors F2B's listing detail drawer:
 *   - Full-width on mobile, 480px on md+
 *   - Sections: Kişi · İlişki · Ticari · Aktivite
 *   - Esc closes; backdrop click closes; X button closes
 */
export function CustomerDetailDrawer({
  open,
  customer,
  onClose,
  onEdit,
  onDelete,
}: CustomerDetailDrawerProps) {
  const [tab, setTab] = useState<'overview' | 'timeline'>('overview')

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Reset to overview each time the drawer reopens so the prior tab doesn't
  // bleed across customers — small but expected DX touch.
  useEffect(() => {
    if (open) setTab('overview')
  }, [open, customer?.id])

  if (!open || !customer) return null

  return (
    <div
      className="fixed inset-0 z-40 flex"
      role="dialog"
      aria-modal="true"
      aria-labelledby="customer-detail-title"
      data-testid="customer-detail-drawer"
    >
      <button
        type="button"
        aria-label="Kapat"
        onClick={onClose}
        className="flex-1 bg-foreground/40 backdrop-blur-sm transition-opacity"
      />
      <aside
        className="flex h-full w-full flex-col border-l border-border bg-card shadow-2xl md:w-[520px]"
        style={{ contain: 'layout style paint' }}
      >
        <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              MÜŞTERİ · {customer.id}
            </div>
            <h2
              id="customer-detail-title"
              className="mt-1 truncate font-serif text-2xl font-light leading-tight"
            >
              Müşteri <em className="font-serif italic font-light">detayı</em>
            </h2>
          </div>
          <div className="flex flex-none items-center gap-1">
            <button
              type="button"
              data-testid="customer-detail-edit"
              onClick={onEdit}
              aria-label="Düzenle"
              className="inline-flex h-11 min-w-[44px] items-center gap-1.5 rounded-lg border border-border bg-background/40 px-2.5 text-[13px] font-medium text-foreground transition hover:bg-foreground/10 md:h-9"
            >
              <Pencil className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Düzenle</span>
            </button>
            <button
              type="button"
              data-testid="customer-detail-delete"
              onClick={onDelete}
              aria-label="Sil"
              className="inline-flex h-11 min-w-[44px] items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 px-2.5 text-[13px] font-medium text-rose-700 transition hover:bg-rose-500/20 dark:text-rose-300 md:h-9"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Sil</span>
            </button>
            <button
              type="button"
              data-testid="customer-detail-close"
              onClick={onClose}
              aria-label="Kapat"
              className="flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-background/40 text-muted-foreground transition hover:bg-foreground/10 hover:text-foreground md:h-9 md:w-9"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </header>

        <div
          role="tablist"
          aria-label="Müşteri sekmesi"
          className="flex gap-1 border-b border-border px-5 pb-0 pt-3"
        >
          <TabButton
            id="overview"
            active={tab === 'overview'}
            onClick={() => setTab('overview')}
          >
            Genel
          </TabButton>
          <TabButton
            id="timeline"
            active={tab === 'timeline'}
            onClick={() => setTab('timeline')}
          >
            Zaman çizgisi
          </TabButton>
        </div>

        {tab === 'timeline' ? (
          <div
            className="flex-1 overflow-y-auto px-5 py-5"
            role="tabpanel"
            aria-labelledby="customer-detail-tab-timeline"
            data-testid="customer-detail-timeline-panel"
          >
            <CustomerTimeline customer={customer} />
          </div>
        ) : (
        <div
          className="flex-1 overflow-y-auto px-5 py-5"
          role="tabpanel"
          aria-labelledby="customer-detail-tab-overview"
        >
          <Section title="Kişi">
            <Row label="Ad soyad" value={customer.name} />
            <Row
              label="Telefon"
              value={
                customer.phone ? (
                  <span className="inline-flex items-center gap-1.5 font-mono text-[12.5px] tabular-nums">
                    <Phone className="h-3 w-3 text-muted-foreground" />
                    {customer.phone}
                  </span>
                ) : (
                  <Muted />
                )
              }
            />
            <Row
              label="E-posta"
              value={
                customer.email ? (
                  <span className="inline-flex items-center gap-1.5 text-[12.5px]">
                    <Mail className="h-3 w-3 text-muted-foreground" />
                    {customer.email}
                  </span>
                ) : (
                  <Muted />
                )
              }
            />
          </Section>

          <Section title="İlişki">
            <Row label="Segment" value={<SegmentChip segment={customer.segment} />} />
            <Row label="Aşama" value={<StageChip stage={customer.stage} />} />
          </Section>

          <Section title="Ticari">
            <Row
              label="Potansiyel"
              value={
                customer.value > 0 ? (
                  <span className="font-serif text-[16px] font-medium tabular-nums">
                    {formatTLCompact(customer.value)}
                  </span>
                ) : (
                  <Muted />
                )
              }
            />
            <Row label="Kaynak" value={customer.source} />
            <Row
              label="Sahibi"
              value={<span className="font-mono text-[12.5px]">{customer.owner}</span>}
            />
            <Row label="İlgi alanı" value={customer.interestArea} />
          </Section>

          <Section title="Aktivite">
            <Row
              label="Son temas"
              value={
                <div className="flex flex-col items-end gap-0.5">
                  <span className="text-[13px]">{timeAgo(customer.lastContact)}</span>
                  <span className="font-mono text-[10.5px] text-muted-foreground tabular-nums">
                    {new Date(customer.lastContact).toLocaleString('tr-TR')}
                  </span>
                </div>
              }
            />
            {customer.notes && (
              <div className="mt-3 rounded-xl border border-border bg-muted/40 p-3">
                <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  NOTLAR
                </div>
                <p className="mt-1.5 whitespace-pre-wrap text-[13px] leading-relaxed text-foreground/85">
                  {customer.notes}
                </p>
              </div>
            )}
          </Section>
        </div>
        )}
      </aside>
    </div>
  )
}

function TabButton({
  id,
  active,
  onClick,
  children,
}: {
  id: string
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      role="tab"
      id={`customer-detail-tab-${id}`}
      aria-selected={active}
      data-testid={`customer-detail-tab-${id}`}
      onClick={onClick}
      className={cn(
        'relative inline-flex items-center gap-1.5 rounded-t-lg px-3 py-2 text-[12.5px] font-medium transition',
        active
          ? 'text-foreground after:absolute after:inset-x-1 after:-bottom-px after:h-0.5 after:rounded-full after:bg-foreground'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-5 last:mb-0">
      <h3 className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {title}
      </h3>
      <div className="rounded-2xl border border-border bg-card/60">{children}</div>
    </section>
  )
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/60 px-3.5 py-2.5 last:border-0">
      <dt className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </dt>
      <dd className="min-w-0 text-right text-[13px] text-foreground/85">{value}</dd>
    </div>
  )
}

function Muted() {
  return <span className="font-mono text-[11px] text-muted-foreground">—</span>
}
