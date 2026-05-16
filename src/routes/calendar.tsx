import { useMemo, useState, useTransition } from 'react'
import {
  AlarmClock,
  Calendar as CalendarIcon,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Filter,
  MapPin,
  Plus,
  Users,
} from '@landx/icons'
import { PageShell, SkeletonCard } from '@landx/ui'
import {
  useEvents,
  useEventsCountByMonth,
  useEventsOnDay,
  useCreateEvent,
  useUpdateEvent,
  useDeleteEvent,
  eventTypeLabel,
  type CalendarEvent,
  type EventType,
} from '@landx/data'
import { cn } from '@landx/ui'
import { EventDetailDrawer } from '@/components/event-edit/EventDetailDrawer'
import { EditEventDrawer } from '@/components/event-edit/EditEventDrawer'
import { DeleteEventDialog } from '@/components/event-edit/DeleteEventDialog'
import { NewEventModal } from '@/components/event-edit/NewEventModal'

const TR_DAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']
const TR_MONTHS = [
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık',
]

const TYPE_META: Record<
  EventType,
  { icon: typeof CalendarIcon; tone: string; bg: string; dot: string }
> = {
  visit: {
    icon: MapPin,
    tone: 'text-sky-700 dark:text-sky-300',
    bg: 'bg-sky-500/10 dark:bg-sky-400/10',
    dot: 'bg-sky-500 dark:bg-sky-400',
  },
  deed: {
    icon: ClipboardCheck,
    tone: 'text-emerald-700 dark:text-emerald-300',
    bg: 'bg-emerald-500/10 dark:bg-emerald-400/10',
    dot: 'bg-emerald-500 dark:bg-emerald-400',
  },
  task: {
    icon: CheckSquare,
    tone: 'text-amber-700 dark:text-amber-300',
    bg: 'bg-amber-500/10 dark:bg-amber-400/10',
    dot: 'bg-amber-500 dark:bg-amber-400',
  },
  meeting: {
    icon: Users,
    tone: 'text-violet-700 dark:text-violet-300',
    bg: 'bg-violet-500/10 dark:bg-violet-400/10',
    dot: 'bg-violet-500 dark:bg-violet-400',
  },
  reminder: {
    icon: AlarmClock,
    tone: 'text-rose-700 dark:text-rose-300',
    bg: 'bg-rose-500/10 dark:bg-rose-400/10',
    dot: 'bg-rose-500 dark:bg-rose-400',
  },
}

function startOfMonthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1)
  const weekday = (first.getDay() + 6) % 7 // 0=Mon
  const start = new Date(year, month, 1 - weekday)
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })
}

export function Calendar() {
  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])
  const [cursor, setCursor] = useState<Date>(() => {
    const d = new Date()
    d.setDate(1)
    d.setHours(0, 0, 0, 0)
    return d
  })
  const [selected, setSelected] = useState<Date>(today)
  const [, startTransition] = useTransition()
  const [detailEvent, setDetailEvent] = useState<CalendarEvent | null>(null)
  const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null)
  const [deleteEvent, setDeleteEvent] = useState<CalendarEvent | null>(null)
  const [newOpen, setNewOpen] = useState(false)

  const createEvent = useCreateEvent()
  const updateEvent = useUpdateEvent()
  const deleteEventMutation = useDeleteEvent()

  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const grid = useMemo(() => startOfMonthGrid(year, month), [year, month])
  const { data: counts = {} } = useEventsCountByMonth(month, year)
  const { data: selectedEvents = [] } = useEventsOnDay(selected)
  const { data: allEvents = [], isPending: eventsPending } = useEvents()

  const goto = (delta: number) =>
    startTransition(() => {
      const next = new Date(cursor)
      next.setMonth(cursor.getMonth() + delta)
      setCursor(next)
    })

  const gotoToday = () => {
    const m = new Date()
    m.setDate(1)
    m.setHours(0, 0, 0, 0)
    setCursor(m)
    setSelected(today)
  }

  const upcoming = useMemo(() => {
    return [...allEvents]
      .filter((e) => new Date(e.date).getTime() >= today.getTime())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 5)
  }, [allEvents, today])

  const totalThisMonth = Object.values(counts).reduce((s, n) => s + n, 0)

  return (
    <PageShell
      eyebrow="MOD · TAKVİM"
      title={
        <>
          Atölye <em className="font-serif italic font-light">ajandası</em>
        </>
      }
      description={`${TR_MONTHS[month]} ${year} · ${totalThisMonth} etkinlik planlı.`}
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
            data-testid="calendar-new-event"
            onClick={() => setNewOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90"
          >
            <Plus className="h-3.5 w-3.5" />
            Yeni etkinlik
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_380px]">
        <section className="rounded-2xl border border-border bg-card p-5">
          <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => goto(-1)}
                aria-label="Önceki ay"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card transition hover:bg-foreground/5"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => goto(1)}
                aria-label="Sonraki ay"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card transition hover:bg-foreground/5"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={gotoToday}
                className="ml-1 rounded-lg border border-border bg-card px-3 py-1.5 text-[12px] font-medium transition hover:bg-foreground/5"
              >
                Bugün
              </button>
            </div>
            <h2 className="font-serif text-2xl font-light tracking-tight">
              {TR_MONTHS[month]} <span className="text-muted-foreground">{year}</span>
            </h2>
          </header>

          <div className="mb-2 grid grid-cols-7 gap-1 sm:gap-1.5">
            {TR_DAYS.map((d) => (
              <div
                key={d}
                className="px-1 py-1 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground sm:px-2"
              >
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
            {grid.map((d) => {
              const isCurrentMonth = d.getMonth() === month
              const isToday = d.getTime() === today.getTime()
              const isSelected = d.toDateString() === selected.toDateString()
              const count = counts[d.toDateString()] ?? 0
              return (
                <button
                  key={d.toISOString()}
                  type="button"
                  onClick={() => setSelected(new Date(d))}
                  className={cn(
                    'group relative flex aspect-square flex-col items-start gap-1 rounded-lg border p-1 text-left transition sm:rounded-xl sm:p-2',
                    isCurrentMonth ? 'bg-card' : 'bg-muted/30',
                    isCurrentMonth ? 'border-border' : 'border-transparent',
                    isSelected && 'border-foreground/50 ring-1 ring-foreground/20',
                    'hover:-translate-y-0.5 hover:border-foreground/30',
                  )}
                >
                  <span
                    className={cn(
                      'inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-0.5 font-mono text-[10px] tabular-nums sm:h-6 sm:min-w-[1.5rem] sm:px-1 sm:text-[11px]',
                      isToday
                        ? 'bg-accent text-accent-foreground font-semibold'
                        : isCurrentMonth
                          ? 'text-foreground'
                          : 'text-muted-foreground/50',
                    )}
                  >
                    {d.getDate()}
                  </span>
                  {count > 0 && (
                    <span className="absolute right-1 top-1 inline-flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-foreground/[0.08] px-1 font-mono text-[9px] font-semibold tabular-nums sm:right-2 sm:top-2 sm:h-4 sm:min-w-[16px]">
                      {count}
                    </span>
                  )}
                  <DayDots date={d} events={allEvents} />
                </button>
              )
            })}
          </div>
        </section>

        <aside className="space-y-5">
          {eventsPending && allEvents.length === 0 ? (
            <div
              className="grid grid-cols-1 gap-3"
              data-testid="calendar-skeleton"
            >
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : (
          <>
          <article className="rounded-2xl border border-border bg-card p-5">
            <header className="mb-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                {selected.toLocaleDateString('tr-TR', {
                  weekday: 'long',
                  day: '2-digit',
                  month: 'long',
                })}
              </div>
              <h3 className="font-serif text-lg font-medium tracking-tight">
                Günün ajandası
              </h3>
            </header>

            {selectedEvents.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/70 bg-background/40 px-4 py-8 text-center">
                <CalendarIcon className="mx-auto mb-2 h-6 w-6 text-muted-foreground/60" />
                <p className="text-sm text-muted-foreground">Bu güne etkinlik yok.</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {selectedEvents.map((e) => (
                  <EventRow
                    key={e.id}
                    event={e}
                    onClick={() => setDetailEvent(e)}
                  />
                ))}
              </ul>
            )}
          </article>

          <article className="rounded-2xl border border-border bg-card p-5">
            <header className="mb-3 flex items-baseline justify-between">
              <h3 className="font-serif text-lg font-medium tracking-tight">Yaklaşan</h3>
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                ilk 5
              </span>
            </header>
            <ul className="space-y-2">
              {upcoming.map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    data-testid={`calendar-upcoming-${e.id}`}
                    onClick={() => {
                      const d = new Date(e.date)
                      d.setHours(0, 0, 0, 0)
                      const m = new Date(d.getFullYear(), d.getMonth(), 1)
                      setCursor(m)
                      setSelected(d)
                      setDetailEvent(e)
                    }}
                    className="flex w-full items-start gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-foreground/[0.03]"
                  >
                    <EventIcon type={e.type} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium leading-tight">
                        {e.title}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {new Date(e.date).toLocaleDateString('tr-TR', {
                          day: '2-digit',
                          month: 'short',
                        })}{' '}
                        · {e.time ?? '—'}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </article>

          <article className="rounded-2xl border border-border bg-card p-5">
            <header className="mb-3">
              <h3 className="font-serif text-lg font-medium tracking-tight">Tip dağılımı</h3>
            </header>
            <ul className="space-y-2">
              {(Object.keys(TYPE_META) as EventType[]).map((t) => {
                const count = allEvents.filter((e) => e.type === t).length
                const meta = TYPE_META[t]
                return (
                  <li key={t} className="flex items-center justify-between text-[12.5px]">
                    <span className="inline-flex items-center gap-2">
                      <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
                      {eventTypeLabel(t)}
                    </span>
                    <span className="font-mono tabular-nums text-muted-foreground">
                      {count}
                    </span>
                  </li>
                )
              })}
            </ul>
          </article>
          </>
          )}
        </aside>
      </div>

      <EventDetailDrawer
        open={detailEvent !== null}
        event={detailEvent}
        onClose={() => setDetailEvent(null)}
        onEdit={(ev) => {
          setDetailEvent(null)
          setEditEvent(ev)
        }}
        onDelete={(ev) => {
          setDetailEvent(null)
          setDeleteEvent(ev)
        }}
      />

      <EditEventDrawer
        open={editEvent !== null}
        event={editEvent}
        pending={updateEvent.isPending}
        error={updateEvent.error}
        onClose={() => {
          if (!updateEvent.isPending) setEditEvent(null)
        }}
        onSubmit={({ id, patch }) => {
          updateEvent.mutate(
            { id, patch },
            {
              onSuccess: () => {
                setEditEvent(null)
              },
            },
          )
        }}
      />

      <DeleteEventDialog
        open={deleteEvent !== null}
        id={deleteEvent?.id}
        eventTitle={deleteEvent?.title}
        pending={deleteEventMutation.isPending}
        error={deleteEventMutation.error}
        onCancel={() => {
          if (!deleteEventMutation.isPending) setDeleteEvent(null)
        }}
        onConfirm={() => {
          if (!deleteEvent) return
          deleteEventMutation.mutate(deleteEvent.id, {
            onSuccess: () => {
              setDeleteEvent(null)
            },
          })
        }}
      />

      <NewEventModal
        open={newOpen}
        defaultDate={selected}
        pending={createEvent.isPending}
        error={createEvent.error}
        onClose={() => {
          if (!createEvent.isPending) setNewOpen(false)
        }}
        onSubmit={(input) => {
          createEvent.mutate(input, {
            onSuccess: () => {
              setNewOpen(false)
            },
          })
        }}
      />
    </PageShell>
  )
}

function DayDots({ date, events: allEvents }: { date: Date; events: CalendarEvent[] }) {
  const events = useMemo(() => {
    const t = date.toDateString()
    return allEvents.filter((e) => new Date(e.date).toDateString() === t)
  }, [date, allEvents])
  if (events.length === 0) return null
  const uniqueTypes = Array.from(new Set(events.map((e) => e.type))).slice(0, 4)
  return (
    <div className="mt-auto flex items-center gap-1">
      {uniqueTypes.map((t) => (
        <span key={t} className={cn('h-1.5 w-1.5 rounded-full', TYPE_META[t].dot)} />
      ))}
    </div>
  )
}

function EventRow({
  event,
  onClick,
}: {
  event: CalendarEvent
  onClick?: () => void
}) {
  return (
    <li className="rounded-xl border border-border/70 bg-background/40 transition hover:border-border hover:bg-foreground/[0.03]">
      <button
        type="button"
        data-testid={`calendar-event-row-${event.id}`}
        onClick={onClick}
        className="flex w-full items-start gap-3 rounded-xl p-3 text-left"
      >
        <EventIcon type={event.type} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <h4 className="text-[13.5px] font-semibold leading-tight">{event.title}</h4>
            <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
              {event.time}
            </span>
          </div>
          {event.location && (
            <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span className="truncate">{event.location}</span>
            </p>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-2 font-mono text-[10px] text-muted-foreground">
            <span>{event.owner}</span>
            {event.durationMin && (
              <>
                <span aria-hidden>·</span>
                <span>{event.durationMin} dk</span>
              </>
            )}
            {event.dealId && (
              <>
                <span aria-hidden>·</span>
                <span>{event.dealId}</span>
              </>
            )}
          </div>
          {event.notes && (
            <p className="mt-1.5 text-[11.5px] italic text-muted-foreground">
              {event.notes}
            </p>
          )}
        </div>
      </button>
    </li>
  )
}

function EventIcon({ type }: { type: EventType }) {
  const meta = TYPE_META[type]
  const Icon = meta.icon
  return (
    <span
      className={cn(
        'flex h-7 w-7 flex-none items-center justify-center rounded-lg',
        meta.bg,
        meta.tone,
      )}
    >
      <Icon className="h-3.5 w-3.5" />
    </span>
  )
}
