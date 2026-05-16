import { useEffect, useRef } from 'react'
import { AnimatePresence, motion, type Transition } from 'framer-motion'
import { AlertTriangle, Loader2 } from '@landx/icons'
import { cn } from '@landx/ui'
import {
  FAST_FADE,
  REDUCED_MOTION_TRANSITION,
  STANDARD_SPRING,
  motionGate,
} from '@landx/ui/lib'
import { useToast } from '@/lib/use-toast'

interface DeleteListingDialogProps {
  open: boolean
  /** Listing id surfaced in the message ("L-1234 ilanı silinecek.") */
  id?: string
  /** Optional listing title used inside the confirm sentence */
  listingTitle?: string
  pending?: boolean
  error?: Error | null
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Destructive-confirm dialog.
 *
 * - Token-only colors. Backdrop = bg-foreground/40 + blur.
 * - Esc + backdrop-click + İptal all close (safer defaults).
 * - Initial focus on "İptal" so accidental Enter does NOT delete.
 * - Spring (stiffness 460, damping 38, mass 0.8) — INP-friendly.
 */
export function DeleteListingDialog({
  open,
  id,
  listingTitle,
  pending = false,
  error = null,
  onConfirm,
  onCancel,
}: DeleteListingDialogProps) {
  const cancelRef = useRef<HTMLButtonElement | null>(null)
  const { toast } = useToast()
  const confirmedRef = useRef(false)
  const prevPendingRef = useRef(false)
  const backdropTransition = motionGate<Transition>(REDUCED_MOTION_TRANSITION, FAST_FADE)
  const panelTransition = motionGate<Transition>(REDUCED_MOTION_TRANSITION, STANDARD_SPRING)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        if (!pending) onCancel()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, pending, onCancel])

  useEffect(() => {
    const wasPending = prevPendingRef.current
    if (wasPending && !pending && confirmedRef.current) {
      confirmedRef.current = false
      if (error) {
        toast(`Silinemedi: ${error.message || 'Tekrar dener misin?'}`, { variant: 'error' })
      } else {
        toast('Silindi', { variant: 'success' })
      }
    }
    prevPendingRef.current = pending
  }, [pending, error, toast])

  const handleConfirm = () => {
    confirmedRef.current = true
    onConfirm()
  }

  useEffect(() => {
    if (open) {
      queueMicrotask(() => cancelRef.current?.focus())
    }
  }, [open])

  const subject = listingTitle ?? (id ? id : 'bu')

  return (
    <AnimatePresence>
      {open && (
        <div
          role="presentation"
          data-testid="listing-delete-dialog"
          className="fixed inset-0 z-[80] grid place-items-center p-4 md:p-6"
        >
          <motion.button
            type="button"
            aria-label="Kapat"
            onClick={() => {
              if (!pending) onCancel()
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={backdropTransition}
            className="absolute inset-0 cursor-default bg-foreground/40 backdrop-blur-sm"
          />
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="listing-delete-title"
            aria-describedby="listing-delete-desc"
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 4 }}
            transition={panelTransition}
            className={cn(
              'relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-xl',
            )}
          >
            <div className="flex items-start gap-3 p-4 md:p-6">
              <span className="mt-0.5 inline-flex h-8 w-8 flex-none items-center justify-center rounded-full bg-foreground/10 text-foreground">
                <AlertTriangle className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <h2
                  id="listing-delete-title"
                  className="font-serif text-lg font-light leading-tight"
                >
                  İlan <em className="font-serif italic font-light">silinsin mi</em>?
                </h2>
                <p
                  id="listing-delete-desc"
                  className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground"
                >
                  <span className="text-foreground">
                    {subject}
                  </span>{' '}
                  arsanı silmek istediğinizden emin misiniz? Bu işlem{' '}
                  <em className="font-serif italic font-light">geri alınamaz</em>.
                </p>
                {error && (
                  <div
                    role="alert"
                    className="mt-3 rounded-lg border border-border bg-foreground/5 px-3 py-2 text-[12.5px] text-foreground"
                  >
                    Silme başarısız. Tekrar dener misin?
                  </div>
                )}
              </div>
            </div>
            <div
              className={cn(
                'flex flex-col-reverse gap-2 border-t border-border bg-muted/30 px-4 py-3 md:flex-row md:items-center md:justify-end md:px-6',
              )}
            >
              <button
                ref={cancelRef}
                type="button"
                data-testid="listing-delete-cancel"
                onClick={onCancel}
                disabled={pending}
                className={cn(
                  'inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-[13px] font-medium transition',
                  'hover:bg-foreground/5 disabled:cursor-not-allowed disabled:opacity-50',
                )}
              >
                İptal
              </button>
              <button
                type="button"
                data-testid="listing-delete-confirm"
                onClick={handleConfirm}
                disabled={pending}
                className={cn(
                  'inline-flex items-center justify-center gap-1.5 rounded-xl bg-foreground px-4 py-2 text-[13px] font-medium text-background transition',
                  'hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60',
                )}
              >
                {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {pending ? 'Siliniyor…' : 'Sil'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
