import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import {
  SavedViewsMenu,
  listSavedViews,
  saveView,
  deleteSavedView,
  SAVED_VIEWS_KEY,
} from '@/components/shared/SavedViewsMenu'

function renderMenu(props: {
  entity?: 'listings' | 'customers'
  currentFilters?: Record<string, string | string[]>
  onApply?: (filters: Record<string, string | string[]>) => void
} = {}) {
  const onApply = props.onApply ?? vi.fn()
  render(
    <MemoryRouter>
      <SavedViewsMenu
        entity={props.entity ?? 'listings'}
        currentFilters={props.currentFilters ?? {}}
        onApply={onApply}
      />
    </MemoryRouter>,
  )
  return { onApply }
}

describe('SavedViewsMenu — store helpers', () => {
  beforeEach(() => {
    localStorage.removeItem(SAVED_VIEWS_KEY)
  })
  afterEach(() => {
    localStorage.removeItem(SAVED_VIEWS_KEY)
  })

  it('listSavedViews returns [] initially', () => {
    expect(listSavedViews('listings')).toEqual([])
  })

  it('saveView persists per-entity and filters lookups', () => {
    saveView('listings', 'Aktif Ayvalık', { status: 'Aktif', city: 'Balıkesir' })
    saveView('customers', 'Sıcak Ayvalık', { segment: 'Sıcak' })
    expect(listSavedViews('listings').map((v) => v.name)).toEqual(['Aktif Ayvalık'])
    expect(listSavedViews('customers').map((v) => v.name)).toEqual(['Sıcak Ayvalık'])
  })

  it('deleteSavedView removes by id', () => {
    const v = saveView('listings', 'A', { status: 'Aktif' })
    deleteSavedView(v.id)
    expect(listSavedViews('listings')).toEqual([])
  })

  it('ignores corrupt stored data', () => {
    localStorage.setItem(SAVED_VIEWS_KEY, '{not json')
    expect(listSavedViews('listings')).toEqual([])
  })
})

describe('SavedViewsMenu — UI', () => {
  beforeEach(() => {
    localStorage.removeItem(SAVED_VIEWS_KEY)
  })
  afterEach(() => {
    localStorage.removeItem(SAVED_VIEWS_KEY)
  })

  it('opens the menu when the trigger is clicked', () => {
    renderMenu()
    fireEvent.click(screen.getByTestId('saved-views-toggle'))
    expect(screen.getByTestId('saved-views-menu')).toBeTruthy()
  })

  it('shows the empty state with no saved views', () => {
    renderMenu()
    fireEvent.click(screen.getByTestId('saved-views-toggle'))
    expect(screen.getByText(/Henüz kayıtlı görünüm yok/i)).toBeTruthy()
  })

  it('saves a new view via the inline form', () => {
    renderMenu({ currentFilters: { status: 'Aktif' } })
    fireEvent.click(screen.getByTestId('saved-views-toggle'))
    fireEvent.click(screen.getByTestId('saved-view-new'))
    const input = screen.getByTestId('saved-view-name-input') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'Aktif olanlar' } })
    fireEvent.click(screen.getByTestId('saved-view-save'))
    const views = listSavedViews('listings')
    expect(views.length).toBe(1)
    expect(views[0].name).toBe('Aktif olanlar')
  })

  it('applies a stored view via the apply button', async () => {
    saveView('listings', 'Pasif olanlar', { status: 'Pasif' })
    const onApply = vi.fn()
    renderMenu({ onApply })
    fireEvent.click(screen.getByTestId('saved-views-toggle'))
    const view = listSavedViews('listings')[0]
    fireEvent.click(screen.getByTestId(`saved-view-apply-${view.id}`))
    expect(onApply).toHaveBeenCalledWith({ status: 'Pasif' })
  })

  it('deletes a stored view from the menu', () => {
    saveView('listings', 'Silinecek', { status: 'Aktif' })
    renderMenu()
    fireEvent.click(screen.getByTestId('saved-views-toggle'))
    const view = listSavedViews('listings')[0]
    fireEvent.click(screen.getByTestId(`saved-view-delete-${view.id}`))
    expect(listSavedViews('listings')).toEqual([])
  })

  it('disables Save while name is empty', () => {
    renderMenu()
    fireEvent.click(screen.getByTestId('saved-views-toggle'))
    fireEvent.click(screen.getByTestId('saved-view-new'))
    const save = screen.getByTestId('saved-view-save') as HTMLButtonElement
    expect(save.disabled).toBe(true)
  })
})
