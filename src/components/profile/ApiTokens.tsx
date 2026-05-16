import { useEffect, useState, useSyncExternalStore } from 'react'
import { AnimatePresence, motion, type Transition } from 'framer-motion'
import {
  AlertTriangle,
  Copy,
  KeyRound,
  Plus,
  Trash2,
} from '@landx/icons'
import { cn } from '@landx/ui'
import {
  FAST_FADE,
  REDUCED_MOTION_TRANSITION,
  STANDARD_SPRING,
  motionGate,
} from '@landx/ui/lib'
import {
  createToken,
  getTokens,
  maskToken,
  revokeToken,
  type ApiToken,
  type TokenScope,
} from '@/lib/admin-tokens'
import { useToast } from '@/lib/use-toast'
import { RevokeTokenDialog } from './RevokeTokenDialog'

const tokenListeners = new Set<() => void>()
let tokensCache: ApiToken[] | null = null
function notifyTokens() {
  tokensCache = getTokens()
  for (const l of tokenListeners) l()
}
function subscribeTokens(cb: () => void) {
  tokenListeners.add(cb)
  return () => tokenListeners.delete(cb)
}
function getTokensSnapshot(): ApiToken[] {
  if (tokensCache === null) tokensCache = getTokens()
  return tokensCache
}
function useTokens(): ApiToken[] {
  return useSyncExternalStore(
    subscribeTokens,
    getTokensSnapshot,
    getTokensSnapshot,
  )
}

const SCOPE_LABEL: Record<TokenScope, string> = {
  read: 'Read',
  write: 'Write',
  admin: 'Admin',
}

const SCOPE_TONE: Record<TokenScope, string> = {
  read: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  write: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  admin: 'bg-foreground/10 text-foreground',
}

function fmtDate(ts?: number): string {
  if (!ts) return '—'
  return new Date(ts).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function ApiTokens() {
  const tokens = useTokens()
  const [createOpen, setCreateOpen] = useState(false)
  const [revokeFor, setRevokeFor] = useState<ApiToken | null>(null)
  const [revealToken, setRevealToken] = useState<ApiToken | null>(null)
  const { toast } = useToast()

  const handleRevoke = () => {
    if (!revokeFor) return
    revokeToken(revokeFor.id)
    notifyTokens()
    toast(`${revokeFor.name} tokeni silindi`, { variant: 'success' })
    setRevokeFor(null)
  }

  return (
    <div
      data-testid="api-tokens-section"
      className="rounded-2xl border border-border bg-card p-4 md:p-5"
    >
      <header className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h3 className="font-serif text-lg font-medium tracking-tight">
            API Tokenları
          </h3>
          <p className="text-[12.5px] text-muted-foreground">
            Otomasyon ve entegrasyonlar için. Her token bir kez gösterilir.
          </p>
        </div>
        <button
          type="button"
          data-testid="api-tokens-create"
          onClick={() => setCreateOpen(true)}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-foreground px-3 py-2 text-[12.5px] font-medium text-background transition hover:opacity-90 md:min-h-0"
        >
          <Plus className="h-3.5 w-3.5" />
          Yeni token üret
        </button>
      </header>

      {tokens.length === 0 ? (
        <div
          data-testid="api-tokens-empty"
          className="rounded-xl border border-dashed border-border bg-background/40 p-6 text-center"
        >
          <KeyRound className="mx-auto h-5 w-5 text-muted-foreground" />
          <p className="mt-2 text-[13px] font-medium">Henüz token yok</p>
          <p className="mt-1 text-[12px] text-muted-foreground">
            İlk tokeninizi üretip dış servislerle eşleştirin.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table
            className="w-full min-w-[640px] border-collapse text-left text-[13px]"
            data-testid="api-tokens-table"
          >
            <thead>
              <tr className="border-b border-border font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                <th className="py-2 pr-3 font-medium">İsim</th>
                <th className="py-2 pr-3 font-medium">Token</th>
                <th className="py-2 pr-3 font-medium">Yetki</th>
                <th className="py-2 pr-3 font-medium">Oluşturuldu</th>
                <th className="py-2 pr-3 font-medium">Son kullanım</th>
                <th className="py-2 pr-3 text-right font-medium">Aksiyon</th>
              </tr>
            </thead>
            <tbody>
              {tokens.map((t) => (
                <tr
                  key={t.id}
                  data-testid={`api-token-row-${t.id}`}
                  className="border-b border-border/70 last:border-0"
                >
                  <td className="py-2.5 pr-3 font-medium">{t.name}</td>
                  <td className="py-2.5 pr-3 font-mono text-[12px] text-muted-foreground">
                    {maskToken(t.prefix)}
                  </td>
                  <td className="py-2.5 pr-3">
                    <div className="flex flex-wrap gap-1">
                      {t.scopes.map((s) => (
                        <span
                          key={s}
                          className={cn(
                            'inline-flex rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider',
                            SCOPE_TONE[s],
                          )}
                        >
                          {SCOPE_LABEL[s]}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-2.5 pr-3 font-mono text-[11px] text-muted-foreground">
                    {fmtDate(t.createdAt)}
                  </td>
                  <td className="py-2.5 pr-3 font-mono text-[11px] text-muted-foreground">
                    {fmtDate(t.lastUsedAt)}
                  </td>
                  <td className="py-2.5 pr-3">
                    <div className="flex justify-end">
                      <button
                        type="button"
                        data-testid={`api-token-revoke-${t.id}`}
                        onClick={() => setRevokeFor(t)}
                        className="inline-flex items-center gap-1 rounded-lg border border-border bg-background/60 px-2 py-1 text-[11px] font-medium text-rose-700 transition hover:bg-rose-500/10 dark:text-rose-300"
                      >
                        <Trash2 className="h-3 w-3" />
                        Sil
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CreateTokenDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(token) => {
          notifyTokens()
          setCreateOpen(false)
          setRevealToken(token)
        }}
      />

      <ShowOnceDialog
        token={revealToken}
        onClose={() => setRevealToken(null)}
      />

      <RevokeTokenDialog
        open={!!revokeFor}
        tokenName={revokeFor?.name}
        onCancel={() => setRevokeFor(null)}
        onConfirm={handleRevoke}
      />
    </div>
  )
}

const SCOPE_OPTIONS: { value: TokenScope; label: string; hint: string }[] = [
  { value: 'read', label: 'Read', hint: 'Liste ve detay görüntüleme' },
  { value: 'write', label: 'Write', hint: 'İlan ve müşteri düzenleme' },
  { value: 'admin', label: 'Admin', hint: 'Tüm modül yönetimi' },
]

function CreateTokenDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: (token: ApiToken) => void
}) {
  const [name, setName] = useState('')
  const [scopes, setScopes] = useState<Set<TokenScope>>(new Set(['read']))
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()
  const backdropTransition = motionGate<Transition>(REDUCED_MOTION_TRANSITION, FAST_FADE)
  const panelTransition = motionGate<Transition>(REDUCED_MOTION_TRANSITION, STANDARD_SPRING)

  useEffect(() => {
    if (!open) return
    setName('')
    setScopes(new Set(['read']))
    setError(null)
  }, [open])

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

  const toggle = (s: TokenScope) => {
    setScopes((prev) => {
      const next = new Set(prev)
      if (next.has(s)) next.delete(s)
      else next.add(s)
      return next
    })
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Bir isim girin')
      return
    }
    if (scopes.size === 0) {
      setError('En az bir yetki seçin')
      return
    }
    const token = createToken({
      name: trimmed,
      scopes: Array.from(scopes),
    })
    toast('Token üretildi', { variant: 'success' })
    onCreated(token)
  }

  return (
    <AnimatePresence>
      {open && (
        <div
          data-testid="api-token-create-dialog"
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
          <motion.form
            role="dialog"
            aria-modal="true"
            onSubmit={submit}
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 4 }}
            transition={panelTransition}
            className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-xl"
          >
            <div className="p-5">
              <h2 className="font-serif text-lg font-light leading-tight">
                Yeni API <em className="font-serif italic font-light">tokeni</em>
              </h2>
              <p className="mt-1 text-[12.5px] text-muted-foreground">
                Token üretildikten sonra tam değer{' '}
                <em className="font-serif italic font-light">bir kez</em>{' '}
                gösterilir.
              </p>

              <div className="mt-5 space-y-4">
                <div>
                  <label
                    htmlFor="token-name"
                    className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
                  >
                    İsim
                  </label>
                  <input
                    id="token-name"
                    data-testid="api-token-name-input"
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value)
                      if (error) setError(null)
                    }}
                    placeholder="Örn: CRM webhook"
                    className="mt-1 w-full min-h-11 rounded-xl border border-border bg-background/40 px-3 py-2 text-[13.5px] outline-none placeholder:text-muted-foreground/50 focus:border-foreground/40 md:min-h-0"
                  />
                </div>

                <fieldset>
                  <legend className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    Yetkiler
                  </legend>
                  <div className="mt-1.5 space-y-1.5">
                    {SCOPE_OPTIONS.map((s) => {
                      const checked = scopes.has(s.value)
                      return (
                        <label
                          key={s.value}
                          className={cn(
                            'flex cursor-pointer items-start gap-2 rounded-xl border px-3 py-2.5 transition',
                            checked
                              ? 'border-foreground/60 bg-foreground/[0.04]'
                              : 'border-border bg-background/40 hover:bg-foreground/[0.03]',
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggle(s.value)}
                            data-testid={`api-token-scope-${s.value}`}
                            className="mt-0.5 h-3.5 w-3.5 accent-foreground"
                          />
                          <span className="min-w-0">
                            <span className="block text-[12.5px] font-medium leading-tight">
                              {s.label}
                            </span>
                            <span className="mt-0.5 block font-mono text-[10px] text-muted-foreground">
                              {s.hint}
                            </span>
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </fieldset>

                {error && (
                  <p
                    role="alert"
                    data-testid="api-token-error"
                    className="text-[11.5px] text-rose-700 dark:text-rose-300"
                  >
                    {error}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-col-reverse gap-2 border-t border-border bg-muted/30 px-5 py-3 md:flex-row md:justify-end">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-[13px] font-medium transition hover:bg-foreground/5"
              >
                İptal
              </button>
              <button
                type="submit"
                data-testid="api-token-create-submit"
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-foreground px-4 py-2 text-[13px] font-medium text-background transition hover:opacity-90"
              >
                Üret
              </button>
            </div>
          </motion.form>
        </div>
      )}
    </AnimatePresence>
  )
}

function ShowOnceDialog({
  token,
  onClose,
}: {
  token: ApiToken | null
  onClose: () => void
}) {
  const { toast } = useToast()
  const backdropTransition = motionGate<Transition>(REDUCED_MOTION_TRANSITION, FAST_FADE)
  const panelTransition = motionGate<Transition>(REDUCED_MOTION_TRANSITION, STANDARD_SPRING)

  const copy = async () => {
    if (!token?.fullValue) return
    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      toast('Pano erişimi yok', { variant: 'error' })
      return
    }
    try {
      await navigator.clipboard.writeText(token.fullValue)
      toast('Token panoya kopyalandı', { variant: 'success' })
    } catch {
      toast('Kopyalanamadı', { variant: 'error' })
    }
  }

  return (
    <AnimatePresence>
      {token && token.fullValue && (
        <div
          data-testid="api-token-reveal-dialog"
          className="fixed inset-0 z-[90] grid place-items-center p-4"
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
                    Token <em className="font-serif italic font-light">bir kez</em>{' '}
                    gösterilir
                  </h2>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                    Bu token bir daha gösterilmeyecek. Kopyalayıp güvenli yere
                    saklayın.
                  </p>
                </div>
              </div>
              <pre
                data-testid="api-token-reveal-value"
                className="mt-4 whitespace-pre-wrap break-all rounded-lg bg-foreground/[0.04] px-3 py-2.5 font-mono text-[12.5px]"
              >
                {token.fullValue}
              </pre>
            </div>
            <div className="flex flex-col-reverse gap-2 border-t border-border bg-muted/30 px-5 py-3 md:flex-row md:justify-between">
              <button
                type="button"
                data-testid="api-token-reveal-copy"
                onClick={copy}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-[13px] font-medium transition hover:bg-foreground/5"
              >
                <Copy className="h-3.5 w-3.5" />
                Kopyala
              </button>
              <button
                type="button"
                data-testid="api-token-reveal-close"
                onClick={onClose}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-foreground px-4 py-2 text-[13px] font-medium text-background transition hover:opacity-90"
              >
                Sakladım, kapat
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
