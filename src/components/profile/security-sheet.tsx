import { useState } from 'react'
import { KeyRound, Laptop, ShieldCheck, Smartphone } from '@landx/icons'
import { Dialog, cn } from '@landx/ui'

interface SecuritySheetProps {
  open: boolean
  onClose: () => void
}

interface ActiveSession {
  id: string
  device: string
  icon: typeof Laptop
  location: string
  lastActive: string
  current?: boolean
}

const ACTIVE_SESSIONS: ActiveSession[] = [
  {
    id: 's1',
    device: 'MacBook Pro · Safari',
    icon: Laptop,
    location: 'İstanbul, TR',
    lastActive: 'Şimdi',
    current: true,
  },
  {
    id: 's2',
    device: 'iPhone 15 · Atölye App',
    icon: Smartphone,
    location: 'İstanbul, TR',
    lastActive: '2 saat önce',
  },
  {
    id: 's3',
    device: 'iPad · Safari',
    icon: Laptop,
    location: 'Bodrum, TR',
    lastActive: '3 gün önce',
  },
]

export function SecuritySheet({ open, onClose }: SecuritySheetProps) {
  const [twoFA, setTwoFA] = useState(true)
  const [notifyNewDevice, setNotifyNewDevice] = useState(true)

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title={
        <span className="flex flex-col gap-0.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            MOD · GÜVENLİK
          </span>
          <span className="font-serif text-lg font-light tracking-tight">
            Hesap <em className="font-serif italic font-light">güvenliği</em>
          </span>
        </span>
      }
      description="2FA, oturumlar ve cihaz bildirimleri"
    >
      <div className="space-y-5">
        <section className="rounded-xl border border-border bg-background/40 p-3">
          <ToggleRow
            icon={ShieldCheck}
            title="İki faktörlü doğrulama (2FA)"
            hint="Authenticator uygulaması üzerinden korumalı."
            checked={twoFA}
            onChange={setTwoFA}
          />
          <ToggleRow
            icon={Smartphone}
            title="Yeni cihaz girişlerini bildir"
            hint="Tanımadık cihazdan giriş olduğunda e-posta gönderilir."
            checked={notifyNewDevice}
            onChange={setNotifyNewDevice}
          />
        </section>

        <section>
          <h4 className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Aktif oturumlar ({ACTIVE_SESSIONS.length})
          </h4>
          <ul className="space-y-2">
            {ACTIVE_SESSIONS.map((s) => {
              const Icon = s.icon
              return (
                <li
                  key={s.id}
                  className="flex items-center gap-3 rounded-xl border border-border bg-background/40 p-3"
                >
                  <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-foreground/[0.06] text-foreground/80">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <h5 className="truncate text-[13.5px] font-medium leading-tight">
                        {s.device}
                      </h5>
                      {s.current && (
                        <span className="inline-flex rounded-full bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                          Bu cihaz
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      {s.location} · {s.lastActive}
                    </p>
                  </div>
                  {!s.current && (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-lg border border-border bg-background/60 px-2 py-1 text-[11px] font-medium text-rose-700 transition hover:bg-rose-500/10 dark:text-rose-300"
                    >
                      Çıkış
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </section>

        <section className="rounded-xl border border-dashed border-border bg-background/30 p-3">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300">
              <KeyRound className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <h5 className="text-[13.5px] font-medium leading-tight">
                Parolayı değiştir
              </h5>
              <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Son değişim 4 ay önce
              </p>
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-1.5 text-[12px] font-medium text-background transition-opacity hover:opacity-90"
            >
              Değiştir
            </button>
          </div>
        </section>
      </div>
    </Dialog>
  )
}

function ToggleRow({
  icon: Icon,
  title,
  hint,
  checked,
  onChange,
}: {
  icon: typeof ShieldCheck
  title: string
  hint: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-foreground/[0.06] text-foreground/80">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <h5 className="text-[13.5px] font-medium leading-tight">{title}</h5>
        <p className="mt-0.5 text-[11.5px] text-muted-foreground">{hint}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-5 w-9 flex-none rounded-full transition-colors',
          checked ? 'bg-emerald-500' : 'bg-foreground/[0.12]',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-4 w-4 rounded-full bg-card shadow transition-transform',
            checked ? 'translate-x-4' : 'translate-x-0.5',
          )}
        />
      </button>
    </div>
  )
}
