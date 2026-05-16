import { ArrowRight, Sun, Moon, Monitor } from '@landx/icons'
import { PageShell, cn } from '@landx/ui'
import { useTheme, type Theme } from '@landx/ui/theme'
import { Link } from 'react-router'
import { SettingsForm } from '@/components/settings/SettingsForm'

const APPEARANCE_OPTIONS: ReadonlyArray<{ value: Theme; label: string; Icon: React.ComponentType<{ className?: string }> }> = [
  { value: 'light', label: 'Aydınlık', Icon: Sun },
  { value: 'dark', label: 'Karanlık', Icon: Moon },
  { value: 'system', label: 'Sistem', Icon: Monitor },
]

function AppearanceCard() {
  const { theme, setTheme } = useTheme()
  return (
    <section
      data-settings-appearance=""
      className="mb-5 rounded-2xl border border-border bg-card p-5"
    >
      <header className="mb-3 flex items-baseline gap-2">
        <h3 className="font-serif text-base font-light tracking-tight">Görünüm</h3>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">tema</span>
      </header>
      <p className="mb-4 text-[12.5px] leading-relaxed text-muted-foreground">
        Arayüzün tema modunu seç. Tercih bu tarayıcıya kaydedilir.
      </p>
      <div role="radiogroup" aria-label="Tema seçimi" className="flex flex-wrap gap-2">
        {APPEARANCE_OPTIONS.map(({ value, label, Icon }) => {
          const active = theme === value
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setTheme(value)}
              data-settings-appearance-option={value}
              className={cn(
                'inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-[13px] font-medium transition',
                active
                  ? 'border-foreground/30 bg-foreground text-background'
                  : 'border-border bg-background text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          )
        })}
      </div>
    </section>
  )
}

/**
 * /settings — Wave F10.C.
 *
 * 4 collapsible section (team notifications · integrations · security ·
 * account) mounted inside the standard PageShell. Backed by
 * `arsam.admin-settings.v1` localStorage; autosave debounced 500ms.
 *
 * Personal items (profil, 2FA setup, API token) live on /profile.
 */
export function Settings() {
  return (
    <PageShell
      eyebrow="MOD · OFİS AYARLARI"
      title={
        <>
          Ofis <em className="font-serif italic font-light">ayarları</em>
        </>
      }
      description="Atölye'nin kurum bilgileri, ekip bildirimleri, entegrasyon kart'ları ve güvenlik tercihleri. Kişisel ayarlar (profil, 2FA, API token) profil sayfasında."
      actions={
        <Link
          to="/profile"
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium transition hover:bg-foreground/5 md:min-h-0 md:w-auto"
        >
          Kişisel profil
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      }
    >
      <AppearanceCard />
      <SettingsForm />
    </PageShell>
  )
}
