/**
 * Wave F19.A — Customer timeline aggregator.
 *
 * Stitches together mock activity from three sources into a single
 * chronological feed for the customer detail drawer:
 *
 *   - EVENTS (calendar) → meeting / visit / deed / task
 *   - CONVERSATIONS (messages) → last-message timestamp per channel
 *   - TRANSACTIONS (finance) → payment / commission / overdue events
 *   - Customer.notes → free-form note pinned at lastContact
 *
 * No backend yet — when the real CRM API ships, this file becomes the
 * place where event normalisation happens (one shape regardless of the
 * upstream source).
 */

import {
  EVENTS,
  CONVERSATIONS,
  TRANSACTIONS,
  type Customer,
  type CalendarEvent,
  type Conversation,
  type Transaction,
} from '@landx/data'

export type TimelineEventKind =
  | 'meeting'
  | 'visit'
  | 'deed'
  | 'task'
  | 'message'
  | 'transaction'
  | 'note'

export interface TimelineEvent {
  id: string
  kind: TimelineEventKind
  timestamp: string
  title: string
  hint?: string
}

const EVENT_TYPE_TO_KIND: Record<CalendarEvent['type'], TimelineEventKind> = {
  meeting: 'meeting',
  visit: 'visit',
  deed: 'deed',
  task: 'task',
  reminder: 'task',
}

function fromEvents(customer: Customer): TimelineEvent[] {
  return EVENTS.filter((e) => e.customerName === customer.name).map((e) => ({
    id: `evt-${e.id}`,
    kind: EVENT_TYPE_TO_KIND[e.type] ?? 'task',
    timestamp: e.date,
    title: e.title,
    hint: e.location ?? e.notes,
  }))
}

function fromConversations(customer: Customer): TimelineEvent[] {
  const events: TimelineEvent[] = []
  for (const c of CONVERSATIONS as Conversation[]) {
    if (c.customerId !== customer.id) continue
    // Each conversation lands as one timeline entry — the last preview.
    // Per-message granularity would balloon the feed; the drawer-level
    // summary is what users actually scan.
    events.push({
      id: `msg-${c.id}`,
      kind: 'message',
      timestamp: c.lastAt,
      title: c.lastPreview,
      hint: channelLabel(c.channel),
    })
  }
  return events
}

function fromTransactions(customer: Customer): TimelineEvent[] {
  return (TRANSACTIONS as Transaction[])
    .filter((t) => t.party === customer.name)
    .map((t) => ({
      id: `txn-${t.id}`,
      kind: 'transaction' as const,
      timestamp: t.date,
      title: t.description,
      hint: `${t.type} • ${formatAmount(t.amount)}`,
    }))
}

function fromNotes(customer: Customer): TimelineEvent[] {
  if (!customer.notes) return []
  return [
    {
      id: `note-${customer.id}`,
      kind: 'note',
      timestamp: customer.lastContact,
      title: customer.notes,
    },
  ]
}

export function getCustomerTimeline(customer: Customer): TimelineEvent[] {
  const all = [
    ...fromEvents(customer),
    ...fromConversations(customer),
    ...fromTransactions(customer),
    ...fromNotes(customer),
  ]
  return all.sort((a, b) => {
    const ta = Date.parse(a.timestamp)
    const tb = Date.parse(b.timestamp)
    if (Number.isNaN(ta) && Number.isNaN(tb)) return 0
    if (Number.isNaN(ta)) return 1
    if (Number.isNaN(tb)) return -1
    return tb - ta
  })
}

const MONTH_LABELS = [
  'OCAK',
  'ŞUBAT',
  'MART',
  'NİSAN',
  'MAYIS',
  'HAZİRAN',
  'TEMMUZ',
  'AĞUSTOS',
  'EYLÜL',
  'EKİM',
  'KASIM',
  'ARALIK',
]

export function monthGroupKey(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'BİLİNMİYOR'
  return `${MONTH_LABELS[d.getMonth()]} ${d.getFullYear()}`
}

export interface TimelineMonthGroup {
  key: string
  events: TimelineEvent[]
}

export function groupByMonth(events: TimelineEvent[]): TimelineMonthGroup[] {
  const groups: TimelineMonthGroup[] = []
  let current: TimelineMonthGroup | null = null
  for (const ev of events) {
    const key = monthGroupKey(ev.timestamp)
    if (!current || current.key !== key) {
      current = { key, events: [] }
      groups.push(current)
    }
    current.events.push(ev)
  }
  return groups
}

function channelLabel(channel: Conversation['channel']): string {
  switch (channel) {
    case 'whatsapp':
      return 'WhatsApp'
    case 'sahibinden':
      return 'Sahibinden mesajı'
    case 'phone':
      return 'Telefon'
    case 'email':
      return 'E-posta'
    case 'internal':
      return 'Ekip notu'
    default:
      return 'Mesaj'
  }
}

function formatAmount(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M ₺`
  if (amount >= 1_000) return `${Math.round(amount / 1_000)}K ₺`
  return `${amount} ₺`
}
