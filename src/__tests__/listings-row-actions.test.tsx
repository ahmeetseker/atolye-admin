import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import type { Listing } from '@landx/data'
import { RowActionsMenu } from '@/components/listing-edit/RowActionsMenu'
import { EditListingDrawer } from '@/components/listing-edit/EditListingDrawer'
import { DeleteListingDialog } from '@/components/listing-edit/DeleteListingDialog'

// Vitest + framer-motion uses queueMicrotask; wrap in act() to flush.
const flush = async () => {
  await act(async () => {
    await Promise.resolve()
  })
}

const sample: Listing = {
  id: 'L-1234',
  title: 'Test arsa · Ayvalık',
  city: 'Balıkesir',
  district: 'Ayvalık · Cunda',
  type: 'İmarlı',
  size: 1240,
  price: 8400000,
  status: 'Aktif',
  views: 320,
  weeklyTrend: [10, 12, 14, 18, 20, 22, 30],
  lastUpdate: '2025-09-01T12:00:00.000Z',
  tags: ['deniz manzaralı', 'yola cephe'],
  lat: 39.35,
  lng: 26.65,
}

describe('Listings row actions', () => {
  it('opens the menu when the ⋯ trigger is clicked', async () => {
    render(<RowActionsMenu id={sample.id} onEdit={() => {}} onDelete={() => {}} />)

    const trigger = screen.getByTestId(`listing-row-actions-${sample.id}`)
    expect(trigger).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(trigger)
    await flush()

    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('menu')).toBeInTheDocument()
    expect(screen.getByText('Düzenle')).toBeInTheDocument()
    expect(screen.getByText('Sil')).toBeInTheDocument()
  })

  it('prefills the edit drawer with the listing fields when open', async () => {
    render(
      <EditListingDrawer
        open
        listing={sample}
        onClose={() => {}}
        onSubmit={() => {}}
      />,
    )
    await flush()

    expect(screen.getByTestId('listing-edit-drawer')).toBeInTheDocument()
    expect(screen.getByTestId('listing-edit-field-title')).toHaveValue(sample.title)
    expect(screen.getByTestId('listing-edit-field-price')).toHaveValue(sample.price)
    expect(screen.getByTestId('listing-edit-field-status')).toHaveValue(sample.status)
    expect(screen.getByTestId('listing-edit-field-tags')).toHaveValue(
      sample.tags.join(', '),
    )
  })

  it('calls useUpdateListing-shaped onSubmit with the patched fields when saved', async () => {
    const onSubmit = vi.fn()
    render(
      <EditListingDrawer
        open
        listing={sample}
        onClose={() => {}}
        onSubmit={onSubmit}
      />,
    )
    await flush()

    const titleInput = screen.getByTestId('listing-edit-field-title')
    fireEvent.change(titleInput, { target: { value: 'Yeni başlık · Ayvalık' } })

    const priceInput = screen.getByTestId('listing-edit-field-price')
    fireEvent.change(priceInput, { target: { value: '9500000' } })

    fireEvent.click(screen.getByTestId('listing-edit-submit'))
    await flush()

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenCalledWith({
      id: sample.id,
      patch: expect.objectContaining({
        title: 'Yeni başlık · Ayvalık',
        price: 9500000,
      }),
    })
    // status + tags should NOT appear because nothing changed.
    const arg = onSubmit.mock.calls[0][0] as {
      patch: Record<string, unknown>
    }
    expect(arg.patch.status).toBeUndefined()
    expect(arg.patch.tags).toBeUndefined()
  })

  it('calls onConfirm (useDeleteListing) when "Sil" is pressed on the confirm dialog', async () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    render(
      <DeleteListingDialog
        open
        id={sample.id}
        listingTitle={sample.title}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    )
    await flush()

    expect(screen.getByTestId('listing-delete-confirm')).toBeInTheDocument()
    expect(screen.getByTestId('listing-delete-cancel')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('listing-delete-confirm'))
    await flush()

    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onCancel).not.toHaveBeenCalled()
  })
})
