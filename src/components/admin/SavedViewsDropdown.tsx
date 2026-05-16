import { useEffect, useMemo, useRef, useState } from 'react'
import { Bookmark, BookmarkPlus, ChevronDown, X } from '@landx/icons'
import { cn } from '@landx/ui'
import {
  SYSTEM_VIEWS,
  getSavedViews,
  paramsEqual,
  removeSavedView,
  type AdminApp,
  type SavedView,
  type SystemView,
} from '@/lib/admin-views'
import { SaveViewDialog } from './SaveViewDialog'

interface SavedViewsDropdownProps {
  app: AdminApp
  /** Current URL params string (no leading "?"). */
  currentParams: string
  /** Page-level handler: navigate to the picked view. Receives the raw params string. */
  onApply: (params: string) => void
}

/**
 * F6.C — saved view picker.
 *
 * Lists system defaults followed by user-saved views (oldest first). Current
 * view is detected via `paramsEqual` so reorder-resilient highlighting works.
 * "Bu görünümü kaydet" opens `SaveViewDialog` with a snapshot of `currentParams`.
 *
 * No URL history coupling: parent passes `onApply` and decides whether to
 * `pushState` / `setSearchParams` / etc.
 */
export function SavedViewsDropdown({
  app,
  currentParams,
  onApply,
}: SavedViewsDropdownProps) {
  const [open, setOpen] = useState(false)
  const [showSave, setShowSave] = useState(false)
  const [tick, setTick] = useState(0) // forces refresh after add/remove
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const onAway = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('mousedown', onAway)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onAway)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const systemViews = SYSTEM_VIEWS[app]
  const userViews = useMemo<SavedView[]>(
    () => getSavedViews(app),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [app, tick],
  )

  // Highlight whichever system or user view matches the live URL params.
  const activeView = useMemo(() => {
    for (const sv of systemViews) {
      if (paramsEqual(sv.params, currentParams)) return { kind: 'system' as const, view: sv }
    }
    for (const uv of userViews) {
      if (paramsEqual(uv.params, currentParams)) return { kind: 'user' as const, view: uv }
    }
    return null
  }, [systemViews, userViews, currentParams])

  const triggerLabel = activeView?.view.name ?? 'Görünüm'

  const handleApply = (params: string) => {
    setOpen(false)
    onApply(params)
  }

  const handleRemove = (id: string) => {
    removeSavedView(id)
    setTick((t) => t + 1)
  }

  return (
    <>
      <div ref={ref} className="relative">
        <button
          type="button"
          data-testid="saved-views-trigger"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium transition hover:bg-foreground/5"
        >
          <Bookmark className="h-3.5 w-3.5" />
          <span className="max-w-[160px] truncate">{triggerLabel}</span>
          <ChevronDown className="h-3 w-3 opacity-60" />
        </button>
        {open && (
          <div
            role="listbox"
            data-testid="saved-views-menu"
            className="absolute right-0 top-full z-30 mt-1.5 w-[280px] overflow-hidden rounded-xl border border-border bg-card shadow-xl"
          >
            <ViewSection title="Sistem">
              {systemViews.map((sv) => (
                <SystemRow
                  key={sv.id}
                  view={sv}
                  active={
                    activeView?.kind === 'system' && activeView.view.id === sv.id
                  }
                  onPick={() => handleApply(sv.params)}
                />
              ))}
            </ViewSection>
            <ViewSection title="Kaydedilenler">
              {userViews.length === 0 ? (
                <p className="px-3 py-3 text-[12px] text-muted-foreground">
                  Henüz kaydedilmiş görünüm yok.
                </p>
              ) : (
                userViews.map((uv) => (
                  <UserRow
                    key={uv.id}
                    view={uv}
                    active={
                      activeView?.kind === 'user' && activeView.view.id === uv.id
                    }
                    onPick={() => handleApply(uv.params)}
                    onDelete={() => handleRemove(uv.id)}
                  />
                ))
              )}
            </ViewSection>
            <div className="border-t border-border bg-muted/30 px-2 py-2">
              <button
                type="button"
                data-testid="saved-view-save-trigger"
                onClick={() => {
                  setOpen(false)
                  setShowSave(true)
                }}
                className="inline-flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] font-medium hover:bg-foreground/5"
              >
                <BookmarkPlus className="h-3.5 w-3.5" />
                Bu görünümü kaydet
              </button>
            </div>
          </div>
        )}
      </div>

      <SaveViewDialog
        open={showSave}
        app={app}
        params={currentParams}
        onSaved={() => {
          setShowSave(false)
          setTick((t) => t + 1)
        }}
        onCancel={() => setShowSave(false)}
      />
    </>
  )
}

function ViewSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="border-b border-border last:border-0">
      <div className="px-3 pt-2 pb-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {title}
      </div>
      <div className="pb-1.5">{children}</div>
    </div>
  )
}

function SystemRow({
  view,
  active,
  onPick,
}: {
  view: SystemView
  active: boolean
  onPick: () => void
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      data-testid={`saved-view-system-${view.id}`}
      onClick={onPick}
      className={cn(
        'block w-full px-3 py-1.5 text-left text-[13px] transition hover:bg-foreground/5',
        active && 'bg-foreground/[0.06] font-medium',
      )}
    >
      {view.name}
    </button>
  )
}

function UserRow({
  view,
  active,
  onPick,
  onDelete,
}: {
  view: SavedView
  active: boolean
  onPick: () => void
  onDelete: () => void
}) {
  return (
    <div
      className={cn(
        'group flex items-center justify-between gap-2 px-3 py-1.5 text-[13px] transition hover:bg-foreground/5',
        active && 'bg-foreground/[0.06] font-medium',
      )}
    >
      <button
        type="button"
        role="option"
        aria-selected={active}
        data-testid={`saved-view-user-${view.id}`}
        onClick={onPick}
        className="min-w-0 flex-1 truncate text-left"
        title={view.params}
      >
        {view.name}
      </button>
      <button
        type="button"
        aria-label={`${view.name} sil`}
        data-testid={`saved-view-delete-${view.id}`}
        onClick={onDelete}
        className="flex h-5 w-5 items-center justify-center rounded-md text-muted-foreground opacity-0 transition hover:bg-foreground/10 hover:text-foreground group-hover:opacity-100 focus:opacity-100"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  )
}
