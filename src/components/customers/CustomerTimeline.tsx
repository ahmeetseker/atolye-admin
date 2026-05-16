import { useMemo } from 'react'
import {
  Calendar,
  CheckSquare,
  FileSignature,
  MapPin,
  MessageCircle,
  Receipt,
  StickyNote,
  type LucideIcon,
} from '@landx/icons'
import { cn, timeAgo } from '@landx/ui'
import type { Customer } from '@landx/data'
import { calculateLeadScore, tierBadgeClass, tierLabel } from '@/lib/lead-scoring'
import {
  getCustomerTimeline,
  groupByMonth,
  type TimelineEvent,
  type TimelineEventKind,
} from '@/lib/customer-timeline'

/**
 * Wave F19.A — chronological activity feed for a customer.
 *
 * Mounts inside `CustomerDetailDrawer`. Top card is the lead-score summary
 * (tier badge + 0-100 score + reasons). Below: month-grouped event list
 * built by `getCustomerTimeline`. Empty state when the customer has no
 * recorded activity in any source.
 */
export function CustomerTimeline({ customer }: { customer: Customer }) {
  const events = useMemo(() => getCustomerTimeline(customer), [customer])
  const groups = useMemo(() => groupByMonth(events), [events])
  const score = useMemo(() => calculateLeadScore(customer), [customer])

  return (
    <div data-testid="customer-timeline" className="space-y-5">
      <article
        className={cn(
          'rounded-2xl border bg-card/60 p-4',
          tierBadgeClass(score.tier).split(' ').filter((c) => c.startsWith('border-')).join(' '),
        )}
        data-testid="customer-timeline-score"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Lead skoru
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-serif text-3xl font-light tabular-nums">
                {score.score}
              </span>
              <span className="font-mono text-[11px] text-muted-foreground">
                / 100
              </span>
            </div>
          </div>
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[11px]',
              tierBadgeClass(score.tier),
            )}
            data-testid="customer-timeline-tier"
          >
            {tierLabel(score.tier)}
          </span>
        </div>
        {score.reasons.length > 0 && (
          <ul className="mt-3 space-y-1">
            {score.reasons.map((reason) => (
              <li
                key={reason}
                className="flex items-start gap-1.5 text-[12px] text-foreground/80"
              >
                <span className="mt-1 h-1 w-1 flex-none rounded-full bg-muted-foreground" />
                {reason}
              </li>
            ))}
          </ul>
        )}
      </article>

      {events.length === 0 ? (
        <div
          data-testid="customer-timeline-empty"
          className="rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-8 text-center text-[13px] text-muted-foreground"
        >
          Bu müşteri için kayıt bulunamadı.
        </div>
      ) : (
        <div className="space-y-5" data-testid="customer-timeline-list">
          {groups.map((group) => (
            <section key={group.key}>
              <h4 className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {group.key}
              </h4>
              <ol className="space-y-2">
                {group.events.map((event) => (
                  <TimelineRow key={event.id} event={event} />
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

function TimelineRow({ event }: { event: TimelineEvent }) {
  const Icon = ICON_MAP[event.kind]
  return (
    <li
      data-testid={`timeline-event-${event.kind}`}
      className="flex items-start gap-3 rounded-xl border border-border bg-card/60 px-3 py-2.5"
    >
      <span className="mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-foreground/[0.06] text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] leading-snug text-foreground/90">{event.title}</p>
        {event.hint && (
          <p className="mt-0.5 text-[11.5px] text-muted-foreground">{event.hint}</p>
        )}
      </div>
      <div className="flex flex-none flex-col items-end gap-0.5 text-right">
        <span className="text-[11.5px] text-muted-foreground">
          {timeAgo(event.timestamp)}
        </span>
        <span className="font-mono text-[10px] tabular-nums text-muted-foreground/80">
          {formatShortDate(event.timestamp)}
        </span>
      </div>
    </li>
  )
}

const ICON_MAP: Record<TimelineEventKind, LucideIcon> = {
  meeting: Calendar,
  visit: MapPin,
  deed: FileSignature,
  task: CheckSquare,
  message: MessageCircle,
  transaction: Receipt,
  note: StickyNote,
}

function formatShortDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  })
}
