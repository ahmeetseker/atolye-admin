import { useCallback, useEffect, useRef, useState } from 'react'
import { Bookmark, Check, ChevronDown, Plus, Trash2 } from '@landx/icons'
import { cn } from '@landx/ui'
import type { FilterMap } from '@landx/ui/lib'

export type SavedViewEntity = 'listings' | 'customers'

export interface SavedView {
  id: string
  entity: SavedViewEntity
  name: string
  filters: FilterMap
  createdAt: number
}

export const SAVED_VIEWS_KEY = 'arsam.admin-saved-views.v1'

function readStore(): SavedView[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(SAVED_VIEWS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(isValidView) : []
  } catch {
    return []
  }
}

function isValidView(v: unknown): v is SavedView {
  if (!v || typeof v !== 'object') return false
  const view = v as Partial<SavedView>
  return (
    typeof view.id === 'string' &&
    typeof view.name === 'string' &&
    (view.entity === 'listings' || view.entity === 'customers') &&
    typeof view.filters === 'object'
  )
}

function writeStore(views: SavedView[]): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(SAVED_VIEWS_KEY, JSON.stringify(views))
  } catch {
    /* ignore quota */
  }
}

export function listSavedViews(entity: SavedViewEntity): SavedView[] {
  return readStore().filter((v) => v.entity === entity)
}

export function saveView(entity: SavedViewEntity, name: string, filters: FilterMap): SavedView {
  const view: SavedView = {
    id: `sv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    entity,
    name: name.trim(),
    filters,
    createdAt: Date.now(),
  }
  const all = readStore()
  all.push(view)
  writeStore(all)
  return view
}

export function deleteSavedView(id: string): void {
  const all = readStore().filter((v) => v.id !== id)
  writeStore(all)
}

function filtersAreEqual(a: FilterMap, b: FilterMap): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  for (const k of keys) {
    const va = a[k]
    const vb = b[k]
    if (Array.isArray(va) || Array.isArray(vb)) {
      const arrA = (Array.isArray(va) ? va : va ? [va] : []).slice().sort()
      const arrB = (Array.isArray(vb) ? vb : vb ? [vb] : []).slice().sort()
      if (arrA.length !== arrB.length) return false
      for (let i = 0; i < arrA.length; i++) if (arrA[i] !== arrB[i]) return false
      continue
    }
    if ((va ?? '') !== (vb ?? '')) return false
  }
  return true
}

export interface SavedViewsMenuProps {
  entity: SavedViewEntity
  currentFilters: FilterMap
  onApply: (filters: FilterMap) => void
  className?: string
}

export function SavedViewsMenu({
  entity,
  currentFilters,
  onApply,
  className,
}: SavedViewsMenuProps) {
  const [open, setOpen] = useState(false)
  const [views, setViews] = useState<SavedView[]>([])
  const [newName, setNewName] = useState('')
  const [showForm, setShowForm] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    setViews(listSavedViews(entity))
  }, [open, entity])

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setShowForm(false)
        setNewName('')
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false)
        setShowForm(false)
        setNewName('')
      }
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const handleSave = useCallback(() => {
    const name = newName.trim()
    if (!name) return
    saveView(entity, name, currentFilters)
    setViews(listSavedViews(entity))
    setShowForm(false)
    setNewName('')
  }, [entity, newName, currentFilters])

  const handleDelete = useCallback(
    (id: string) => {
      deleteSavedView(id)
      setViews(listSavedViews(entity))
    },
    [entity],
  )

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        data-testid="saved-views-toggle"
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-[12.5px] font-medium text-muted-foreground transition hover:bg-foreground/5 hover:text-foreground"
      >
        <Bookmark className="h-3.5 w-3.5" />
        <span>Görünümler</span>
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <div
          role="menu"
          data-testid="saved-views-menu"
          className="absolute right-0 top-full z-40 mt-1.5 w-72 overflow-hidden rounded-2xl border border-border bg-card shadow-lg"
        >
          {views.length === 0 ? (
            <div className="px-3 py-3 text-[12.5px] text-muted-foreground">
              Henüz kayıtlı görünüm yok.
            </div>
          ) : (
            <ul className="max-h-64 overflow-y-auto py-1">
              {views.map((view) => {
                const active = filtersAreEqual(view.filters, currentFilters)
                return (
                  <li key={view.id} className="flex items-center gap-2 px-2">
                    <button
                      type="button"
                      onClick={() => {
                        onApply(view.filters)
                        setOpen(false)
                      }}
                      data-testid={`saved-view-apply-${view.id}`}
                      className={cn(
                        'flex flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition',
                        active
                          ? 'bg-foreground/5 text-foreground'
                          : 'text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground',
                      )}
                    >
                      {active && <Check className="h-3.5 w-3.5" />}
                      <span className="flex-1 truncate">{view.name}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(view.id)}
                      data-testid={`saved-view-delete-${view.id}`}
                      aria-label={`${view.name} görünümünü sil`}
                      className="rounded-md p-1 text-muted-foreground transition hover:bg-rose-500/10 hover:text-rose-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
          <div className="border-t border-border bg-foreground/[0.02] px-2 py-2">
            {showForm ? (
              <div className="flex gap-1.5">
                <input
                  type="text"
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSave()
                    if (e.key === 'Escape') {
                      setShowForm(false)
                      setNewName('')
                    }
                  }}
                  placeholder="Görünüm adı"
                  data-testid="saved-view-name-input"
                  className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-sm outline-none placeholder:text-[hsl(var(--placeholder))] focus:border-foreground"
                />
                <button
                  type="button"
                  onClick={handleSave}
                  data-testid="saved-view-save"
                  disabled={!newName.trim()}
                  className="rounded-md bg-foreground px-2 py-1 text-[12px] font-medium text-background transition disabled:opacity-50"
                >
                  Kaydet
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowForm(true)}
                data-testid="saved-view-new"
                className="flex w-full items-center justify-center gap-1.5 rounded-md py-1 text-[12.5px] font-medium text-muted-foreground transition hover:text-foreground"
              >
                <Plus className="h-3 w-3" />
                Mevcut görünümü kaydet
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default SavedViewsMenu
