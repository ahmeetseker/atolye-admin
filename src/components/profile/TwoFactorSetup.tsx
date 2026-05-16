import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { AnimatePresence, motion, type Transition } from 'framer-motion'
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  ShieldCheck,
} from '@landx/icons'
import { cn } from '@landx/ui'
import {
  FAST_FADE,
  REDUCED_MOTION_TRANSITION,
  STANDARD_SPRING,
  motionGate,
} from '@landx/ui/lib'
import {
  disableTwoFactor,
  enableTwoFactor,
  getMockSecret,
  getTwoFactorState,
  type TwoFactorState,
} from '@/lib/admin-2fa'
import { useToast } from '@/lib/use-toast'

/**
 * Subscription store for 2FA so other panel components (e.g. settings page
 * security row) can pick up state changes without lifting React state up.
 *
 * Snapshot is memoized because `getTwoFactorState()` returns a fresh object
 * per call — required by `useSyncExternalStore` to avoid infinite re-renders.
 */
const twoFaListeners = new Set<() => void>()
let twoFaCache: TwoFactorState | null = null
function notifyTwoFa() {
  twoFaCache = getTwoFactorState()
  for (const l of twoFaListeners) l()
}
function subscribeTwoFa(cb: () => void) {
  twoFaListeners.add(cb)
  return () => twoFaListeners.delete(cb)
}
function getTwoFaSnapshot(): TwoFactorState {
  if (twoFaCache === null) twoFaCache = getTwoFactorState()
  return twoFaCache
}
function useTwoFactor(): TwoFactorState {
  return useSyncExternalStore(subscribeTwoFa, getTwoFaSnapshot, getTwoFaSnapshot)
}

export function TwoFactorSetup() {
  const state = useTwoFactor()
  const [pendingBackup, setPendingBackup] = useState<string[] | null>(null)
  return (
    <div
      className="rounded-2xl border border-border bg-card p-4 md:p-5"
      data-testid="two-factor-section"
    >
      <header className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-serif text-lg font-medium tracking-tight">
            Güvenlik · 2FA
          </h3>
          <p className="text-[12.5px] text-muted-foreground">
            Authenticator app + 6 haneli kod. Yedek kodlar tek kullanımlık.
          </p>
        </div>
        <span
          data-testid="two-factor-status"
          className={cn(
            'inline-flex flex-none items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider',
            state.enabled
              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
              : 'bg-foreground/[0.06] text-foreground/70',
          )}
        >
          {state.enabled ? (
            <>
              <CheckCircle2 className="h-3 w-3" /> Aktif
            </>
          ) : (
            'Kapalı'
          )}
        </span>
      </header>

      {state.enabled ? (
        <EnabledView state={state} />
      ) : (
        <DisabledView onEnabled={setPendingBackup} />
      )}

      <BackupCodesDialog
        codes={pendingBackup}
        onClose={() => setPendingBackup(null)}
      />
    </div>
  )
}

function DisabledView({
  onEnabled,
}: {
  onEnabled: (codes: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const secret = open ? getMockSecret() : ''

  const verify = () => {
    setError(null)
    const result = enableTwoFactor(code)
    if (!result.ok) {
      setError(result.reason ?? 'Geçersiz kod')
      return
    }
    // Surface backup codes UP to the parent BEFORE we flip global state — once
    // notifyTwoFa() fires, the parent re-renders and unmounts DisabledView.
    onEnabled(result.state?.backupCodes ?? [])
    notifyTwoFa()
    toast('İki faktörlü doğrulama aktif', { variant: 'success' })
  }

  return (
    <>
      {!open ? (
        <button
          type="button"
          data-testid="two-factor-enable"
          onClick={() => setOpen(true)}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-foreground px-3 py-2 text-[12.5px] font-medium text-background transition hover:opacity-90 md:min-h-0"
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          Etkinleştir
        </button>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-dashed border-border bg-background/40 p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Mock QR Code
            </p>
            <pre
              data-testid="two-factor-secret"
              className="mt-2 whitespace-pre-wrap break-all rounded-lg bg-foreground/[0.04] px-3 py-2 font-mono text-[12px] text-foreground"
            >
              {secret}
            </pre>
            <p className="mt-2 text-[11.5px] text-muted-foreground">
              Authenticator app'inden tarayın veya kodu manuel girin.
            </p>
          </div>

          <div>
            <label
              htmlFor="two-factor-code"
              className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
            >
              6 haneli doğrulama kodu
            </label>
            <input
              id="two-factor-code"
              data-testid="two-factor-code-input"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                if (error) setError(null)
              }}
              placeholder="123456"
              className="mt-1 w-full min-h-11 rounded-xl border border-border bg-background/40 px-3 py-2 font-mono text-[16px] tracking-[0.4em] outline-none placeholder:text-muted-foreground/40 focus:border-foreground/40 md:min-h-0"
            />
            {error && (
              <p
                role="alert"
                data-testid="two-factor-error"
                className="mt-1.5 text-[11.5px] text-rose-700 dark:text-rose-300"
              >
                {error}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                setCode('')
                setError(null)
              }}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-[12.5px] font-medium transition hover:bg-foreground/5 md:min-h-0"
            >
              İptal
            </button>
            <button
              type="button"
              data-testid="two-factor-verify"
              onClick={verify}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-foreground px-3 py-2 text-[12.5px] font-medium text-background transition hover:opacity-90 md:min-h-0"
            >
              Doğrula
            </button>
          </div>
        </div>
      )}

    </>
  )
}

function EnabledView({ state }: { state: TwoFactorState }) {
  const [reveal, setReveal] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const { toast } = useToast()

  const codes = state.backupCodes ?? []

  const handleDisable = () => {
    disableTwoFactor()
    notifyTwoFa()
    setConfirming(false)
    toast('İki faktörlü doğrulama kapatıldı', { variant: 'warning' })
  }

  const copyAll = async () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      toast('Pano erişimi yok', { variant: 'error' })
      return
    }
    try {
      await navigator.clipboard.writeText(codes.join('\n'))
      toast('Yedek kodlar kopyalandı', { variant: 'success' })
    } catch {
      toast('Kopyalanamadı', { variant: 'error' })
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-background/40 p-3.5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[12.5px] font-medium">
            Yedek kodlar ({codes.length})
          </p>
          <button
            type="button"
            data-testid="two-factor-reveal"
            onClick={() => setReveal((v) => !v)}
            className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground transition hover:text-foreground"
          >
            {reveal ? (
              <>
                <EyeOff className="h-3 w-3" /> Gizle
              </>
            ) : (
              <>
                <Eye className="h-3 w-3" /> Göster
              </>
            )}
          </button>
        </div>
        <ul
          data-testid="two-factor-codes"
          className="mt-3 grid grid-cols-2 gap-1.5 font-mono text-[12px] sm:grid-cols-5"
        >
          {codes.map((c, i) => (
            <li
              key={i}
              className="rounded-lg bg-foreground/[0.04] px-2 py-1 text-center"
            >
              {reveal ? c : '••••••••'}
            </li>
          ))}
        </ul>
        <button
          type="button"
          data-testid="two-factor-copy-codes"
          onClick={copyAll}
          className="mt-3 inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground transition hover:text-foreground"
        >
          <Copy className="h-3 w-3" />
          Tümünü kopyala
        </button>
      </div>

      <button
        type="button"
        data-testid="two-factor-disable"
        onClick={() => setConfirming(true)}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-[12.5px] font-medium text-rose-700 transition hover:bg-rose-500/10 dark:text-rose-300 md:min-h-0"
      >
        <AlertTriangle className="h-3.5 w-3.5" />
        Devre dışı bırak
      </button>

      <DisableConfirmDialog
        open={confirming}
        onCancel={() => setConfirming(false)}
        onConfirm={handleDisable}
      />
    </div>
  )
}

function BackupCodesDialog({
  codes,
  onClose,
}: {
  codes: string[] | null
  onClose: () => void
}) {
  const { toast } = useToast()
  const backdropTransition = motionGate<Transition>(REDUCED_MOTION_TRANSITION, FAST_FADE)
  const panelTransition = motionGate<Transition>(REDUCED_MOTION_TRANSITION, STANDARD_SPRING)
  const copy = async () => {
    if (!codes) return
    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      toast('Pano erişimi yok', { variant: 'error' })
      return
    }
    try {
      await navigator.clipboard.writeText(codes.join('\n'))
      toast('Kodlar panoya kopyalandı', { variant: 'success' })
    } catch {
      toast('Kopyalanamadı', { variant: 'error' })
    }
  }

  return (
    <AnimatePresence>
      {codes && (
        <div
          data-testid="two-factor-backup-dialog"
          className="fixed inset-0 z-[80] grid place-items-center p-4"
        >
          <motion.button
            type="button"
            aria-label="Kapat"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={backdropTransition}
            className="absolute inset-0 cursor-default bg-foreground/40 backdrop-blur-sm"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 4 }}
            transition={panelTransition}
            className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-xl"
          >
            <div className="p-5">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-8 w-8 flex-none items-center justify-center rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300">
                  <AlertTriangle className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-serif text-lg font-light leading-tight">
                    Yedek <em className="font-serif italic font-light">kodlarınız</em>
                  </h2>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
                    Bu kodları güvenli bir yerde saklayın. Telefonunuz kaybolursa
                    her biri tek kullanımlık giriş hakkı verir.
                  </p>
                </div>
              </div>
              <ul className="mt-4 grid grid-cols-2 gap-1.5 font-mono text-[12.5px] sm:grid-cols-2">
                {codes.map((c, i) => (
                  <li
                    key={i}
                    className="rounded-lg bg-foreground/[0.04] px-2 py-1.5 text-center tracking-[0.08em]"
                  >
                    {c}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col-reverse gap-2 border-t border-border bg-muted/30 px-5 py-3 md:flex-row md:justify-between">
              <button
                type="button"
                data-testid="two-factor-backup-copy"
                onClick={copy}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-[13px] font-medium transition hover:bg-foreground/5"
              >
                <Copy className="h-3.5 w-3.5" />
                Tümünü kopyala
              </button>
              <button
                type="button"
                data-testid="two-factor-backup-close"
                onClick={onClose}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-foreground px-4 py-2 text-[13px] font-medium text-background transition hover:opacity-90"
              >
                Anladım, kaydettim
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

function DisableConfirmDialog({
  open,
  onCancel,
  onConfirm,
}: {
  open: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  const cancelRef = useRef<HTMLButtonElement | null>(null)
  const backdropTransition = motionGate<Transition>(REDUCED_MOTION_TRANSITION, FAST_FADE)
  const panelTransition = motionGate<Transition>(REDUCED_MOTION_TRANSITION, STANDARD_SPRING)

  useEffect(() => {
    if (open) queueMicrotask(() => cancelRef.current?.focus())
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <div
          data-testid="two-factor-disable-dialog"
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
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 4 }}
            transition={panelTransition}
            className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-xl"
          >
            <div className="p-5">
              <h2 className="font-serif text-lg font-light leading-tight">
                2FA <em className="font-serif italic font-light">kapatılsın</em> mı?
              </h2>
              <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                Hesabınızın güvenliği yalnızca şifreye düşer. Yedek kodlarınız da
                silinir.
              </p>
            </div>
            <div className="flex flex-col-reverse gap-2 border-t border-border bg-muted/30 px-5 py-3 md:flex-row md:justify-end">
              <button
                ref={cancelRef}
                type="button"
                onClick={onCancel}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-[13px] font-medium transition hover:bg-foreground/5"
              >
                İptal
              </button>
              <button
                type="button"
                data-testid="two-factor-disable-confirm"
                onClick={onConfirm}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-foreground px-4 py-2 text-[13px] font-medium text-background transition hover:opacity-90"
              >
                Devre dışı bırak
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
