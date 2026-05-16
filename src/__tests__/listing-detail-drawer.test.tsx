import { describe, it, expect, vi } from 'vitest'
import { useState } from 'react'
import {
  render,
  screen,
  fireEvent,
  waitForElementToBeRemoved,
} from '@testing-library/react'
import { MemoryRouter, useSearchParams, Routes, Route } from 'react-router'
import { ListingDetailDrawer } from '@/components/listing-edit/ListingDetailDrawer'
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

describe('ListingDetailDrawer', () => {
  it('opens with prefilled listing data (all sections + fields visible)', () => {
    render(
      <ListingDetailDrawer
        open
        listing={sample}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    )

    expect(screen.getByTestId('listing-detail-drawer')).toBeInTheDocument()
    expect(screen.getByText('Test arsa · Ayvalık')).toBeInTheDocument()
    expect(screen.getByText('L-1234')).toBeInTheDocument()
    expect(screen.getByText('Balıkesir')).toBeInTheDocument()
    expect(screen.getByText('Ayvalık · Cunda')).toBeInTheDocument()
    expect(screen.getByText('deniz manzaralı')).toBeInTheDocument()
    expect(screen.getByText('yola cephe')).toBeInTheDocument()
    expect(screen.getByText(/39\.32000, 26\.69000/)).toBeInTheDocument()
  })

  it('emits onEdit with the listing when "Düzenle" is clicked', () => {
    const onEdit = vi.fn()
    render(
      <ListingDetailDrawer
        open
        listing={sample}
        onClose={vi.fn()}
        onEdit={onEdit}
        onDelete={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByTestId('listing-detail-edit'))
    expect(onEdit).toHaveBeenCalledTimes(1)
    expect(onEdit).toHaveBeenCalledWith(sample)
  })

  it('emits onDelete with the listing when "Sil" is clicked', () => {
    const onDelete = vi.fn()
    render(
      <ListingDetailDrawer
        open
        listing={sample}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDelete={onDelete}
      />,
    )

    fireEvent.click(screen.getByTestId('listing-detail-delete'))
    expect(onDelete).toHaveBeenCalledTimes(1)
    expect(onDelete).toHaveBeenCalledWith(sample)
  })

  it('closes (and parent URL drops ?detail) when ✕ button is clicked', async () => {
    function Harness() {
      const [params, setParams] = useSearchParams()
      const [listing, setListing] = useState<Listing | null>(sample)
      const detailId = params.get('detail')

      return (
        <>
          <div data-testid="current-search">{params.toString()}</div>
          <ListingDetailDrawer
            open={detailId === sample.id && listing !== null}
            listing={listing}
            onClose={() => {
              setListing(null)
              setParams(
                (prev) => {
                  const next = new URLSearchParams(prev)
                  next.delete('detail')
                  return next
                },
                { replace: true },
              )
            }}
            onEdit={vi.fn()}
            onDelete={vi.fn()}
          />
        </>
      )
    }

    render(
      <MemoryRouter initialEntries={['/listings?detail=L-1234']}>
        <Routes>
          <Route path="/listings" element={<Harness />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByTestId('current-search').textContent).toBe('detail=L-1234')
    const drawer = screen.getByTestId('listing-detail-drawer')
    expect(drawer).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('listing-detail-close'))

    // URL should drop ?detail immediately (drawer DOM is removed after the
    // framer-motion exit animation completes).
    expect(screen.getByTestId('current-search').textContent).toBe('')
    await waitForElementToBeRemoved(() =>
      screen.queryByTestId('listing-detail-drawer'),
    )
  })

  it('does not render when open=false', () => {
    render(
      <ListingDetailDrawer
        open={false}
        listing={sample}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    )
    expect(screen.queryByTestId('listing-detail-drawer')).not.toBeInTheDocument()
  })
})
