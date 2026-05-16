import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router'
import { GlassFilter } from '@landx/ui'
import { AnimatedGrid } from '@landx/ui'
import { useOnline } from '@landx/ui/lib'
import { ThemeToggle } from '@landx/ui/theme'
import { PersonaSwitcher } from '@landx/ui/persona-switcher'
import { AssistantDrawer, useAssistantShortcut } from '@landx/ui/ai'
import { DynamicIslandHeader } from '@/components/shell/dynamic-island-header'
import { AppDock } from '@/components/shell/app-dock'
import { AssistantModal } from '@/components/assistant/assistant-modal'
import { useKeyboardShortcuts } from '@/components/keyboard/use-keyboard-shortcuts'
import { Toaster } from '@/components/ui/Toaster'

// Lazy: keep overlay DOM/style cost out of the main bundle.
const ShortcutsOverlay = lazy(() => import('@/components/keyboard/ShortcutsOverlay'))
const CommandPalette = lazy(() => import('@/components/command/CommandPalette'))

function pathToActiveKey(path: string): string {
  if (path === '/' || path === '') return 'overview'
  const seg = path.split('/').filter(Boolean)[0]
  return seg ?? 'overview'
}

export function RootLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const aiDrawer = useAssistantShortcut()

  const openAssistant = useCallback(() => setAssistantOpen(true), [])
  const closeAssistant = useCallback(() => setAssistantOpen(false), [])
  const openPalette = useCallback(() => setPaletteOpen(true), [])
  const closePalette = useCallback(() => setPaletteOpen(false), [])

  useEffect(() => {
    const isMac =
      typeof navigator !== 'undefined' &&
      /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent)

    const onKey = (e: KeyboardEvent) => {
      if (e.key?.toLowerCase() !== 'k') return
      const usingMeta = e.metaKey && !e.ctrlKey && !e.altKey
      const usingCtrl = e.ctrlKey && !e.metaKey && !e.altKey
      if (!usingMeta && !usingCtrl) return
      if (usingMeta && !isMac) return
      if (usingCtrl && isMac) return
      e.preventDefault()
      e.stopPropagation()
      setAssistantOpen((v) => !v)
    }
    const onOpen = () => setAssistantOpen(true)
    window.addEventListener('keydown', onKey)
    window.addEventListener('open-assistant', onOpen)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('open-assistant', onOpen)
    }
  }, [])

  const openShortcuts = useCallback(() => setShortcutsOpen(true), [])
  const closeShortcuts = useCallback(() => setShortcutsOpen(false), [])
  useKeyboardShortcuts({
    openOverlay: openShortcuts,
    closeOverlay: closeShortcuts,
    openCommandPalette: openPalette,
    closeCommandPalette: closePalette,
  })

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden">
      <ConnectivityBanner />
      <GlassFilter />
      <AnimatedGrid />

      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-foreground focus:px-4 focus:py-2 focus:text-background"
      >
        Ana içeriğe geç
      </a>

      <DynamicIslandHeader
        activeKey={pathToActiveKey(location.pathname)}
        unreadCount={0}
        onNavigate={(key) => {
          if (key === 'overview') navigate('/')
        }}
        onOpenAssistant={openAssistant}
      />

      <div className="fixed right-4 top-4 z-40 pointer-events-auto flex items-center gap-2">
        <PersonaSwitcher />
        <ThemeToggle align="end" />
      </div>

      <main id="main-content" className="relative z-10">
        <Outlet />
      </main>

      <AppDock />

      <AssistantModal open={assistantOpen} onClose={closeAssistant} />

      <AssistantDrawer
        open={aiDrawer.open}
        onClose={() => aiDrawer.setOpen(false)}
        role="seller"
        initialMessage="Atölye paneline hoş geldin — listings/customer/teklif sorularına yardımcı olabilirim. Cmd+J ile aç/kapa."
        onSuggestion={(s) => {
          if (s.href) navigate(s.href)
          aiDrawer.setOpen(false)
        }}
      />

      <Suspense fallback={null}>
        <ShortcutsOverlay open={shortcutsOpen} onClose={closeShortcuts} />
      </Suspense>

      <Suspense fallback={null}>
        {paletteOpen && <CommandPalette open={paletteOpen} onClose={closePalette} />}
      </Suspense>

      <Toaster />
    </div>
  )
}

/**
 * Wave F30.A — sticky-top connectivity indicator. Renders only when
 * `useOnline` reports the browser has gone offline, so the chrome stays
 * clean during normal operation.
 */
function ConnectivityBanner() {
  const online = useOnline()
  if (online) return null
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-0 z-50 border-b border-border bg-card/95 px-4 py-2 text-center text-xs text-muted-foreground backdrop-blur-md"
    >
      Bağlantın kesildi · değişiklikler bağlantı dönünce eşitlenecek
    </div>
  )
}
