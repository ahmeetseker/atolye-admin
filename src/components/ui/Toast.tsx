import { useEffect, useRef } from 'react'
import { motion, type Transition } from 'framer-motion'
import { AlertTriangle, Check, Info, X } from '@landx/icons'
import { cn } from '@landx/ui'
import { REDUCED_MOTION_TRANSITION, motionGate } from '@landx/ui/lib'
import type { Toast as ToastModel, ToastVariant } from '@/lib/use-toast'

interface ToastCardProps {
  toast: ToastModel
  onDismiss: (id: string) => void
  /** Pauses the auto-dismiss timer when true (hover / focus-within). */
  paused: boolean
  /** Honor prefers-reduced-motion — disables spring entry. */
  reducedMotion: boolean
}

const VARIANT_ICON: Record<ToastVariant, typeof Check> = {
  success: Check,
  error: X,
  info: Info,
  warning: AlertTriangle,
}

const VARIANT_BORDER: Record<ToastVariant, string> = {
  success: 'border-foreground/20',
  error: 'border-foreground/30',
  info: 'border-border',
  warning: 'border-foreground/25',
}

const VARIANT_GLYPH_BG: Record<ToastVariant, string> = {
  success: 'bg-foreground/10 text-foreground',
  error: 'bg-foreground/15 text-foreground',
  info: 'bg-foreground/5 text-foreground',
  warning: 'bg-foreground/10 text-foreground',
}

/**
 * Single toast card.
 *
 * - Token-only colors (no rose-*, no bg-white). `error` variant uses a slightly
 *   stronger border + glyph background; the rest stay subtle so the stack reads
 *   as a coherent group.
 * - Auto-dismiss timer is owned by the card so each toast can pause on hover.
 * - ESC dismisses while focused.
 * - aria-atomic so screen readers announce the message as a unit.
 */
export function ToastCard({ toast, onDismiss, paused, reducedMotion }: ToastCardProps) {
  const Icon = VARIANT_ICON[toast.variant]
  const cardRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (paused) return
    if (toast.duration <= 0) return
    const id = window.setTimeout(() => onDismiss(toast.id), toast.duration)
    return () => window.clearTimeout(id)
  }, [paused, toast.duration, toast.id, onDismiss])

  useEffect(() => {
    const node = cardRef.current
    if (!node) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && node.contains(document.activeElement)) {
        e.preventDefault()
        onDismiss(toast.id)
      }
    }
    node.addEventListener('keydown', onKey)
    return () => node.removeEventListener('keydown', onKey)
  }, [toast.id, onDismiss])

  const initial = reducedMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.97 }
  const animate = reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }
  const exit = reducedMotion ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }
  // Wave F31.C — motionGate gates the toast-specific spring (snappier than
  // STANDARD_SPRING) against REDUCED_MOTION_TRANSITION via the shared helper.
  const transition = motionGate<Transition>(REDUCED_MOTION_TRANSITION, {
    type: 'spring',
    stiffness: 460,
    damping: 38,
    mass: 0.8,
  })

  return (
    <motion.div
      ref={cardRef}
      role={toast.variant === 'error' || toast.variant === 'warning' ? 'alert' : 'status'}
      aria-atomic="true"
      data-testid={`toast-${toast.variant}`}
      data-toast-id={toast.id}
      layout={!reducedMotion}
      initial={initial}
      animate={animate}
      exit={exit}
      transition={transition}
      className={cn(
        'pointer-events-auto flex items-start gap-3 rounded-2xl border bg-card p-3.5 shadow-lg',
        'backdrop-blur-sm',
        VARIANT_BORDER[toast.variant],
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'mt-0.5 inline-flex h-7 w-7 flex-none items-center justify-center rounded-full',
          VARIANT_GLYPH_BG[toast.variant],
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 flex-1 pt-0.5 text-[13px] leading-snug text-foreground">
        {toast.message}
      </div>
      <button
        type="button"
        aria-label="Bildirimi kapat"
        data-testid={`toast-dismiss-${toast.id}`}
        onClick={() => onDismiss(toast.id)}
        className={cn(
          'flex h-6 w-6 flex-none items-center justify-center rounded-lg text-muted-foreground transition',
          'hover:bg-foreground/5 hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground',
        )}
      >
        <X className="h-3 w-3" />
      </button>
    </motion.div>
  )
}
