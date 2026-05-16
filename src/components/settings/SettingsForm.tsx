/**
 * SettingsForm — /settings 4-section orchestrator (Wave F10.C).
 *
 * Sections (each a `SettingsSection`):
 *   1. Ekip bildirimleri — 6 admin type × 2 channel (email/push) toggle
 *      grid. Every flip autosaves debounced 500ms with a "Kaydedildi"
 *      toast.
 *   2. Entegrasyonlar — 4 entegrasyon kart (sahibinden / hepsiemlak /
 *      googleCalendar / slack). Toggle persists, "Test bağlantı" CTA
 *      mocks an alert, lastSync timestamp displayed when present.
 *   3. Güvenlik — 2FA status (link to /profile), sessionTimeout dropdown,
 *      3 mock active sessions, "Şifre değiştir" modal (old/new/confirm).
 *   4. Hesap — companyName/taxId/address inputs, theme select, dateFormat
 *      radio, "Veri indir (KVKK m.11)" JSON download, "Hesabımı sil"
 *      2-step confirm modal.
 *
 * Data layer: `@/lib/admin-settings` (localStorage `arsam.admin-settings.v1`).
 * Toast layer: `@/lib/use-toast` (admin global toaster).
 */
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import {
  ArrowRight,
  Building2,
  Calendar,
  CheckCircle2,
  Download,
  Globe,
  Hash,
  Laptop,
  MessageSquare,
  Plug,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Trash2,
} from '@landx/icons'
import { cn } from '@landx/ui'
import { Link } from 'react-router'
import { SettingsSection } from './SettingsSection'
import { useToast } from '@/lib/use-toast'
import {
  ADMIN_DATE_FORMATS,
  ADMIN_NOTIFICATION_CHANNELS,
  ADMIN_NOTIFICATION_TYPES,
  ADMIN_SESSION_TIMEOUTS,
  buildExportPayload,
  deleteAccount,
  getSettings,
  updateSettings,
  type AdminDateFormat,
  type AdminNotificationChannel,
  type AdminNotificationType,
  type AdminSessionTimeout,
  type AdminSettings,
  type AdminSettingsPatch,
  type AdminTheme,
} from '@/lib/admin-settings'

const NOTIF_LABELS: Record<AdminNotificationType, string> = {
  'yeni-musteri': 'Yeni müşteri',
  'yeni-ilan': 'Yeni ilan',
  'satis-asama': 'Satış aşama değişikliği',
  kontrat: 'Kontrat imzalandı',
  mesaj: 'Yeni mesaj',
  sistem: 'Sistem duyurusu',
}

const CHANNEL_LABELS: Record<AdminNotificationChannel, string> = {
  email: 'E-posta',
  push: 'Push',
}

const INTEGRATION_CARDS = [
  {
    key: 'sahibinden' as const,
    name: 'sahibinden.com',
    description: 'İlanları otomatik yayınla, mesajları çek.',
    icon: Globe,
  },
  {
    key: 'hepsiemlak' as const,
    name: 'hepsiemlak.com',
    description: 'Çift platform yayın, eşleştirilmiş istatistik.',
    icon: Globe,
  },
  {
    key: 'googleCalendar' as const,
    name: 'Google Calendar',
    description: 'Görüşme, prova ve hatırlatmaları senkronla.',
    icon: Calendar,
  },
  {
    key: 'slack' as const,
    name: 'Slack',
    description: 'Bildirim ve özetleri seçili kanala yolla.',
    icon: MessageSquare,
  },
]

const MOCK_SESSIONS = [
  {
    id: 's1',
    browser: 'Safari · macOS',
    ip: '78.182.144.21',
    lastActive: '2026-05-14T09:42:00Z',
    current: true,
  },
  {
    id: 's2',
    browser: 'Chrome · Windows',
    ip: '95.103.22.87',
    lastActive: '2026-05-13T17:08:00Z',
    current: false,
  },
  {
    id: 's3',
    browser: 'iOS App · iPhone',
    ip: '188.61.198.42',
    lastActive: '2026-05-12T22:11:00Z',
    current: false,
  },
]

const THEME_OPTIONS: { value: AdminTheme; label: string }[] = [
  { value: 'system', label: 'Sistem (otomatik)' },
  { value: 'light', label: 'Açık' },
  { value: 'dark', label: 'Koyu' },
]

function formatTimestamp(ts: number | undefined): string {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatSessionTime(iso: string): string {
  return new Date(iso).toLocaleString('tr-TR', {
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function todayFilenameStamp(): string {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function dateFormatSample(fmt: AdminDateFormat): string {
  // Use a fixed date so users see how the format actually renders.
  const d = new Date(2026, 4, 14) // 2026-05-14
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = String(d.getFullYear())
  if (fmt === 'dd.MM.yyyy') return `${dd}.${mm}.${yyyy}`
  if (fmt === 'MM/dd/yyyy') return `${mm}/${dd}/${yyyy}`
  return `${yyyy}-${mm}-${dd}`
}

export function SettingsForm() {
  const { toast } = useToast()
  const [settings, setSettings] = useState<AdminSettings>(() => getSettings())
  const [mounted, setMounted] = useState(false)

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Password modal
  const [pwOpen, setPwOpen] = useState(false)
  const [pwForm, setPwForm] = useState({ old: '', next: '', confirm: '' })
  const [pwError, setPwError] = useState('')

  // Delete account modal
  const [delOpen, setDelOpen] = useState(false)
  const [delAck, setDelAck] = useState(false)
  const [delTyped, setDelTyped] = useState('')

  useEffect(() => {
    setSettings(getSettings())
    setMounted(true)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [])

  function scheduleSave(patch: AdminSettingsPatch, toastMessage = 'Kaydedildi') {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      const next = updateSettings(patch)
      setSettings(next)
      toast(toastMessage, { variant: 'success', duration: 1500 })
    }, 500)
  }

  function applyAndSave(
    patcher: (current: AdminSettings) => AdminSettings,
    persistPatch: AdminSettingsPatch,
    toastMessage?: string,
  ) {
    setSettings((s) => patcher(s))
    scheduleSave(persistPatch, toastMessage)
  }

  function toggleNotification(type: AdminNotificationType, channel: AdminNotificationChannel) {
    setSettings((s) => {
      const nextVal = !s.teamNotifications[type][channel]
      scheduleSave({
        teamNotifications: { [type]: { [channel]: nextVal } },
      })
      return {
        ...s,
        teamNotifications: {
          ...s.teamNotifications,
          [type]: { ...s.teamNotifications[type], [channel]: nextVal },
        },
      }
    })
  }

  function toggleIntegration(key: 'sahibinden' | 'hepsiemlak' | 'googleCalendar' | 'slack') {
    setSettings((s) => {
      if (key === 'slack') {
        const next = !s.integrations.slack.enabled
        scheduleSave({ integrations: { slack: { enabled: next } } })
        return {
          ...s,
          integrations: {
            ...s.integrations,
            slack: { ...s.integrations.slack, enabled: next },
          },
        }
      }
      const current = s.integrations[key]
      const nextEnabled = !current.enabled
      const lastSync = nextEnabled ? Date.now() : current.lastSync
      scheduleSave({
        integrations: { [key]: { enabled: nextEnabled, lastSync } },
      })
      return {
        ...s,
        integrations: {
          ...s.integrations,
          [key]: { ...current, enabled: nextEnabled, lastSync },
        },
      }
    })
  }

  function testIntegration(name: string) {
    // Wave F10.C — mock only. Real wiring lands with backend integrations.
    if (typeof window !== 'undefined') {
      window.alert(`Mock — ${name} bağlantısı başarılı`)
    }
  }

  function changeSessionTimeout(t: AdminSessionTimeout) {
    applyAndSave(
      (s) => ({ ...s, security: { ...s.security, sessionTimeout: t } }),
      { security: { sessionTimeout: t } },
    )
  }

  function changeAccountField(field: 'companyName' | 'taxId' | 'address', value: string) {
    applyAndSave(
      (s) => ({ ...s, account: { ...s.account, [field]: value } }),
      { account: { [field]: value } },
    )
  }

  function changeTheme(theme: AdminTheme) {
    applyAndSave(
      (s) => ({ ...s, account: { ...s.account, theme } }),
      { account: { theme } },
    )
  }

  function changeDateFormat(fmt: AdminDateFormat) {
    applyAndSave(
      (s) => ({ ...s, account: { ...s.account, dateFormat: fmt } }),
      { account: { dateFormat: fmt } },
    )
  }

  function submitPassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPwError('')
    if (pwForm.next.length < 8) {
      setPwError('Yeni şifre en az 8 karakter olmalı.')
      return
    }
    if (pwForm.next !== pwForm.confirm) {
      setPwError('Şifre tekrarı uyuşmuyor.')
      return
    }
    // Mock — no actual storage of the password.
    setPwOpen(false)
    setPwForm({ old: '', next: '', confirm: '' })
    toast('Şifre güncellendi', { variant: 'success' })
  }

  function exportData() {
    if (typeof window === 'undefined') return
    try {
      const json = buildExportPayload()
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `arsam-admin-veri-${todayFilenameStamp()}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 0)
      toast('Verilerin indiriliyor', { variant: 'success' })
    } catch {
      /* ignore */
    }
  }

  function confirmDelete() {
    if (!delAck) return
    if (delTyped.trim() !== 'SİL') return
    deleteAccount()
    setDelOpen(false)
    toast('Hesap verileri silindi', { variant: 'success' })
    if (typeof window !== 'undefined') {
      // Reset in-memory copy and redirect to login.
      setSettings(getSettings())
      window.location.href = '/'
    }
  }

  const notifRows = useMemo(
    () => ADMIN_NOTIFICATION_TYPES.map((t) => ({ type: t, label: NOTIF_LABELS[t] })),
    [],
  )

  return (
    <div
      data-settings-form=""
      data-mounted={mounted ? 'true' : 'false'}
      className="flex flex-col gap-4 md:gap-5"
    >
      {/* 1. Ekip bildirimleri */}
      <SettingsSection
        id="team-notifications"
        title="Ekip bildirimleri"
        description="Hangi olaylar için hangi kanaldan bildirim gelsin?"
        defaultOpen
      >
        <div role="table" aria-label="Ekip bildirimleri" className="overflow-x-auto">
          <div className="min-w-[480px]">
            <div className="grid grid-cols-[1fr_repeat(2,96px)] items-center gap-2 pb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              <span />
              <span className="text-center">{CHANNEL_LABELS.email}</span>
              <span className="text-center">{CHANNEL_LABELS.push}</span>
            </div>
            <div className="flex flex-col divide-y divide-border">
              {notifRows.map((row) => (
                <div
                  key={row.type}
                  className="grid grid-cols-[1fr_repeat(2,96px)] items-center gap-2 py-3"
                  data-settings-notif-row={row.type}
                >
                  <span className="text-sm font-medium text-foreground">{row.label}</span>
                  {ADMIN_NOTIFICATION_CHANNELS.map((ch) => {
                    const checked = settings.teamNotifications[row.type][ch]
                    return (
                      <label key={ch} className="flex items-center justify-center">
                        <span className="sr-only">
                          {row.label} · {CHANNEL_LABELS[ch]}
                        </span>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleNotification(row.type, ch)}
                          data-settings-notif={`${row.type}.${ch}`}
                          className="h-4 w-4 rounded border-border accent-foreground"
                        />
                      </label>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </SettingsSection>

      {/* 2. Entegrasyonlar */}
      <SettingsSection
        id="integrations"
        title="Entegrasyonlar"
        description="3. parti hizmetlerle veri akışını yönet."
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {INTEGRATION_CARDS.map((card) => {
            const entry = settings.integrations[card.key]
            const lastSync =
              card.key === 'slack' ? undefined : (entry as { lastSync?: number }).lastSync
            const Icon = card.icon
            return (
              <article
                key={card.key}
                data-settings-integration={card.key}
                data-integration-enabled={entry.enabled ? 'true' : 'false'}
                className={cn(
                  'flex flex-col gap-3 rounded-xl border p-4 transition',
                  entry.enabled
                    ? 'border-foreground/20 bg-foreground/[0.03]'
                    : 'border-border bg-background/40',
                )}
              >
                <header className="flex items-start gap-3">
                  <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-foreground/[0.06] text-foreground/80">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold leading-tight">{card.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{card.description}</p>
                  </div>
                  <label className="inline-flex items-center gap-2">
                    <span className="sr-only">{card.name} entegrasyonu</span>
                    <input
                      type="checkbox"
                      checked={entry.enabled}
                      onChange={() => toggleIntegration(card.key)}
                      data-settings-integration-toggle={card.key}
                      className="h-4 w-4 rounded border-border accent-foreground"
                    />
                  </label>
                </header>
                <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-3">
                  <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                    Son senkron: {formatTimestamp(lastSync)}
                  </span>
                  <button
                    type="button"
                    onClick={() => testIntegration(card.name)}
                    data-settings-integration-test={card.key}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1 font-mono text-[10px] uppercase tracking-wide text-foreground transition hover:bg-foreground/5"
                  >
                    <Plug className="h-3 w-3" />
                    Test bağlantı
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      </SettingsSection>

      {/* 3. Güvenlik */}
      <SettingsSection
        id="security"
        title="Güvenlik"
        description="İki adımlı doğrulama, oturum süresi, aktif cihazlar."
      >
        <div className="flex flex-col gap-5">
          {/* 2FA status row */}
          <div
            data-settings-2fa-status={settings.security.twoFactorEnabled ? 'on' : 'off'}
            className="flex items-start justify-between gap-3 rounded-xl border border-border bg-background/40 px-4 py-3"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-tight">İki adımlı doğrulama (2FA)</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Hesabını çoklu cihaz doğrulaması ile koru.
              </p>
            </div>
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider',
                settings.security.twoFactorEnabled
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                  : 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
              )}
            >
              {settings.security.twoFactorEnabled ? (
                <ShieldCheck className="h-3 w-3" />
              ) : (
                <ShieldAlert className="h-3 w-3" />
              )}
              {settings.security.twoFactorEnabled ? 'Aktif' : 'Kapalı'}
            </span>
            <Link
              to="/profile"
              data-settings-2fa-link=""
              className="inline-flex flex-none items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 font-mono text-[10px] uppercase tracking-wide text-foreground transition hover:bg-foreground/5"
            >
              Profile geç
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {/* Session timeout */}
          <label className="flex flex-col gap-1">
            <span className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
              Oturum zaman aşımı
            </span>
            <select
              value={settings.security.sessionTimeout}
              onChange={(e) =>
                changeSessionTimeout(Number(e.target.value) as AdminSessionTimeout)
              }
              data-settings-session-timeout=""
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-foreground focus:outline-none"
            >
              {ADMIN_SESSION_TIMEOUTS.map((t) => (
                <option key={t} value={t}>
                  {t} dakika
                </option>
              ))}
            </select>
          </label>

          {/* Active sessions (mock) */}
          <div>
            <p className="pb-2 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
              Aktif oturumlar
            </p>
            <ul className="flex flex-col divide-y divide-border rounded-xl border border-border bg-background/40">
              {MOCK_SESSIONS.map((s) => {
                const Icon =
                  s.browser.includes('iPhone') || s.browser.includes('Android')
                    ? Smartphone
                    : Laptop
                return (
                  <li
                    key={s.id}
                    data-settings-session={s.id}
                    className="flex items-center gap-3 px-3 py-2.5"
                  >
                    <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-foreground/[0.06] text-foreground/80">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {s.browser}
                        {s.current ? (
                          <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-foreground/[0.08] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-foreground/70">
                            <CheckCircle2 className="h-2.5 w-2.5" />
                            Bu cihaz
                          </span>
                        ) : null}
                      </p>
                      <p className="font-mono text-[10px] text-muted-foreground">
                        {s.ip} · {formatSessionTime(s.lastActive)}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>

          {/* Change password */}
          <button
            type="button"
            onClick={() => {
              setPwError('')
              setPwForm({ old: '', next: '', confirm: '' })
              setPwOpen(true)
            }}
            data-settings-change-password=""
            className="self-start rounded-xl border border-border bg-background px-4 py-2 text-sm font-medium transition hover:bg-foreground/5"
          >
            Şifre değiştir
          </button>
        </div>
      </SettingsSection>

      {/* 4. Hesap */}
      <SettingsSection
        id="account"
        title="Hesap"
        description="Şirket bilgileri, tema, tarih formatı ve KVKK işlemleri."
      >
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
                <Building2 className="mr-1 inline h-3 w-3" /> Şirket adı
              </span>
              <input
                type="text"
                value={settings.account.companyName}
                onChange={(e) => changeAccountField('companyName', e.target.value)}
                data-settings-company-name=""
                className="rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-foreground focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
                <Hash className="mr-1 inline h-3 w-3" /> Vergi No
              </span>
              <input
                type="text"
                value={settings.account.taxId}
                onChange={(e) => changeAccountField('taxId', e.target.value)}
                data-settings-tax-id=""
                className="rounded-xl border border-border bg-background px-3 py-2 font-mono text-sm focus:border-foreground focus:outline-none"
              />
            </label>
          </div>
          <label className="flex flex-col gap-1">
            <span className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
              Adres
            </span>
            <textarea
              value={settings.account.address}
              onChange={(e) => changeAccountField('address', e.target.value)}
              data-settings-address=""
              rows={2}
              className="resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-foreground focus:outline-none"
            />
          </label>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
                Tema
              </span>
              <select
                value={settings.account.theme}
                onChange={(e) => changeTheme(e.target.value as AdminTheme)}
                data-settings-theme=""
                className="rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-foreground focus:outline-none"
              >
                {THEME_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            <fieldset>
              <legend className="pb-1 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
                Tarih formatı
              </legend>
              <div className="flex flex-col gap-1.5">
                {ADMIN_DATE_FORMATS.map((fmt) => {
                  const active = settings.account.dateFormat === fmt
                  return (
                    <label
                      key={fmt}
                      className={cn(
                        'flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-1.5 text-sm transition',
                        active
                          ? 'border-foreground/20 bg-foreground/5'
                          : 'border-border bg-background hover:bg-foreground/5',
                      )}
                    >
                      <input
                        type="radio"
                        name="admin-date-format"
                        value={fmt}
                        checked={active}
                        onChange={() => changeDateFormat(fmt)}
                        data-settings-dateformat={fmt}
                        className="h-4 w-4 accent-foreground"
                      />
                      <span className="font-medium">{fmt}</span>
                      <span className="ml-auto font-mono text-xs text-muted-foreground">
                        {dateFormatSample(fmt)}
                      </span>
                    </label>
                  )
                })}
              </div>
            </fieldset>
          </div>

          <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              onClick={exportData}
              data-settings-export=""
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-medium transition hover:bg-foreground/5"
            >
              <Download className="h-3.5 w-3.5" />
              Veri indir (KVKK m.11)
            </button>
            <button
              type="button"
              onClick={() => {
                setDelAck(false)
                setDelTyped('')
                setDelOpen(true)
              }}
              data-settings-delete=""
              className="inline-flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-500/15 dark:border-rose-400/40 dark:bg-rose-400/10 dark:text-rose-300"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Hesabımı sil
            </button>
          </div>
        </div>
      </SettingsSection>

      {/* Password modal */}
      {pwOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-settings-password-title"
          data-settings-password-dialog=""
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div
            className="absolute inset-0 bg-foreground/40"
            onClick={() => setPwOpen(false)}
            aria-hidden="true"
          />
          <form
            onSubmit={submitPassword}
            className="relative w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-xl"
          >
            <h3
              id="admin-settings-password-title"
              className="font-serif text-xl tracking-tight"
            >
              Şifre değiştir
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Yeni şifre en az 8 karakter olmalı.
            </p>
            <div className="mt-4 flex flex-col gap-3">
              <label className="flex flex-col gap-1">
                <span className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
                  Mevcut şifre
                </span>
                <input
                  type="password"
                  value={pwForm.old}
                  onChange={(e) => setPwForm((p) => ({ ...p, old: e.target.value }))}
                  autoComplete="current-password"
                  className="rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-foreground focus:outline-none"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
                  Yeni şifre
                </span>
                <input
                  type="password"
                  value={pwForm.next}
                  onChange={(e) => setPwForm((p) => ({ ...p, next: e.target.value }))}
                  autoComplete="new-password"
                  data-settings-password-new=""
                  className="rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-foreground focus:outline-none"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
                  Yeni şifre (tekrar)
                </span>
                <input
                  type="password"
                  value={pwForm.confirm}
                  onChange={(e) => setPwForm((p) => ({ ...p, confirm: e.target.value }))}
                  autoComplete="new-password"
                  data-settings-password-confirm=""
                  className="rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-foreground focus:outline-none"
                />
              </label>
              {pwError ? (
                <p
                  data-settings-password-error=""
                  className="font-mono text-[10px] uppercase tracking-wide text-rose-600 dark:text-rose-400"
                >
                  {pwError}
                </p>
              ) : null}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPwOpen(false)}
                className="rounded-xl border border-border bg-background px-4 py-2 text-sm font-medium transition hover:bg-foreground/5"
              >
                Vazgeç
              </button>
              <button
                type="submit"
                data-settings-password-submit=""
                className="rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
              >
                Güncelle
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {/* Delete account modal (2-step) */}
      {delOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-settings-delete-title"
          data-settings-delete-dialog=""
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div
            className="absolute inset-0 bg-foreground/40"
            onClick={() => setDelOpen(false)}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-md rounded-2xl border border-rose-500/30 bg-background p-6 shadow-xl">
            <h3
              id="admin-settings-delete-title"
              className="font-serif text-xl tracking-tight"
            >
              Hesabını silmek istediğine emin misin?
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Bu işlem geri alınamaz. Onayladığında tüm yönetici ayarları,
              kayıtlı görünümler ve oturum bilgilerin bu tarayıcıdan silinir.
            </p>
            <label className="mt-4 flex items-start gap-3 rounded-xl border border-border bg-foreground/[0.02] px-3 py-2.5">
              <input
                type="checkbox"
                checked={delAck}
                onChange={(e) => setDelAck(e.target.checked)}
                data-settings-delete-ack=""
                className="mt-0.5 h-4 w-4 rounded border-border accent-foreground"
              />
              <span className="text-sm font-medium">
                Bunun geri alınamaz olduğunu anladım.
              </span>
            </label>
            <label className="mt-3 flex flex-col gap-1">
              <span className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
                Onaylamak için aşağıya “SİL” yaz:
              </span>
              <input
                type="text"
                value={delTyped}
                onChange={(e) => setDelTyped(e.target.value)}
                data-settings-delete-input=""
                placeholder="SİL"
                autoComplete="off"
                className="rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-rose-500 focus:outline-none"
              />
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDelOpen(false)}
                className="rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={!delAck || delTyped.trim() !== 'SİL'}
                data-settings-delete-confirm=""
                className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-700 transition enabled:hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-400/40 dark:bg-rose-400/10 dark:text-rose-300"
              >
                Hesabımı kalıcı olarak sil
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default SettingsForm
