import { useState } from 'react'
import { Bell, Mail, Moon, Smartphone } from '@landx/icons'
import { Dialog, cn } from '@landx/ui'

interface NotificationsSheetProps {
  open: boolean
  onClose: () => void
}

interface NotifPref {
  key: string
  title: string
  hint: string
  channels: { push: boolean; email: boolean }
}

const INITIAL_PREFS: NotifPref[] = [
  {
    key: 'new-customer',
    title: 'Yeni müşteri',
    hint: 'Sahibinden / Hürriyet üzerinden gelen ilk talep.',
    channels: { push: true, email: true },
  },
  {
    key: 'payment',
    title: 'Tahsilat geldi',
    hint: 'Banka entegrasyonundan eşleşen havale.',
    channels: { push: true, email: false },
  },
  {
    key: 'listing-view',
    title: 'İlan görüntülendi',
    hint: 'Belirli ilanlara öne çıkan görüntülenme.',
    channels: { push: false, email: false },
  },
  {
    key: 'weekly-summary',
    title: 'Haftalık özet email',
    hint: 'Pazartesi sabah portföy raporu.',
    channels: { push: false, email: true },
  },
]

export function NotificationsSheet({ open, onClose }: NotificationsSheetProps) {
  const [prefs, setPrefs] = useState<NotifPref[]>(INITIAL_PREFS)
  const [muteStart, setMuteStart] = useState('22:00')
  const [muteEnd, setMuteEnd] = useState('08:00')

  const toggle = (idx: number, channel: 'push' | 'email') => {
    setPrefs((prev) =>
      prev.map((p, i) =>
        i === idx
          ? { ...p, channels: { ...p.channels, [channel]: !p.channels[channel] } }
          : p,
      ),
    )
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title={
        <span className="flex flex-col gap-0.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            MOD · BİLDİRİMLER
          </span>
          <span className="font-serif text-lg font-light tracking-tight">
            Bildirim <em className="font-serif italic font-light">tercihleri</em>
          </span>
        </span>
      }
      description="Hangi olayı hangi kanaldan alacağını seç"
    >
      <div className="space-y-5">
        <section>
          <div className="mb-2 flex items-baseline justify-between">
            <h4 className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Olay başına kanal
            </h4>
            <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Smartphone className="h-3 w-3" /> Push
              </span>
              <span className="inline-flex items-center gap-1">
                <Mail className="h-3 w-3" /> Email
              </span>
            </div>
          </div>
          <ul className="space-y-2">
            {prefs.map((p, idx) => (
              <li
                key={p.key}
                className="flex items-center gap-3 rounded-xl border border-border bg-background/40 p-3"
              >
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-foreground/[0.06] text-foreground/80">
                  <Bell className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <h5 className="text-[13.5px] font-medium leading-tight">
                    {p.title}
                  </h5>
                  <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                    {p.hint}
                  </p>
                </div>
                <div className="flex flex-none items-center gap-2">
                  <Toggle
                    checked={p.channels.push}
                    onChange={() => toggle(idx, 'push')}
                    aria-label={`${p.title} push bildirim`}
                  />
                  <Toggle
                    checked={p.channels.email}
                    onChange={() => toggle(idx, 'email')}
                    aria-label={`${p.title} email bildirim`}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-border bg-background/40 p-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-foreground/[0.06] text-foreground/80">
              <Moon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <h5 className="text-[13.5px] font-medium leading-tight">
                Sessize alma saatleri
              </h5>
              <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                Bu aralıkta push bildirim gönderilmez.
              </p>
            </div>
            <div className="flex flex-none items-center gap-1.5">
              <input
                type="time"
                value={muteStart}
                onChange={(e) => setMuteStart(e.target.value)}
                className="rounded-lg border border-border bg-background/60 px-2 py-1 font-mono text-[12px] tabular-nums outline-none transition focus:border-foreground/30"
              />
              <span className="font-mono text-[11px] text-muted-foreground">—</span>
              <input
                type="time"
                value={muteEnd}
                onChange={(e) => setMuteEnd(e.target.value)}
                className="rounded-lg border border-border bg-background/60 px-2 py-1 font-mono text-[12px] tabular-nums outline-none transition focus:border-foreground/30"
              />
            </div>
          </div>
        </section>
      </div>
    </Dialog>
  )
}

function Toggle({
  checked,
  onChange,
  ...rest
}: {
  checked: boolean
  onChange: () => void
  'aria-label'?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      {...rest}
      className={cn(
        'relative h-5 w-9 rounded-full transition-colors',
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
  )
}
