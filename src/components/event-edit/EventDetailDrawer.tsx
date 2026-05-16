import { useEffect, useId } from 'react'
import { AnimatePresence, motion, type Transition } from 'framer-motion'
import { Clock, MapPin, Pencil, Trash2, X } from '@landx/icons'
import { cn } from '@landx/ui'
import {
  FAST_FADE,
  REDUCED_MOTION_TRANSITION,
  STANDARD_SPRING,
  motionGate,
} from '@landx/ui/lib'
import { eventTypeLabel, type CalendarEvent } from '@landx/data'

interface EventDetailDrawerProps {
  open: boolean
  event: CalendarEvent | null
  onClose: () => void
  onEdit: (event: CalendarEvent) => void
  onDelete: (event: CalendarEvent) => void
}

function formatDateTR(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('tr-TR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

/**
 * Read-only side drawer for calendar event detail.
 *
 * Mirrors F2B's ListingDetailDrawer:
 * - Right-side drawer, full-width mobile / 480px md / 560px lg
 * - Esc + backdrop close
 * - Edit + Delete CTAs delegate to parent mutation drawers
 */
export function EventDetailDrawer({
  open,
  event,
  onClose,
  onEdit,
  onDelete,
}: EventDetailDrawerProps) {
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
      {open && event && (
        <div
          role="presentation"
          data-testid="event-detail-drawer"
          className="fixed inset-0 z-[65]"
        >
          <motion.button
            type="button"
            aria-label="Kapat"
            data-testid="event-detail-backdrop"
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
            <header
              className={cn(
                'sticky top-0 z-10 border-b border-border bg-card px-5 py-4',
                'flex flex-col gap-3',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    MOD · ETKİNLİK DETAYI
                  </div>
                  <h2
                    id={titleId}
                    className="mt-1 font-serif text-xl font-light leading-tight"
                  >
                    Etkinlik <em className="font-serif italic font-light">özeti</em>
                  </h2>
                  <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                    {event.id}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Drawer'ı kapat"
                  data-testid="event-detail-close"
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
                  <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2.5 py-0.5 text-[11.5px] text-foreground/80">
                    {eventTypeLabel(event.type)}
                  </span>
                </div>
                <div className="flex flex-col gap-2 md:flex-row md:items-center">
                  <button
                    type="button"
                    data-testid="event-detail-edit"
                    onClick={() => onEdit(event)}
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
                    data-testid="event-detail-delete"
                    onClick={() => onDelete(event)}
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
                {event.title}
              </h3>

              <div className="mt-5 space-y-5">
                <Section title="Zaman">
                  <Row label="Tarih" value={formatDateTR(event.date)} />
                  <Row
                    label="Saat"
                    value={
                      <span className="inline-flex items-center gap-1.5 font-mono text-[12.5px] tabular-nums">
                        <Clock className="h-3 w-3" />
                        {event.time ?? '—'}
                      </span>
                    }
                  />
                  <Row
                    label="Süre"
                    value={event.durationMin ? `${event.durationMin} dk` : '—'}
                    mono
                  />
                </Section>

                <Section title="Yer & sahip">
                  <Row
                    label="Konum"
                    value={
                      event.location ? (
                        <span className="inline-flex items-center gap-1 text-[13px]">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          {event.location}
                        </span>
                      ) : (
                        '—'
                      )
                    }
                  />
                  <Row label="Sahip" value={event.owner} />
                </Section>

                <Section title="İlişki">
                  <Row label="İlan" value={event.dealId ?? '—'} mono />
                  <Row label="Müşteri" value={event.customerName ?? '—'} />
                </Section>

                {event.notes && (
                  <Section title="Not">
                    <p className="text-[13px] italic text-muted-foreground">
                      {event.notes}
                    </p>
                  </Section>
                )}
              </div>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
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
  value: React.ReactNode
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
