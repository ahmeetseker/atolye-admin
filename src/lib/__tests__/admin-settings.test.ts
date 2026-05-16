import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  ADMIN_SETTINGS_KEY,
  DEFAULT_ADMIN_SETTINGS,
  buildExportPayload,
  deleteAccount,
  getSettings,
  updateSettings,
} from '@/lib/admin-settings'

/** In-memory localStorage shim — jsdom 29's localStorage is non-functional here. */
function installMemoryStorage(): Storage {
  const map = new Map<string, string>()
  const storage: Storage = {
    get length() {
      return map.size
    },
    clear() {
      map.clear()
    },
    getItem(k) {
      return map.has(k) ? map.get(k)! : null
    },
    key(i) {
      return Array.from(map.keys())[i] ?? null
    },
    removeItem(k) {
      map.delete(k)
    },
    setItem(k, v) {
      map.set(k, String(v))
    },
  }
  Object.defineProperty(window, 'localStorage', {
    value: storage,
    configurable: true,
    writable: true,
  })
  return storage
}

let originalStorageDescriptor: PropertyDescriptor | undefined

beforeEach(() => {
  originalStorageDescriptor = Object.getOwnPropertyDescriptor(
    window,
    'localStorage',
  )
  installMemoryStorage()
})

afterEach(() => {
  if (originalStorageDescriptor) {
    Object.defineProperty(window, 'localStorage', originalStorageDescriptor)
  }
})

describe('admin-settings — getSettings', () => {
  it('returns defaults when nothing is persisted (all notifications on, integrations off)', () => {
    const s = getSettings()
    // Every team notification defaults ON for both channels.
    for (const type of ['yeni-musteri', 'yeni-ilan', 'satis-asama', 'kontrat', 'mesaj', 'sistem'] as const) {
      expect(s.teamNotifications[type].email).toBe(true)
      expect(s.teamNotifications[type].push).toBe(true)
    }
    expect(s.integrations.sahibinden.enabled).toBe(false)
    expect(s.integrations.hepsiemlak.enabled).toBe(false)
    expect(s.integrations.googleCalendar.enabled).toBe(false)
    expect(s.integrations.slack.enabled).toBe(false)
    expect(s.security.sessionTimeout).toBe(60)
    expect(s.security.twoFactorEnabled).toBe(false)
    expect(s.account.theme).toBe('system')
    expect(s.account.locale).toBe('tr')
    expect(s.account.dateFormat).toBe('dd.MM.yyyy')
  })

  it('survives a corrupt JSON blob — falls back to defaults', () => {
    window.localStorage.setItem(ADMIN_SETTINGS_KEY, '{not-json')
    const s = getSettings()
    expect(s.security.sessionTimeout).toBe(DEFAULT_ADMIN_SETTINGS.security.sessionTimeout)
    expect(s.teamNotifications['yeni-ilan'].email).toBe(true)
  })
})

describe('admin-settings — updateSettings', () => {
  it('persists a single team-notification toggle without erasing siblings', () => {
    updateSettings({ teamNotifications: { 'yeni-musteri': { email: false } } })

    const stored = JSON.parse(window.localStorage.getItem(ADMIN_SETTINGS_KEY) || '{}')
    expect(stored.teamNotifications['yeni-musteri'].email).toBe(false)
    // Sibling channel for the same row stays ON.
    expect(stored.teamNotifications['yeni-musteri'].push).toBe(true)
    // Sibling rows untouched.
    expect(stored.teamNotifications['yeni-ilan'].email).toBe(true)
    expect(stored.teamNotifications['mesaj'].push).toBe(true)
  })

  it('deep-merges integrations — toggling slack does NOT replace sahibinden', () => {
    updateSettings({ integrations: { sahibinden: { enabled: true, lastSync: 1700_000_000_000 } } })
    updateSettings({ integrations: { slack: { enabled: true, webhookUrl: 'https://hooks.slack/x' } } })

    const out = getSettings()
    expect(out.integrations.sahibinden.enabled).toBe(true)
    expect(out.integrations.sahibinden.lastSync).toBe(1700_000_000_000)
    expect(out.integrations.slack.enabled).toBe(true)
    expect(out.integrations.slack.webhookUrl).toBe('https://hooks.slack/x')
    expect(out.integrations.hepsiemlak.enabled).toBe(false)
  })

  it('updates security.sessionTimeout to a supported value and rejects garbage', () => {
    const a = updateSettings({ security: { sessionTimeout: 240 } })
    expect(a.security.sessionTimeout).toBe(240)

    // Direct stuff a bad value into storage and ensure sanitize() clamps.
    window.localStorage.setItem(
      ADMIN_SETTINGS_KEY,
      JSON.stringify({ security: { sessionTimeout: 9999 } }),
    )
    const out = getSettings()
    expect(out.security.sessionTimeout).toBe(60)
  })

  it('updates account fields independently (companyName + theme)', () => {
    updateSettings({ account: { companyName: 'Yeni Şirket A.Ş.' } })
    updateSettings({ account: { theme: 'dark' } })

    const out = getSettings()
    expect(out.account.companyName).toBe('Yeni Şirket A.Ş.')
    expect(out.account.theme).toBe('dark')
    // Untouched fields retain defaults.
    expect(out.account.locale).toBe('tr')
    expect(out.account.dateFormat).toBe('dd.MM.yyyy')
  })
})

describe('admin-settings — exportData / deleteAccount', () => {
  it('buildExportPayload captures every arsam.admin-*.v1 key as parsed JSON', () => {
    updateSettings({ account: { companyName: 'Export Co.' } })
    window.localStorage.setItem('arsam.admin-views.v1', JSON.stringify([{ id: 'v1' }]))
    // Non-admin key — must not appear in the export.
    window.localStorage.setItem('arsam.favorites.v1', JSON.stringify(['lst-1']))

    const json = buildExportPayload()
    const parsed = JSON.parse(json)

    expect(typeof parsed.exportedAt).toBe('string')
    expect(parsed[ADMIN_SETTINGS_KEY].account.companyName).toBe('Export Co.')
    expect(parsed['arsam.admin-views.v1']).toEqual([{ id: 'v1' }])
    expect(parsed['arsam.favorites.v1']).toBeUndefined()
  })

  it('deleteAccount clears every arsam.admin-*.v1 key and leaves other keys alone', () => {
    updateSettings({ account: { companyName: 'X' } })
    window.localStorage.setItem('arsam.admin-team.v1', JSON.stringify([{ id: 'm1' }]))
    window.localStorage.setItem('arsam.favorites.v1', JSON.stringify(['lst-1']))
    window.localStorage.setItem('theme', 'dark')

    deleteAccount()

    expect(window.localStorage.getItem(ADMIN_SETTINGS_KEY)).toBeNull()
    expect(window.localStorage.getItem('arsam.admin-team.v1')).toBeNull()
    // Non-admin keys must survive.
    expect(window.localStorage.getItem('arsam.favorites.v1')).toBe(JSON.stringify(['lst-1']))
    expect(window.localStorage.getItem('theme')).toBe('dark')
  })
})
