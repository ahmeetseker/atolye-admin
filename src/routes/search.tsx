import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { Link } from 'react-router'
import {
  Calendar as CalendarIcon,
  Clock,
  Coins,
  Layers,
  MapPin,
  Search as SearchIcon,
  Sparkles,
  Users,
  X,
} from '@landx/icons'
import { PageShell } from '@landx/ui'
import { LISTINGS } from '@landx/data'
import { CUSTOMERS } from '@landx/data'
import { TRANSACTIONS } from '@landx/data'
import { EVENTS } from '@landx/data'
import type { Listing } from '@landx/data'
import type { Customer } from '@landx/data'
import type { Transaction } from '@landx/data'
import type { CalendarEvent } from '@landx/data'
import { StatusChip, SegmentChip, TypeChip } from '@landx/ui'
import { formatTL, formatTLCompact } from '@landx/ui'
import { cn } from '@landx/ui'

type Category = 'Tümü' | 'İlanlar' | 'Müşteriler' | 'İşlemler' | 'Etkinlikler'

const CATEGORIES: Array<{ id: Category; Icon: typeof Layers }> = [
  { id: 'Tümü', Icon: SearchIcon },
  { id: 'İlanlar', Icon: Layers },
  { id: 'Müşteriler', Icon: Users },
  { id: 'İşlemler', Icon: Coins },
  { id: 'Etkinlikler', Icon: CalendarIcon },
]

const SUGGESTED = [
  'Ayvalık zeytinlik 6.1M altı',
  '2.000 m² üstü villa imarlı',
  'Sıcak müşteri Datça',
  'Bekleyen tahsilat 30+ gün',
  'Yarınki tapu randevuları',
] as const

const RECENT_KEY = 'sahibinden-v3-recent-searches'

export function Search() {
  const [query, setQuery] = useState('')
  const [pending, startTransition] = useTransition()
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [category, setCategory] = useState<Category>('Tümü')
  const [recent, setRecent] = useState<string[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const raw = window.localStorage.getItem(RECENT_KEY)
      return raw ? (JSON.parse(raw) as string[]) : []
    } catch {
      return []
    }
  })
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const id = window.setTimeout(() => {
      startTransition(() => setDebouncedQuery(query))
    }, 120)
    return () => window.clearTimeout(id)
  }, [query])

  const rememberQuery = (q: string) => {
    const trimmed = q.trim()
    if (!trimmed) return
    setRecent((prev) => {
      const next = [trimmed, ...prev.filter((x) => x !== trimmed)].slice(0, 5)
      try {
        window.localStorage.setItem(RECENT_KEY, JSON.stringify(next))
      } catch {
        // ignore
      }
      return next
    })
  }

  const results = useMemo(() => searchAll(debouncedQuery), [debouncedQuery])

  const totalCount =
    results.listings.length +
    results.customers.length +
    results.transactions.length +
    results.events.length

  const showInCategory = (c: Category) => category === 'Tümü' || category === c

  return (
    <PageShell
      eyebrow="MOD · ARAMA"
      title={
        <>
          Atölye <em className="font-serif italic font-light">arama</em>
        </>
      }
      description="İlan, müşteri, işlem ve etkinlikler arasında tek panelden ara."
    >
      <div className="mb-4 flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-[var(--glass-shadow)]">
        <SearchIcon className="h-5 w-5 flex-none text-muted-foreground" />
        <label htmlFor="search-input-search" className="sr-only">
          Tüm portföyde ara
        </label>
        <input
          ref={inputRef}
          id="search-input-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') rememberQuery(query)
          }}
          placeholder="Ne arıyorsun? Örn: 'Cunda denize 80m' veya 'Sıcak müşteri Datça'"
          className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Temizle"
            className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition hover:bg-foreground/10 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <kbd className="hidden rounded-md border border-border/80 bg-background/40 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline">
          ⌘K
        </kbd>
      </div>

      <nav className="mb-5 -mx-1 flex items-center gap-1 overflow-x-auto rounded-full border border-border bg-card p-1 sm:mx-0 sm:inline-flex">
        {CATEGORIES.map(({ id, Icon }) => {
          const count =
            id === 'Tümü'
              ? totalCount
              : id === 'İlanlar'
                ? results.listings.length
                : id === 'Müşteriler'
                  ? results.customers.length
                  : id === 'İşlemler'
                    ? results.transactions.length
                    : results.events.length
          const active = category === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => setCategory(id)}
              className={cn(
                'inline-flex flex-none items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition',
                active
                  ? 'bg-foreground text-background shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {id}
              <span
                className={cn(
                  'rounded-full px-1.5 font-mono text-[10px] tabular-nums',
                  active ? 'bg-background/20' : 'bg-foreground/[0.06]',
                )}
              >
                {count}
              </span>
            </button>
          )
        })}
      </nav>

      {debouncedQuery.trim().length === 0 ? (
        <EmptyHint recent={recent} onPick={(s) => setQuery(s)} pending={pending} />
      ) : totalCount === 0 ? (
        <NoResults query={debouncedQuery} />
      ) : (
        <div className="space-y-6">
          {showInCategory('İlanlar') && results.listings.length > 0 && (
            <ListingsGroup data={results.listings} />
          )}
          {showInCategory('Müşteriler') && results.customers.length > 0 && (
            <CustomersGroup data={results.customers} />
          )}
          {showInCategory('İşlemler') && results.transactions.length > 0 && (
            <TransactionsGroup data={results.transactions} />
          )}
          {showInCategory('Etkinlikler') && results.events.length > 0 && (
            <EventsGroup data={results.events} />
          )}
        </div>
      )}
    </PageShell>
  )
}

function searchAll(q: string) {
  const query = q.trim().toLowerCase()
  if (!query) return { listings: [], customers: [], transactions: [], events: [] }

  const listings = LISTINGS.filter((l) =>
    `${l.id} ${l.title} ${l.city} ${l.district} ${l.tags.join(' ')}`
      .toLowerCase()
      .includes(query),
  )
  const customers = CUSTOMERS.filter((c) =>
    `${c.id} ${c.name} ${c.segment} ${c.stage} ${c.interestArea} ${c.notes ?? ''}`
      .toLowerCase()
      .includes(query),
  )
  const transactions = TRANSACTIONS.filter((t) =>
    `${t.id} ${t.type} ${t.status} ${t.party} ${t.description}`
      .toLowerCase()
      .includes(query),
  )
  const events = EVENTS.filter((e) =>
    `${e.id} ${e.title} ${e.owner} ${e.location ?? ''} ${e.customerName ?? ''}`
      .toLowerCase()
      .includes(query),
  )
  return { listings, customers, transactions, events }
}

function GroupHeader({
  title,
  count,
  href,
}: {
  title: string
  count: number
  href?: string
}) {
  return (
    <header className="mb-3 flex items-baseline justify-between">
      <div className="flex items-baseline gap-2">
        <h2 className="font-serif text-lg font-medium tracking-tight">{title}</h2>
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          {count} sonuç
        </span>
      </div>
      {href && (
        <Link
          to={href}
          className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground transition hover:text-foreground"
        >
          Tümünü gör →
        </Link>
      )}
    </header>
  )
}

function ListingsGroup({ data }: { data: Listing[] }) {
  return (
    <section>
      <GroupHeader title="İlanlar" count={data.length} href="/listings" />
      <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {data.slice(0, 6).map((l) => (
          <li key={l.id}>
            <Link
              to="/listings"
              className="block rounded-xl border border-border bg-card p-4 transition hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(80,60,40,0.10)]"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[11px] text-muted-foreground">{l.id}</span>
                <div className="flex items-center gap-1.5">
                  <TypeChip type={l.type} />
                  <StatusChip status={l.status} />
                </div>
              </div>
              <h3 className="mt-1 text-[14px] font-semibold leading-snug">{l.title}</h3>
              <p className="mt-0.5 inline-flex items-center gap-1 text-[11.5px] text-muted-foreground">
                <MapPin className="h-3 w-3" />
                {l.district}
              </p>
              <div className="mt-2 flex items-center justify-between">
                <span className="font-serif text-[15px] font-medium tabular-nums">
                  {formatTLCompact(l.price)}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {l.size.toLocaleString('tr-TR')} m²
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

function CustomersGroup({ data }: { data: Customer[] }) {
  return (
    <section>
      <GroupHeader title="Müşteriler" count={data.length} href="/customers" />
      <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {data.slice(0, 6).map((c) => (
          <li key={c.id}>
            <Link
              to="/customers"
              className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 transition hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(80,60,40,0.10)]"
            >
              <span
                aria-hidden
                className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-foreground/[0.08] font-mono text-[13px] font-semibold text-foreground/85"
              >
                {c.name
                  .split(' ')
                  .map((p) => p[0])
                  .slice(0, 2)
                  .join('')}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="truncate text-[14px] font-semibold leading-tight">
                    {c.name}
                  </h3>
                  <span className="font-mono text-[10px] text-muted-foreground">{c.id}</span>
                </div>
                <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
                  {c.interestArea}
                </p>
                <div className="mt-1.5 flex items-center gap-2">
                  <SegmentChip segment={c.segment} />
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {c.stage}
                  </span>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

function TransactionsGroup({ data }: { data: Transaction[] }) {
  return (
    <section>
      <GroupHeader title="İşlemler" count={data.length} href="/finance" />
      <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {data.slice(0, 6).map((t) => (
          <li key={t.id}>
            <Link
              to="/finance"
              className="block rounded-xl border border-border bg-card p-4 transition hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(80,60,40,0.10)]"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[11px] text-muted-foreground">{t.id}</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  {t.type}
                </span>
              </div>
              <h3 className="mt-1 text-[13px] font-semibold leading-snug">
                {t.description}
              </h3>
              <p className="font-mono text-[11px] text-muted-foreground">{t.party}</p>
              <div className="mt-2 flex items-center justify-between">
                <span
                  className={cn(
                    'font-serif text-[15px] font-medium tabular-nums',
                    t.amount < 0 && 'text-rose-700 dark:text-rose-300',
                  )}
                >
                  {t.amount < 0 ? '−' : ''}
                  {formatTL(Math.abs(t.amount))}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {t.status}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

function EventsGroup({ data }: { data: CalendarEvent[] }) {
  return (
    <section>
      <GroupHeader title="Etkinlikler" count={data.length} href="/calendar" />
      <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {data.slice(0, 6).map((e) => (
          <li key={e.id}>
            <Link
              to="/calendar"
              className="block rounded-xl border border-border bg-card p-4 transition hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(80,60,40,0.10)]"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[11px] text-muted-foreground">{e.id}</span>
                <span className="inline-flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {new Date(e.date).toLocaleDateString('tr-TR', {
                    day: '2-digit',
                    month: 'short',
                  })}{' '}
                  · {e.time ?? '—'}
                </span>
              </div>
              <h3 className="mt-1 text-[13px] font-semibold leading-snug">{e.title}</h3>
              {e.location && (
                <p className="mt-0.5 inline-flex items-center gap-1 text-[11.5px] text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate">{e.location}</span>
                </p>
              )}
              <p className="mt-1 font-mono text-[10px] text-muted-foreground">{e.owner}</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

function EmptyHint({
  recent,
  onPick,
  pending,
}: {
  recent: string[]
  onPick: (q: string) => void
  pending: boolean
}) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <article className="rounded-2xl border border-border bg-card p-5">
        <header className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-foreground/70" />
          <h3 className="font-serif text-lg font-medium tracking-tight">Önerilen</h3>
          {pending && (
            <span className="font-mono text-[10px] text-muted-foreground">aranıyor…</span>
          )}
        </header>
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTED.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onPick(s)}
              className="rounded-full border border-border/70 bg-background/30 px-3 py-1.5 text-[12px] text-muted-foreground transition hover:bg-foreground/[0.04] hover:text-foreground"
            >
              {s}
            </button>
          ))}
        </div>
      </article>

      <article className="rounded-2xl border border-border bg-card p-5">
        <header className="mb-3">
          <h3 className="font-serif text-lg font-medium tracking-tight">Son aramalar</h3>
        </header>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Henüz arama yapmadın. Yukarıdaki kutuya yaz veya öneriden bir tane seç.
          </p>
        ) : (
          <ul className="space-y-1">
            {recent.map((r, i) => (
              <li key={`${r}-${i}`}>
                <button
                  type="button"
                  onClick={() => onPick(r)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] transition hover:bg-foreground/[0.04]"
                >
                  <Clock className="h-3.5 w-3.5 flex-none text-muted-foreground" />
                  {r}
                </button>
              </li>
            ))}
          </ul>
        )}
      </article>
    </div>
  )
}

function NoResults({ query }: { query: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border/70 bg-card/50 px-6 py-16 text-center">
      <SearchIcon className="mx-auto mb-3 h-8 w-8 text-muted-foreground/60" />
      <h3 className="font-serif text-lg font-medium tracking-tight">
        "{query}" için sonuç yok
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Daha az anahtar kelime kullanmayı dene veya kategorileri değiştir.
      </p>
    </div>
  )
}
