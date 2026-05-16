import { useEffect, useRef } from 'react'
import { AnimatePresence, motion, type Transition } from 'framer-motion'
import { AlertTriangle } from '@landx/icons'
import {
  FAST_FADE,
  REDUCED_MOTION_TRANSITION,
  STANDARD_SPRING,
  motionGate,
} from '@landx/ui/lib'

interface RevokeTokenDialogProps {
  open: boolean
  tokenName?: string
  onCancel: () => void
  onConfirm: () => void
}

/**
 * Destructive confirm for an API token revoke. Initial focus on İptal so that
 * stray Enter does not silently drop production credentials.
 */
export function RevokeTokenDialog({
  open,
  tokenName,
  onCancel,
  onConfirm,
}: RevokeTokenDialogProps) {
  const cancelRef = useRef<HTMLButtonElement | null>(null)
  const backdropTransition = motionGate<Transition>(REDUCED_MOTION_TRANSITION, FAST_FADE)
  const panelTransition = motionGate<Transition>(REDUCED_MOTION_TRANSITION, STANDARD_SPRING)

  useEffect(() => {
    if (!open) return
    queueMicrotask(() => cancelRef.current?.focus())
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  return (
    <AnimatePresence>
      {open && (
        <div
          data-testid="token-revoke-dialog"
          className="fixed inset-0 z-[80] grid place-items-center p-4"
        >
          <motion.button
            type="button"
            aria-label="Kapat"
            onClick={onCancel}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={backdropTransition}
            className="absolute inset-0 cursor-default bg-foreground/40 backdrop-blur-sm"
          />
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="token-revoke-title"
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 4 }}
            transition={panelTransition}
            className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-xl"
          >
            <div className="flex items-start gap-3 p-5">
              <span className="mt-0.5 inline-flex h-8 w-8 flex-none items-center justify-center rounded-full bg-rose-500/15 text-rose-700 dark:text-rose-300">
                <AlertTriangle className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <h2
                  id="token-revoke-title"
                  className="font-serif text-lg font-light leading-tight"
                >
                  Token <em className="font-serif italic font-light">silinsin</em> mi?
                </h2>
                <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                  {tokenName ? (
                    <>
                      <span className="text-foreground">{tokenName}</span>{' '}
                      tokeni iptal edilecek. Bu tokenle yapılan tüm istekler{' '}
                      <em className="font-serif italic font-light">anında reddedilir</em>.
                    </>
                  ) : (
                    'Bu tokenle yapılan tüm istekler anında reddedilir.'
                  )}{' '}
                  Bu işlem geri alınamaz.
                </p>
              </div>
            </div>
            <div className="flex flex-col-reverse gap-2 border-t border-border bg-muted/30 px-5 py-3 md:flex-row md:justify-end">
              <button
                ref={cancelRef}
                type="button"
                data-testid="token-revoke-cancel"
                onClick={onCancel}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-[13px] font-medium transition hover:bg-foreground/5"
              >
                İptal
              </button>
              <button
                type="button"
                data-testid="token-revoke-confirm"
                onClick={onConfirm}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-foreground px-4 py-2 text-[13px] font-medium text-background transition hover:opacity-90"
              >
                Sil
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
