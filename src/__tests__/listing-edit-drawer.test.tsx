import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { EditListingDrawer } from '@/components/listing-edit/EditListingDrawer'
import type { Listing } from '@landx/data'

const sample: Listing = {
  id: 'L-1234',
  title: 'Test arsa · Ayvalık',
  city: 'Balıkesir',
  district: 'Ayvalık · Cunda',
  type: 'İmarlı',
  size: 1200,
  price: 8_400_000,
  status: 'Aktif',
  views: 42,
  weeklyTrend: [1, 2, 3, 4, 5, 6, 7],
  lastUpdate: '2026-05-01T12:00:00.000Z',
  tags: ['deniz manzaralı', 'yola cephe'],
  lat: 39.32,
  lng: 26.69,
}

describe('EditListingDrawer', () => {
  it('renders the listing form when open=true and hydrates fields from the listing', () => {
    render(
      <EditListingDrawer
        open
        listing={sample}
        onSubmit={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByTestId('listing-edit-drawer')).toBeInTheDocument()
    const title = screen.getByTestId('listing-edit-field-title') as HTMLInputElement
    const price = screen.getByTestId('listing-edit-field-price') as HTMLInputElement
    const tags = screen.getByTestId('listing-edit-field-tags') as HTMLInputElement
    expect(title.value).toBe('Test arsa · Ayvalık')
    expect(price.value).toBe('8400000')
    expect(tags.value).toContain('deniz manzaralı')
  })

  it('does not render the drawer when open=false', () => {
    render(
      <EditListingDrawer
        open={false}
        listing={sample}
        onSubmit={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    expect(screen.queryByTestId('listing-edit-drawer')).not.toBeInTheDocument()
  })

  it('calls onSubmit with { id, patch } when the form is submitted', async () => {
    const onSubmit = vi.fn()
    render(
      <EditListingDrawer
        open
        listing={sample}
        onSubmit={onSubmit}
        onClose={vi.fn()}
      />,
    )

    const title = screen.getByTestId('listing-edit-field-title') as HTMLInputElement
    fireEvent.change(title, { target: { value: 'Güncellenmiş başlık' } })

    const price = screen.getByTestId('listing-edit-field-price') as HTMLInputElement
    fireEvent.change(price, { target: { value: '9000000' } })

    fireEvent.click(screen.getByTestId('listing-edit-submit'))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'L-1234',
        patch: expect.objectContaining({
          title: 'Güncellenmiş başlık',
          price: 9_000_000,
        }),
      }),
    )
  })

  it('calls onClose when ESC is pressed', () => {
    const onClose = vi.fn()
    render(
      <EditListingDrawer
        open
        listing={sample}
        onSubmit={vi.fn()}
        onClose={onClose}
      />,
    )

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    })

    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose when "İptal" is clicked', () => {
    const onClose = vi.fn()
    render(
      <EditListingDrawer
        open
        listing={sample}
        onSubmit={vi.fn()}
        onClose={onClose}
      />,
    )

    fireEvent.click(screen.getByTestId('listing-edit-cancel'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('disables the submit button while pending', () => {
    render(
      <EditListingDrawer
        open
        listing={sample}
        pending
        onSubmit={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    const submit = screen.getByTestId('listing-edit-submit') as HTMLButtonElement
    expect(submit.disabled).toBe(true)
    expect(submit.textContent).toMatch(/Kaydediliyor/)
  })
})
