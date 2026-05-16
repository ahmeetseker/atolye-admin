import { Link } from 'react-router'
import { ArrowRight, ArrowUpRight, Clock, MapPin } from '@landx/icons'
import { MiniBars } from '@/components/shell/mini-bars'
import { SegmentChip, StatusChip, TypeChip } from '@landx/ui'
import { LISTINGS } from '@landx/data'
import { CUSTOMERS } from '@landx/data'
import { TRANSACTIONS } from '@landx/data'
import { formatTL, formatTLCompact, timeAgo } from '@landx/ui'
import type { AssistantBlock } from '@/lib/assistant/types'
import { cn } from '@landx/ui'

interface BlocksProps {
  blocks: AssistantBlock[]
  onChipClick?: (text: string) => void
  onClose?: () => void
}

export function Blocks({ blocks, onChipClick, onClose }: BlocksProps) {
  return (
    <div className="flex flex-col gap-3">
      {blocks.map((b, i) => (
        <Block key={i} block={b} onChipClick={onChipClick} onClose={onClose} />
      ))}
    </div>
  )
}

function Block({
  block,
  onChipClick,
  onClose,
}: {
  block: AssistantBlock
  onChipClick?: (text: string) => void
  onClose?: () => void
}) {
  switch (block.kind) {
    case 'text':
      return <TextBlock text={block.text} />
    case 'listings':
      return <ListingsBlock ids={block.ids} title={block.title} onClose={onClose} />
    case 'customers':
      return <CustomersBlock ids={block.ids} title={block.title} onClose={onClose} />
    case 'transactions':
      return <TransactionsBlock ids={block.ids} title={block.title} onClose={onClose} />
    case 'stat':
      return <StatBlock label={block.label} value={block.value} delta={block.delta} />
    case 'chart':
      return <ChartBlock title={block.title} data={block.data} />
    case 'suggest':
      return <SuggestBlock chips={block.chips} onClick={onChipClick} />
    case 'command':
      return <CommandBlock commands={block.commands} onClose={onClose} />
  }
}

function CommandBlock({
  commands,
  onClose,
}: {
  commands: Array<{ label: string; href: string }>
  onClose?: () => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {commands.map((c, i) => (
        <Link
          key={i}
          to={c.href}
          onClick={onClose}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-foreground px-3 py-1.5 text-[12px] font-medium text-background transition hover:opacity-90"
        >
          <ArrowRight className="h-3 w-3" />
          {c.label}
        </Link>
      ))}
    </div>
  )
}

function TextBlock({ text }: { text: string }) {
  return <p className="text-[14px] leading-relaxed text-foreground/90">{text}</p>
}

function StatBlock({
  label,
  value,
  delta,
}: {
  label: string
  value: string
  delta?: { tone: 'positive' | 'neutral' | 'negative'; text: string }
}) {
  return (
    <div className="rounded-xl border border-border bg-background/40 p-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 font-serif text-xl font-light tracking-tight">{value}</div>
      {delta && (
        <div
          className={cn(
            'mt-1 font-mono text-[11px]',
            delta.tone === 'positive' && 'text-emerald-700 dark:text-emerald-300',
            delta.tone === 'negative' && 'text-rose-700 dark:text-rose-300',
            delta.tone === 'neutral' && 'text-muted-foreground',
          )}
        >
          {delta.text}
        </div>
      )}
    </div>
  )
}

function ChartBlock({
  title,
  data,
}: {
  title: string
  data: Array<{ label: string; value: number; suffix?: string }>
}) {
  return <MiniBars title={title} data={data} />
}

function SuggestBlock({
  chips,
  onClick,
}: {
  chips: string[]
  onClick?: (text: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onClick?.(c)}
          className="rounded-full border border-border/70 bg-background/40 px-3 py-1 text-[12px] text-muted-foreground transition hover:bg-foreground/[0.04] hover:text-foreground"
        >
          {c}
        </button>
      ))}
    </div>
  )
}

function ListingsBlock({
  ids,
  title,
  onClose,
}: {
  ids: string[]
  title?: string
  onClose?: () => void
}) {
  const items = ids.map((id) => LISTINGS.find((l) => l.id === id)).filter(Boolean) as typeof LISTINGS[number][]
  if (items.length === 0) return null
  return (
    <section className="rounded-xl border border-border bg-background/40 p-3">
      {title && (
        <header className="mb-2 flex items-baseline justify-between">
          <h4 className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            {title}
          </h4>
          <Link
            to="/listings"
            onClick={onClose}
            className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground transition hover:text-foreground"
          >
            Tümü →
          </Link>
        </header>
      )}
      <ul className="space-y-1.5">
        {items.map((l) => (
          <li key={l.id}>
            <Link
              to="/listings"
              onClick={onClose}
              className="group flex items-center gap-3 rounded-lg border border-border/70 bg-card p-3 transition hover:border-foreground/30"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <TypeChip type={l.type} />
                  <span className="font-mono text-[10px] text-muted-foreground">{l.id}</span>
                  <StatusChip status={l.status} />
                </div>
                <h5 className="mt-1 truncate text-[13px] font-semibold leading-tight">
                  {l.title}
                </h5>
                <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {l.district} · {l.size.toLocaleString('tr-TR')} m²
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="font-serif text-[14px] font-medium tabular-nums">
                  {formatTLCompact(l.price)}
                </span>
                <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

function CustomersBlock({
  ids,
  title,
  onClose,
}: {
  ids: string[]
  title?: string
  onClose?: () => void
}) {
  const items = ids.map((id) => CUSTOMERS.find((c) => c.id === id)).filter(Boolean) as typeof CUSTOMERS[number][]
  if (items.length === 0) return null
  return (
    <section className="rounded-xl border border-border bg-background/40 p-3">
      {title && (
        <header className="mb-2 flex items-baseline justify-between">
          <h4 className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            {title}
          </h4>
          <Link
            to="/customers"
            onClick={onClose}
            className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground transition hover:text-foreground"
          >
            Tümü →
          </Link>
        </header>
      )}
      <ul className="space-y-1">
        {items.map((c) => (
          <li key={c.id}>
            <Link
              to="/customers"
              onClick={onClose}
              className="group flex items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-foreground/[0.03]"
            >
              <span
                aria-hidden
                className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-foreground/[0.08] font-mono text-[11px] font-semibold text-foreground/85"
              >
                {c.name
                  .split(' ')
                  .map((p) => p[0])
                  .slice(0, 2)
                  .join('')}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h5 className="truncate text-[13px] font-medium leading-tight">{c.name}</h5>
                  <SegmentChip segment={c.segment} />
                </div>
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                  {c.stage} · {c.interestArea}
                </p>
              </div>
              <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

function TransactionsBlock({
  ids,
  title,
  onClose,
}: {
  ids: string[]
  title?: string
  onClose?: () => void
}) {
  const items = ids.map((id) => TRANSACTIONS.find((t) => t.id === id)).filter(Boolean) as typeof TRANSACTIONS[number][]
  if (items.length === 0) return null
  return (
    <section className="rounded-xl border border-border bg-background/40 p-3">
      {title && (
        <header className="mb-2 flex items-baseline justify-between">
          <h4 className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            {title}
          </h4>
          <Link
            to="/finance"
            onClick={onClose}
            className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground transition hover:text-foreground"
          >
            Tümü →
          </Link>
        </header>
      )}
      <ul className="space-y-1">
        {items.map((t) => (
          <li key={t.id}>
            <Link
              to="/finance"
              onClick={onClose}
              className="flex items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-foreground/[0.03]"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-muted-foreground">{t.id}</span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    {t.type}
                  </span>
                </div>
                <h5 className="mt-0.5 truncate text-[12.5px] font-medium leading-tight">
                  {t.description}
                </h5>
                <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {timeAgo(t.date)} · {t.party}
                </p>
              </div>
              <span
                className={cn(
                  'font-serif text-[13px] font-medium tabular-nums',
                  t.amount < 0 && 'text-rose-700 dark:text-rose-300',
                )}
              >
                {t.amount < 0 ? '−' : ''}
                {formatTL(Math.abs(t.amount))}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
