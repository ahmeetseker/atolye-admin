import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { cn } from '@landx/ui'
import { useReducedMotion } from '@landx/ui/lib'
import { dismissToast, useToasts } from '@/lib/use-toast'
import { ToastCard } from './Toast'

/**
 * Global toast container.
 *
 * - Mounted once at the layout root.
 * - Top-right on md+, top-center on mobile.
 * - Newest on top. Visible cap (MAX_VISIBLE) is enforced in the store.
 * - aria-live="polite" so screen readers pick up new toasts without stealing focus.
 * - prefers-reduced-motion is honored by individual cards.
 * - Hovering or focusing inside the container pauses auto-dismiss for the stack.
 */
export function Toaster() {
  const toasts = useToasts()
  const [paused, setPaused] = useState(false)
  // Wave F28.B — shared `useReducedMotion` from @landx/ui/lib (replaces local
  // matchMedia reimplementation; same behavior, single source of truth).
  const reducedMotion = useReducedMotion()

  return (
    <div
      data-testid="toaster"
      role="region"
      aria-label="Bildirimler"
      aria-live="polite"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={cn(
        'fixed z-[90] flex flex-col gap-2 pointer-events-none',
        // mobile: top-center, full-width minus padding
        'left-1/2 top-4 w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2',
        // md+: top-right
        'md:left-auto md:right-6 md:top-6 md:translate-x-0',
      )}
    >
      <AnimatePresence initial={false} mode="popLayout">
        {toasts.map((t) => (
          <ToastCard
            key={t.id}
            toast={t}
            onDismiss={dismissToast}
            paused={paused}
            reducedMotion={reducedMotion}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}
