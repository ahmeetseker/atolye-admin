import { useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router'
import {
  SEQUENCE_TIMEOUT_MS,
  SHORTCUTS,
  findShortcut,
  isEditableTarget,
  type Shortcut,
  type ShortcutContext,
} from '@/lib/keyboard-shortcuts'

interface Options {
  openOverlay: () => void
  closeOverlay: () => void
  openCommandPalette?: () => void
  closeCommandPalette?: () => void
}

const NOOP = () => {}

/**
 * Global keyboard listener with a 1.2 s sequence buffer for vim-style
 * `g <letter>` navigation. Single-key bindings (`?`, `shift+/`, `Escape`)
 * fire immediately. Modifier chords (`mod+/`, `cmd+x`, `ctrl+x`) resolve
 * via the registry. Editable targets short-circuit so typing in an input
 * never hijacks navigation.
 */
export function useKeyboardShortcuts({
  openOverlay,
  closeOverlay,
  openCommandPalette,
  closeCommandPalette,
}: Options) {
  const navigate = useNavigate()

  const ctxRef = useRef<ShortcutContext>({
    navigate,
    openOverlay,
    closeOverlay,
    openCommandPalette: openCommandPalette ?? NOOP,
    closeCommandPalette: closeCommandPalette ?? NOOP,
  })
  ctxRef.current = {
    navigate,
    openOverlay,
    closeOverlay,
    openCommandPalette: openCommandPalette ?? NOOP,
    closeCommandPalette: closeCommandPalette ?? NOOP,
  }

  const resolve = useCallback((keys: string): Shortcut | undefined => {
    return findShortcut(keys)
  }, [])

  useEffect(() => {
    let pending: string | null = null
    let pendingTimer: number | null = null

    const clearPending = () => {
      pending = null
      if (pendingTimer !== null) {
        window.clearTimeout(pendingTimer)
        pendingTimer = null
      }
    }

    const fire = (shortcut: Shortcut) => {
      shortcut.handler(ctxRef.current)
    }

    const handle = (e: KeyboardEvent) => {
      // Always allow Escape to flow through — overlay state sync depends on it
      // even when focus is inside an input (e.g. autocomplete).
      const isEscape = e.key === 'Escape'

      if (!isEscape && isEditableTarget(e.target)) {
        clearPending()
        return
      }

      // Modifier-bearing chords: resolve via registry (mod+x, cmd+x, ctrl+x).
      // `mod+` prefix is cross-platform — matches cmd on Mac, ctrl elsewhere.
      // Unknown modifier combos fall through (assistant cmd+k handled outside,
      // browser shortcuts keep default behaviour).
      const hasMod = e.metaKey || e.ctrlKey || e.altKey
      if (hasMod) {
        clearPending()
        const keyLower = e.key.toLowerCase()
        const isMac = e.metaKey && !e.ctrlKey
        const explicitPrefix = isMac ? 'cmd' : 'ctrl'
        const candidates = [
          `${explicitPrefix}+${keyLower}`,
          `mod+${keyLower}`,
        ]
        if (e.shiftKey) {
          candidates.unshift(`${explicitPrefix}+shift+${keyLower}`, `mod+shift+${keyLower}`)
        }
        if (e.altKey) {
          candidates.unshift(`${explicitPrefix}+alt+${keyLower}`, `mod+alt+${keyLower}`)
        }
        for (const c of candidates) {
          const match = resolve(c)
          if (match) {
            e.preventDefault()
            fire(match)
            return
          }
        }
        return
      }

      // `shift+/` and `?` resolve to the same overlay binding on US-layout
      // keyboards. Treat shift+/ as an alias of `?`.
      if (e.shiftKey && e.key === '/') {
        e.preventDefault()
        clearPending()
        const match = resolve('shift+/') ?? resolve('?')
        if (match) fire(match)
        return
      }

      // Plain `?` (some layouts produce it without Shift).
      if (e.key === '?') {
        e.preventDefault()
        clearPending()
        const match = resolve('?')
        if (match) fire(match)
        return
      }

      if (isEscape) {
        const match = resolve('Escape')
        if (match) fire(match)
        clearPending()
        return
      }

      // Letter keys for `g <letter>` sequences. We deliberately ignore Shift
      // here so `G` (held shift) doesn't start a navigation buffer.
      if (e.shiftKey) {
        clearPending()
        return
      }

      const key = e.key.toLowerCase()
      if (key.length !== 1) {
        clearPending()
        return
      }

      if (pending === 'g') {
        const combo = `g ${key}`
        const match = resolve(combo)
        clearPending()
        if (match) {
          e.preventDefault()
          fire(match)
        }
        return
      }

      if (key === 'g') {
        // Start buffer; do NOT preventDefault — single `g` may be typed
        // elsewhere (e.g. focus already moved away from input).
        pending = 'g'
        pendingTimer = window.setTimeout(clearPending, SEQUENCE_TIMEOUT_MS)
        return
      }
    }

    window.addEventListener('keydown', handle)
    return () => {
      window.removeEventListener('keydown', handle)
      clearPending()
    }
  }, [resolve])

  return { shortcuts: SHORTCUTS }
}
