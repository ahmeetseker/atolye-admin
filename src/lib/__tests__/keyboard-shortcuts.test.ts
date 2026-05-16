import { describe, it, expect, vi } from 'vitest'
import {
  SHORTCUTS,
  SEQUENCE_TIMEOUT_MS,
  findShortcut,
  groupShortcuts,
  isEditableTarget,
  type ShortcutContext,
} from '@/lib/keyboard-shortcuts'

function makeCtx(): ShortcutContext {
  return {
    navigate: vi.fn(),
    openOverlay: vi.fn(),
    closeOverlay: vi.fn(),
    openCommandPalette: vi.fn(),
    closeCommandPalette: vi.fn(),
  }
}

describe('keyboard-shortcuts registry', () => {
  it('exposes a non-empty registry of frozen-shape shortcuts', () => {
    expect(SHORTCUTS.length).toBeGreaterThan(0)
    for (const s of SHORTCUTS) {
      expect(typeof s.keys).toBe('string')
      expect(typeof s.label).toBe('string')
      expect(['global', 'route']).toContain(s.scope)
      expect(typeof s.handler).toBe('function')
    }
  })

  it('covers the required atolye navigation bindings', () => {
    const required = ['g h', 'g l', 'g c', 'g s', 'g r', 'g k', 'g m']
    for (const k of required) {
      expect(findShortcut(k), `missing ${k}`).toBeDefined()
    }
  })

  it('registers both `?` and `shift+/` aliases for the overlay', () => {
    expect(findShortcut('?')).toBeDefined()
    expect(findShortcut('shift+/')).toBeDefined()
    expect(findShortcut('Escape')).toBeDefined()
  })

  it('SEQUENCE_TIMEOUT_MS is generous enough for two-keystroke vim binds', () => {
    expect(SEQUENCE_TIMEOUT_MS).toBeGreaterThanOrEqual(800)
    expect(SEQUENCE_TIMEOUT_MS).toBeLessThanOrEqual(2000)
  })

  describe('handlers', () => {
    it('`g h` navigates to /', () => {
      const ctx = makeCtx()
      findShortcut('g h')!.handler(ctx)
      expect(ctx.navigate).toHaveBeenCalledWith('/')
    })

    it('`g l` navigates to /listings', () => {
      const ctx = makeCtx()
      findShortcut('g l')!.handler(ctx)
      expect(ctx.navigate).toHaveBeenCalledWith('/listings')
    })

    it('`?` opens the overlay', () => {
      const ctx = makeCtx()
      findShortcut('?')!.handler(ctx)
      expect(ctx.openOverlay).toHaveBeenCalledTimes(1)
    })

    it('`Escape` closes the overlay', () => {
      const ctx = makeCtx()
      findShortcut('Escape')!.handler(ctx)
      expect(ctx.closeOverlay).toHaveBeenCalledTimes(1)
    })

    it('`mod+/` opens the command palette', () => {
      const ctx = makeCtx()
      findShortcut('mod+/')!.handler(ctx)
      expect(ctx.openCommandPalette).toHaveBeenCalledTimes(1)
    })
  })

  describe('groupShortcuts', () => {
    it('returns every shortcut bucketed by group', () => {
      const grouped = groupShortcuts()
      const total =
        grouped.navigation.length +
        grouped.overlay.length +
        grouped.general.length +
        grouped.palette.length
      expect(total).toBe(SHORTCUTS.length)
    })

    it('navigation group is non-empty and overlay group includes `?`', () => {
      const grouped = groupShortcuts()
      expect(grouped.navigation.length).toBeGreaterThan(0)
      expect(grouped.overlay.map((s) => s.keys)).toContain('?')
    })
  })

  describe('isEditableTarget', () => {
    it('treats <input>, <textarea>, <select> as editable', () => {
      for (const tag of ['input', 'textarea', 'select']) {
        const el = document.createElement(tag)
        expect(isEditableTarget(el)).toBe(true)
      }
    })

    it('treats contenteditable elements as editable', () => {
      // jsdom does not derive isContentEditable from the attribute, so stub
      // the property directly to mirror what a real browser exposes.
      const el = document.createElement('div')
      Object.defineProperty(el, 'isContentEditable', { value: true, configurable: true })
      expect(isEditableTarget(el)).toBe(true)
    })

    it('treats null and non-form elements as non-editable', () => {
      expect(isEditableTarget(null)).toBe(false)
      expect(isEditableTarget(document.createElement('button'))).toBe(false)
      expect(isEditableTarget(document.createElement('div'))).toBe(false)
    })
  })
})
