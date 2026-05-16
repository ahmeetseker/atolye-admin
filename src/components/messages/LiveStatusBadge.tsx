import { cn } from '@landx/ui'

interface LiveStatusBadgeProps {
  events: number
  className?: string
}

export function LiveStatusBadge({ events, className }: LiveStatusBadgeProps) {
  const hasNew = events > 0
  return (
    <span
      role="status"
      aria-live="polite"
      data-testid="messages-live-status"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground',
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          hasNew ? 'animate-pulse bg-emerald-500' : 'bg-foreground/30',
        )}
      />
      <span>Çevrimiçi</span>
      {hasNew && (
        <>
          <span aria-hidden className="opacity-50">
            ·
          </span>
          <span className="tabular-nums text-foreground/80">{events} yeni</span>
        </>
      )}
    </span>
  )
}
