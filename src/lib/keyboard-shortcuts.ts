/**
 * F14.B — atolye-admin keyboard shortcut registry.
 *
 * Registry-pattern: shortcuts are declared as data, the hook consumes them.
 * Each shortcut owns its `handler` so we can later mix navigation, modal
 * triggers, theme toggles etc. without expanding the dispatcher.
 *
 * Key syntax:
 *   - `g h`     → sequence: press `g`, then `h` within SEQUENCE_TIMEOUT_MS
 *   - `?`       → single-key (no modifier)
 *   - `shift+/` → same physical chord as `?` on US layouts; treated as alias
 *   - `Escape`  → single-key (handled inline by overlay for state sync)
 */

export type ShortcutScope = 'global' | 'route'

export interface ShortcutContext {
  navigate: (to: string) => void
  openOverlay: () => void
  closeOverlay: () => void
  openCommandPalette: () => void
  closeCommandPalette: () => void
}

export interface Shortcut {
  keys: string
  label: string
  scope: ShortcutScope
  group: 'navigation' | 'overlay' | 'general' | 'palette'
  handler: (ctx: ShortcutContext) => void
}

export const SEQUENCE_TIMEOUT_MS = 1200

export const SHORTCUTS: ReadonlyArray<Shortcut> = [
  // Navigation (vim-style `g` prefix)
  {
    keys: 'g h',
    label: 'Anasayfa',
    scope: 'global',
    group: 'navigation',
    handler: ({ navigate }) => navigate('/'),
  },
  {
    keys: 'g l',
    label: 'İlanlar',
    scope: 'global',
    group: 'navigation',
    handler: ({ navigate }) => navigate('/listings'),
  },
  {
    keys: 'g c',
    label: 'Müşteriler',
    scope: 'global',
    group: 'navigation',
    handler: ({ navigate }) => navigate('/customers'),
  },
  {
    keys: 'g s',
    label: 'Satış',
    scope: 'global',
    group: 'navigation',
    handler: ({ navigate }) => navigate('/sales'),
  },
  {
    keys: 'g r',
    label: 'Raporlar',
    scope: 'global',
    group: 'navigation',
    handler: ({ navigate }) => navigate('/reports'),
  },
  {
    keys: 'g k',
    label: 'Takvim',
    scope: 'global',
    group: 'navigation',
    handler: ({ navigate }) => navigate('/calendar'),
  },
  {
    keys: 'g m',
    label: 'Mesajlar',
    scope: 'global',
    group: 'navigation',
    handler: ({ navigate }) => navigate('/messages'),
  },

  // Overlay
  {
    keys: '?',
    label: 'Kısayolları göster',
    scope: 'global',
    group: 'overlay',
    handler: ({ openOverlay }) => openOverlay(),
  },
  {
    keys: 'shift+/',
    label: 'Kısayolları göster',
    scope: 'global',
    group: 'overlay',
    handler: ({ openOverlay }) => openOverlay(),
  },
  {
    keys: 'Escape',
    label: 'Kısayol panelini kapat',
    scope: 'global',
    group: 'overlay',
    handler: ({ closeOverlay }) => closeOverlay(),
  },
  {
    keys: 'mod+/',
    label: 'Komut paleti',
    scope: 'global',
    group: 'palette',
    handler: ({ openCommandPalette }) => openCommandPalette(),
  },
]

/**
 * Find a shortcut by an already-normalized key spec (`g h`, `?`, `Escape`...).
 * Returns the first match — duplicate keys would resolve to whichever is
 * registered first, but for the current registry every binding is unique.
 */
export function findShortcut(keys: string): Shortcut | undefined {
  return SHORTCUTS.find((s) => s.keys === keys)
}

/**
 * Group shortcuts for overlay rendering. Stable iteration order: matches
 * `SHORTCUTS` insertion order within each bucket.
 */
export function groupShortcuts(
  shortcuts: ReadonlyArray<Shortcut> = SHORTCUTS,
): Record<Shortcut['group'], Shortcut[]> {
  const out: Record<Shortcut['group'], Shortcut[]> = {
    navigation: [],
    overlay: [],
    general: [],
    palette: [],
  }
  for (const s of shortcuts) out[s.group].push(s)
  return out
}

/**
 * Determine whether a keydown should be ignored because the user is typing
 * into an editable element. Centralized so the hook + future helpers agree.
 */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false
  const tag = target.tagName.toUpperCase()
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (target.isContentEditable) return true
  return false
}
