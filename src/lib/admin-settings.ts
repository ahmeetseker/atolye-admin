/**
 * F10.C — /settings localStorage adapter.
 *
 * Persists a single `arsam.admin-settings.v1` record holding four sub-objects:
 *   - teamNotifications: 6 admin notification types × 2 channels (email, push)
 *   - integrations:      4 entegrasyon kart (sahibinden / hepsiemlak /
 *                        googleCalendar / slack)
 *   - security:          twoFactorEnabled + sessionTimeout (30/60/120/240 min)
 *   - account:           companyName / taxId / address / theme / locale /
 *                        dateFormat
 *
 * `updateSettings(partial)` deep-merges nested objects so toggling a single
 * `teamNotifications.yeni-musteri.email` switch does NOT erase the rest of
 * the matrix. Mirrors the F7.C public `lib/settings.ts` shape but uses an
 * admin-scoped key and a separate schema.
 *
 * Companion helpers:
 *   - `buildExportPayload()` collects every `arsam.admin-*.v1` localStorage
 *     entry into a JSON-stringified payload (KVKK m.11 — "verilerinin bir
 *     kopyasını alma hakkı"). Caller wires this to a Blob + anchor.
 *   - `deleteAccount()` removes every `arsam.admin-*.v1` key. Non-admin keys
 *     (theme, public-site favorites, etc.) are left alone.
 *
 * SSR-safe — every accessor guards on `typeof window`.
 */

export type AdminNotificationType =
  | 'yeni-musteri'
  | 'yeni-ilan'
  | 'satis-asama'
  | 'kontrat'
  | 'mesaj'
  | 'sistem'

export type AdminNotificationChannel = 'email' | 'push'

export type AdminChannelMap = Record<AdminNotificationChannel, boolean>

export type AdminTeamNotifications = Record<
  AdminNotificationType,
  AdminChannelMap
>

export interface AdminIntegrationEntry {
  enabled: boolean
  lastSync?: number
}

export interface AdminSlackIntegration {
  enabled: boolean
  webhookUrl?: string
}

export interface AdminIntegrations {
  sahibinden: AdminIntegrationEntry
  hepsiemlak: AdminIntegrationEntry
  googleCalendar: AdminIntegrationEntry
  slack: AdminSlackIntegration
}

export type AdminSessionTimeout = 30 | 60 | 120 | 240

export interface AdminSecurity {
  twoFactorEnabled: boolean
  sessionTimeout: AdminSessionTimeout
}

export type AdminTheme = 'light' | 'dark' | 'system'
export type AdminLocale = 'tr'
export type AdminDateFormat = 'dd.MM.yyyy' | 'MM/dd/yyyy' | 'yyyy-MM-dd'

export interface AdminAccount {
  companyName: string
  taxId: string
  address: string
  theme: AdminTheme
  locale: AdminLocale
  dateFormat: AdminDateFormat
}

export interface AdminSettings {
  teamNotifications: AdminTeamNotifications
  integrations: AdminIntegrations
  security: AdminSecurity
  account: AdminAccount
}

export const ADMIN_SETTINGS_KEY = 'arsam.admin-settings.v1'

/** Match any `arsam.admin-*.v\d+` localStorage key (export + delete scope). */
const ADMIN_KEY_RE = /^arsam\.admin-.+\.v\d+$/

export const ADMIN_NOTIFICATION_TYPES: AdminNotificationType[] = [
  'yeni-musteri',
  'yeni-ilan',
  'satis-asama',
  'kontrat',
  'mesaj',
  'sistem',
]

export const ADMIN_NOTIFICATION_CHANNELS: AdminNotificationChannel[] = [
  'email',
  'push',
]

export const ADMIN_SESSION_TIMEOUTS: AdminSessionTimeout[] = [30, 60, 120, 240]

export const ADMIN_DATE_FORMATS: AdminDateFormat[] = [
  'dd.MM.yyyy',
  'MM/dd/yyyy',
  'yyyy-MM-dd',
]

export const DEFAULT_ADMIN_SETTINGS: AdminSettings = Object.freeze({
  teamNotifications: {
    'yeni-musteri': { email: true, push: true },
    'yeni-ilan': { email: true, push: true },
    'satis-asama': { email: true, push: true },
    kontrat: { email: true, push: true },
    mesaj: { email: true, push: true },
    sistem: { email: true, push: true },
  },
  integrations: {
    sahibinden: { enabled: false },
    hepsiemlak: { enabled: false },
    googleCalendar: { enabled: false },
    slack: { enabled: false },
  },
  security: {
    twoFactorEnabled: false,
    sessionTimeout: 60,
  },
  account: {
    companyName: 'Atölye Emlak & Danışmanlık',
    taxId: '1234567890',
    address: 'Cunda Mah. Sahil Cd. No:42, Ayvalık / Balıkesir',
    theme: 'system',
    locale: 'tr',
    dateFormat: 'dd.MM.yyyy',
  },
}) as AdminSettings

function cloneDefaults(): AdminSettings {
  return {
    teamNotifications: {
      'yeni-musteri': { ...DEFAULT_ADMIN_SETTINGS.teamNotifications['yeni-musteri'] },
      'yeni-ilan': { ...DEFAULT_ADMIN_SETTINGS.teamNotifications['yeni-ilan'] },
      'satis-asama': { ...DEFAULT_ADMIN_SETTINGS.teamNotifications['satis-asama'] },
      kontrat: { ...DEFAULT_ADMIN_SETTINGS.teamNotifications.kontrat },
      mesaj: { ...DEFAULT_ADMIN_SETTINGS.teamNotifications.mesaj },
      sistem: { ...DEFAULT_ADMIN_SETTINGS.teamNotifications.sistem },
    },
    integrations: {
      sahibinden: { ...DEFAULT_ADMIN_SETTINGS.integrations.sahibinden },
      hepsiemlak: { ...DEFAULT_ADMIN_SETTINGS.integrations.hepsiemlak },
      googleCalendar: { ...DEFAULT_ADMIN_SETTINGS.integrations.googleCalendar },
      slack: { ...DEFAULT_ADMIN_SETTINGS.integrations.slack },
    },
    security: { ...DEFAULT_ADMIN_SETTINGS.security },
    account: { ...DEFAULT_ADMIN_SETTINGS.account },
  }
}

function isObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v)
}

function safeStorage(): Storage | undefined {
  try {
    if (typeof window === 'undefined') return undefined
    return window.localStorage
  } catch {
    return undefined
  }
}

function sanitize(raw: unknown): AdminSettings {
  const base = cloneDefaults()
  if (!isObject(raw)) return base

  if (isObject(raw.teamNotifications)) {
    for (const type of ADMIN_NOTIFICATION_TYPES) {
      const entry = raw.teamNotifications[type]
      if (isObject(entry)) {
        if (typeof entry.email === 'boolean') {
          base.teamNotifications[type].email = entry.email
        }
        if (typeof entry.push === 'boolean') {
          base.teamNotifications[type].push = entry.push
        }
      }
    }
  }

  if (isObject(raw.integrations)) {
    for (const key of ['sahibinden', 'hepsiemlak', 'googleCalendar'] as const) {
      const entry = raw.integrations[key]
      if (isObject(entry)) {
        if (typeof entry.enabled === 'boolean') base.integrations[key].enabled = entry.enabled
        if (typeof entry.lastSync === 'number') base.integrations[key].lastSync = entry.lastSync
      }
    }
    const slack = raw.integrations.slack
    if (isObject(slack)) {
      if (typeof slack.enabled === 'boolean') base.integrations.slack.enabled = slack.enabled
      if (typeof slack.webhookUrl === 'string') base.integrations.slack.webhookUrl = slack.webhookUrl
    }
  }

  if (isObject(raw.security)) {
    if (typeof raw.security.twoFactorEnabled === 'boolean') {
      base.security.twoFactorEnabled = raw.security.twoFactorEnabled
    }
    const t = raw.security.sessionTimeout
    if (t === 30 || t === 60 || t === 120 || t === 240) {
      base.security.sessionTimeout = t
    }
  }

  if (isObject(raw.account)) {
    if (typeof raw.account.companyName === 'string') base.account.companyName = raw.account.companyName
    if (typeof raw.account.taxId === 'string') base.account.taxId = raw.account.taxId
    if (typeof raw.account.address === 'string') base.account.address = raw.account.address
    if (raw.account.theme === 'light' || raw.account.theme === 'dark' || raw.account.theme === 'system') {
      base.account.theme = raw.account.theme
    }
    // locale stays 'tr' — EN out of scope per spec
    if (
      raw.account.dateFormat === 'dd.MM.yyyy' ||
      raw.account.dateFormat === 'MM/dd/yyyy' ||
      raw.account.dateFormat === 'yyyy-MM-dd'
    ) {
      base.account.dateFormat = raw.account.dateFormat
    }
  }

  return base
}

export function getSettings(): AdminSettings {
  const storage = safeStorage()
  if (!storage) return cloneDefaults()
  try {
    const raw = storage.getItem(ADMIN_SETTINGS_KEY)
    if (!raw) return cloneDefaults()
    return sanitize(JSON.parse(raw))
  } catch {
    return cloneDefaults()
  }
}

/** Deep-mergeable partial. Each subtree can be a Partial. */
export interface AdminSettingsPatch {
  teamNotifications?: {
    [K in AdminNotificationType]?: Partial<AdminChannelMap>
  }
  integrations?: {
    sahibinden?: Partial<AdminIntegrationEntry>
    hepsiemlak?: Partial<AdminIntegrationEntry>
    googleCalendar?: Partial<AdminIntegrationEntry>
    slack?: Partial<AdminSlackIntegration>
  }
  security?: Partial<AdminSecurity>
  account?: Partial<AdminAccount>
}

export function updateSettings(patch: AdminSettingsPatch): AdminSettings {
  const current = getSettings()
  const next: AdminSettings = {
    teamNotifications: {
      'yeni-musteri': { ...current.teamNotifications['yeni-musteri'] },
      'yeni-ilan': { ...current.teamNotifications['yeni-ilan'] },
      'satis-asama': { ...current.teamNotifications['satis-asama'] },
      kontrat: { ...current.teamNotifications.kontrat },
      mesaj: { ...current.teamNotifications.mesaj },
      sistem: { ...current.teamNotifications.sistem },
    },
    integrations: {
      sahibinden: { ...current.integrations.sahibinden },
      hepsiemlak: { ...current.integrations.hepsiemlak },
      googleCalendar: { ...current.integrations.googleCalendar },
      slack: { ...current.integrations.slack },
    },
    security: { ...current.security },
    account: { ...current.account },
  }

  if (patch.teamNotifications) {
    for (const type of ADMIN_NOTIFICATION_TYPES) {
      const part = patch.teamNotifications[type]
      if (part) {
        next.teamNotifications[type] = {
          ...next.teamNotifications[type],
          ...part,
        }
      }
    }
  }

  if (patch.integrations) {
    for (const key of ['sahibinden', 'hepsiemlak', 'googleCalendar'] as const) {
      const part = patch.integrations[key]
      if (part) {
        next.integrations[key] = { ...next.integrations[key], ...part }
      }
    }
    if (patch.integrations.slack) {
      next.integrations.slack = {
        ...next.integrations.slack,
        ...patch.integrations.slack,
      }
    }
  }

  if (patch.security) {
    next.security = { ...next.security, ...patch.security }
  }

  if (patch.account) {
    next.account = { ...next.account, ...patch.account }
  }

  const storage = safeStorage()
  if (storage) {
    try {
      storage.setItem(ADMIN_SETTINGS_KEY, JSON.stringify(next))
    } catch {
      /* quota / private mode — in-memory copy still returned */
    }
  }
  return next
}

/**
 * Collect every `arsam.admin-*.v1` localStorage entry into a JSON-stringified
 * payload (pretty-printed). Values are JSON-parsed when possible; fall back
 * to the raw string otherwise. Satisfies KVKK m.11.
 */
export function buildExportPayload(): string {
  const out: Record<string, unknown> = {
    exportedAt: new Date().toISOString(),
  }
  const storage = safeStorage()
  if (!storage) return JSON.stringify(out, null, 2)

  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i)
    if (!key || !ADMIN_KEY_RE.test(key)) continue
    const raw = storage.getItem(key)
    if (raw == null) continue
    try {
      out[key] = JSON.parse(raw)
    } catch {
      out[key] = raw
    }
  }
  return JSON.stringify(out, null, 2)
}

/**
 * Remove every `arsam.admin-*.v1` key. Non-admin and non-arsam keys are
 * left intact — `localStorage.clear()` would be too aggressive.
 */
export function deleteAccount(): void {
  const storage = safeStorage()
  if (!storage) return
  const toRemove: string[] = []
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i)
    if (key && ADMIN_KEY_RE.test(key)) toRemove.push(key)
  }
  for (const k of toRemove) {
    try {
      storage.removeItem(k)
    } catch {
      /* ignore */
    }
  }
}
