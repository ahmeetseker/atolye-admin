import { useEffect, useId } from 'react'
import { AnimatePresence, motion, type Transition } from 'framer-motion'
import {
  Eye,
  MapPin,
  Pencil,
  Trash2,
  X,
} from '@landx/icons'
import {
  Sparkline,
  StatusChip,
  TypeChip,
  cn,
  formatTL,
  formatTLCompact,
  formatArea,
  timeAgo,
} from '@landx/ui'
import {
  FAST_FADE,
  REDUCED_MOTION_TRANSITION,
  STANDARD_SPRING,
  motionGate,
} from '@landx/ui/lib'
import type { Listing } from '@landx/data'

interface ListingDetailDrawerProps {
  open: boolean
  listing: Listing | null
  onClose: () => void
  onEdit: (listing: Listing) => void
  onDelete: (listing: Listing) => void
}

/**
 * Read-only side drawer that surfaces a listing's full field set
 * with Edit + Delete CTAs that delegate to F1A's mutation drawers.
 *
 * - Width: full-width on mobile / 480px md / 560px lg
 * - Sections: Konum · Özellikler · Fiyat & Durum · Etiketler · Aktivite
 * - Esc + backdrop click close
 * - URL state (?detail=<id>) is owned by the parent route
 */
export function ListingDetailDrawer({
  open,
  listing,
  onClose,
  onEdit,
  onDelete,
}: ListingDetailDrawerProps) {
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
      {open && listing && (
        <div
          role="presentation"
          data-testid="listing-detail-drawer"
          className="fixed inset-0 z-[65]"
        >
          <motion.button
            type="button"
            aria-label="Kapat"
            data-testid="listing-detail-backdrop"
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
                    MOD · İLAN DETAYI
                  </div>
                  <h2
                    id={titleId}
                    className="mt-1 font-serif text-xl font-light leading-tight"
                  >
                    İlan <em className="font-serif italic font-light">özeti</em>
                  </h2>
                  <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                    {listing.id}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Drawer'ı kapat"
                  data-testid="listing-detail-close"
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
                  <StatusChip status={listing.status} />
                  <TypeChip type={listing.type} />
                </div>
                <div className="flex flex-col gap-2 md:flex-row md:items-center">
                  <button
                    type="button"
                    data-testid="listing-detail-edit"
                    onClick={() => onEdit(listing)}
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
                    data-testid="listing-detail-delete"
                    onClick={() => onDelete(listing)}
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
                {listing.title}
              </h3>

              <div className="mt-5 space-y-5">
                <Section title="Konum">
                  <Row label="Şehir" value={listing.city} />
                  <Row label="İlçe / mevki" value={listing.district} />
                  {listing.lat !== undefined && listing.lng !== undefined ? (
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                        Koordinatlar
                      </div>
                      <div className="mt-1 rounded-xl border border-border bg-muted/30 p-3">
                        <div className="flex items-center gap-2 font-mono text-[12px] tabular-nums">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                          {listing.lat.toFixed(5)}, {listing.lng.toFixed(5)}
                        </div>
                        <a
                          href={`https://www.openstreetmap.org/?mlat=${listing.lat}&mlon=${listing.lng}#map=15/${listing.lat}/${listing.lng}`}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 inline-flex text-[11.5px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                        >
                          Tam haritada gör →
                        </a>
                      </div>
                    </div>
                  ) : (
                    <Row label="Koordinatlar" value="—" />
                  )}
                </Section>

                <Section title="Özellikler">
                  <Row label="Tip" value={listing.type} />
                  <Row
                    label="Büyüklük"
                    value={formatArea(listing.size)}
                    mono
                  />
                </Section>

                <Section title="Fiyat & durum">
                  <Row
                    label="Fiyat"
                    value={
                      <span className="font-serif text-base font-medium tabular-nums">
                        {formatTL(listing.price)}
                      </span>
                    }
                  />
                  <Row
                    label="Kısa"
                    value={
                      <span className="font-mono text-[12px] tabular-nums">
                        {formatTLCompact(listing.price)}
                      </span>
                    }
                  />
                  <Row
                    label="m² birim fiyatı"
                    value={
                      listing.size > 0
                        ? formatTLCompact(listing.price / listing.size)
                        : '—'
                    }
                    mono
                  />
                  <Row label="Durum" value={<StatusChip status={listing.status} />} />
                </Section>

                <Section title="Etiketler">
                  {listing.tags.length === 0 ? (
                    <div className="text-[12.5px] text-muted-foreground">
                      Etiket yok.
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {listing.tags.map((t) => (
                        <span
                          key={t}
                          className="rounded-full border border-border bg-muted/40 px-2.5 py-0.5 text-[11.5px] text-foreground/80"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </Section>

                <Section title="Aktivite">
                  <Row
                    label="Görüntülenme"
                    value={
                      <span className="inline-flex items-center gap-1.5 font-mono text-[12.5px] tabular-nums">
                        <Eye className="h-3 w-3" />
                        {listing.views.toLocaleString('tr-TR')}
                      </span>
                    }
                  />
                  <Row
                    label="Son güncelleme"
                    value={
                      <span className="text-[12.5px]">
                        {timeAgo(listing.lastUpdate)}
                      </span>
                    }
                  />
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      Haftalık trend
                    </div>
                    <div className="mt-1.5 rounded-xl border border-border bg-muted/30 p-3">
                      <Sparkline
                        data={listing.weeklyTrend}
                        width={200}
                        height={40}
                      />
                    </div>
                  </div>
                </Section>
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
