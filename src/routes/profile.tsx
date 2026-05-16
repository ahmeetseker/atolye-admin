import { useEffect, useState } from 'react'
import {
  ChevronDown,
  KeyRound,
  Mail,
  Phone,
  ShieldCheck,
  User,
  Users,
} from '@landx/icons'
import { PageShell, cn } from '@landx/ui'
import { useToast } from '@/lib/use-toast'
import { TeamList } from '@/components/profile/TeamList'
import { TwoFactorSetup } from '@/components/profile/TwoFactorSetup'
import { ApiTokens } from '@/components/profile/ApiTokens'

const ACCOUNT_KEY = 'arsam.admin-profile-account.v1'

interface AccountInfo {
  name: string
  email: string
  phone: string
}

const DEFAULT_ACCOUNT: AccountInfo = {
  name: 'Burhan Kaynak',
  email: 'burhan@arsam.net',
  phone: '+90 535 000 00 00',
}

type SectionId = 'account' | 'team' | 'security' | 'tokens'

const SECTIONS: {
  id: SectionId
  label: string
  description: string
  icon: typeof User
}[] = [
  {
    id: 'account',
    label: 'Hesap bilgileri',
    description: 'İsim, e-posta, iletişim.',
    icon: User,
  },
  {
    id: 'team',
    label: 'Ekip',
    description: 'Üye davet et, rolleri yönet.',
    icon: Users,
  },
  {
    id: 'security',
    label: 'Güvenlik · 2FA',
    description: 'İki faktörlü doğrulama + yedek kodlar.',
    icon: ShieldCheck,
  },
  {
    id: 'tokens',
    label: 'API Tokenları',
    description: 'Entegrasyonlar için kişisel tokenlar.',
    icon: KeyRound,
  },
]

function readAccount(): AccountInfo {
  if (typeof window === 'undefined') return DEFAULT_ACCOUNT
  try {
    const raw = window.localStorage.getItem(ACCOUNT_KEY)
    if (!raw) return DEFAULT_ACCOUNT
    const parsed = JSON.parse(raw)
    if (
      parsed &&
      typeof parsed.name === 'string' &&
      typeof parsed.email === 'string' &&
      typeof parsed.phone === 'string'
    ) {
      return parsed as AccountInfo
    }
    return DEFAULT_ACCOUNT
  } catch {
    return DEFAULT_ACCOUNT
  }
}

function writeAccount(info: AccountInfo): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(ACCOUNT_KEY, JSON.stringify(info))
  } catch {
    /* quota / private mode — silently no-op. */
  }
}

export function Profile() {
  const [openSections, setOpenSections] = useState<Set<SectionId>>(
    new Set(['account', 'team']),
  )
  const toggle = (id: SectionId) =>
    setOpenSections((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <PageShell
      eyebrow="MOD · PROFİL"
      title={
        <>
          Atölye <em className="font-serif italic font-light">ayarları</em>
        </>
      }
      description="Hesap bilgileriniz, ekip yönetimi, 2FA ve API tokenları. Tümü tek panelde."
    >
      <nav
        aria-label="Profil bölümleri"
        className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4"
        data-testid="profile-section-nav"
      >
        {SECTIONS.map((s) => {
          const Icon = s.icon
          const open = openSections.has(s.id)
          return (
            <a
              key={s.id}
              href={`#section-${s.id}`}
              onClick={(e) => {
                e.preventDefault()
                if (!openSections.has(s.id)) toggle(s.id)
                document
                  .getElementById(`section-${s.id}`)
                  ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }}
              data-testid={`profile-nav-${s.id}`}
              className={cn(
                'group flex items-start gap-2 rounded-xl border bg-background/30 px-3 py-2.5 text-left transition hover:bg-foreground/[0.03]',
                open ? 'border-foreground/40' : 'border-border',
              )}
            >
              <span className="mt-0.5 inline-flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-foreground/[0.06]">
                <Icon className="h-3.5 w-3.5" />
              </span>
              <span className="min-w-0">
                <span className="block text-[12.5px] font-medium leading-tight">
                  {s.label}
                </span>
                <span className="mt-0.5 block font-mono text-[10px] text-muted-foreground">
                  {s.description}
                </span>
              </span>
            </a>
          )
        })}
      </nav>

      <div className="space-y-4 md:space-y-5">
        <Section
          id="section-account"
          open={openSections.has('account')}
          onToggle={() => toggle('account')}
          label="Hesap bilgileri"
          icon={User}
        >
          <AccountInfoForm />
        </Section>

        <Section
          id="section-team"
          open={openSections.has('team')}
          onToggle={() => toggle('team')}
          label="Ekip"
          icon={Users}
        >
          <TeamList />
        </Section>

        <Section
          id="section-security"
          open={openSections.has('security')}
          onToggle={() => toggle('security')}
          label="Güvenlik · 2FA"
          icon={ShieldCheck}
        >
          <TwoFactorSetup />
        </Section>

        <Section
          id="section-tokens"
          open={openSections.has('tokens')}
          onToggle={() => toggle('tokens')}
          label="API Tokenları"
          icon={KeyRound}
        >
          <ApiTokens />
        </Section>
      </div>
    </PageShell>
  )
}

function Section({
  id,
  open,
  onToggle,
  label,
  icon: Icon,
  children,
}: {
  id: string
  open: boolean
  onToggle: () => void
  label: string
  icon: typeof User
  children: React.ReactNode
}) {
  return (
    <section id={id} data-testid={id} className="scroll-mt-24">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        data-testid={`${id}-toggle`}
        className="mb-2 flex w-full items-center justify-between gap-3 rounded-xl px-1 py-1.5 text-left transition hover:bg-foreground/[0.02]"
      >
        <span className="inline-flex items-center gap-2">
          <span className="inline-flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-foreground/[0.06]">
            <Icon className="h-3.5 w-3.5" />
          </span>
          <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground">
            {label}
          </span>
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-muted-foreground transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>
      {open && <div data-testid={`${id}-body`}>{children}</div>}
    </section>
  )
}

function AccountInfoForm() {
  const [info, setInfo] = useState<AccountInfo>(DEFAULT_ACCOUNT)
  const [saved, setSaved] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    setInfo(readAccount())
  }, [])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    writeAccount(info)
    setSaved(true)
    toast('Hesap bilgileri kaydedildi', { variant: 'success' })
    window.setTimeout(() => setSaved(false), 1500)
  }

  const update = (patch: Partial<AccountInfo>) =>
    setInfo((prev) => ({ ...prev, ...patch }))

  return (
    <form
      onSubmit={submit}
      data-testid="profile-account-form"
      className="rounded-2xl border border-border bg-card p-4 md:p-5"
    >
      <header className="mb-4">
        <h3 className="font-serif text-lg font-medium tracking-tight">
          Hesap bilgileri
        </h3>
        <p className="text-[12.5px] text-muted-foreground">
          İletişim bilgileriniz panele giren ekip üyelerine görünür.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label
            htmlFor="account-name"
            className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
          >
            İsim Soyisim
          </label>
          <div className="mt-1 flex items-center gap-2 rounded-xl border border-border bg-background/40 px-3 focus-within:border-foreground/40">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              id="account-name"
              data-testid="account-name-input"
              type="text"
              value={info.name}
              onChange={(e) => update({ name: e.target.value })}
              className="min-h-11 flex-1 bg-transparent py-2 text-[13.5px] outline-none md:min-h-0"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="account-email"
            className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
          >
            E-posta
          </label>
          <div className="mt-1 flex items-center gap-2 rounded-xl border border-border bg-background/40 px-3 focus-within:border-foreground/40">
            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              id="account-email"
              data-testid="account-email-input"
              type="email"
              value={info.email}
              onChange={(e) => update({ email: e.target.value })}
              className="min-h-11 flex-1 bg-transparent py-2 text-[13.5px] outline-none md:min-h-0"
            />
          </div>
        </div>

        <div className="md:col-span-2">
          <label
            htmlFor="account-phone"
            className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
          >
            Telefon
          </label>
          <div className="mt-1 flex items-center gap-2 rounded-xl border border-border bg-background/40 px-3 focus-within:border-foreground/40">
            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              id="account-phone"
              data-testid="account-phone-input"
              type="tel"
              value={info.phone}
              onChange={(e) => update({ phone: e.target.value })}
              className="min-h-11 flex-1 bg-transparent py-2 text-[13.5px] outline-none md:min-h-0"
            />
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-end gap-2">
        {saved && (
          <span
            data-testid="account-saved-indicator"
            className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300"
          >
            Kaydedildi
          </span>
        )}
        <button
          type="submit"
          data-testid="account-save"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-foreground px-4 py-2 text-[13px] font-medium text-background transition hover:opacity-90 md:min-h-0"
        >
          Kaydet
        </button>
      </div>
    </form>
  )
}
