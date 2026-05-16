import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { DeleteListingDialog } from '@/components/listing-edit/DeleteListingDialog'

describe('DeleteListingDialog', () => {
  it('renders the confirmation message with the listing id/title when open', () => {
    render(
      <DeleteListingDialog
        open
        id="L-1234"
        listingTitle="Ayvalık · Cunda arsa"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    expect(screen.getByTestId('listing-delete-dialog')).toBeInTheDocument()
    expect(screen.getByText(/silinsin mi/i)).toBeInTheDocument()
    expect(screen.getByText(/geri alınamaz/i)).toBeInTheDocument()
    expect(screen.getByText(/Ayvalık · Cunda arsa/)).toBeInTheDocument()
  })

  it('does not render anything when open=false', () => {
    render(
      <DeleteListingDialog
        open={false}
        id="L-1234"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(screen.queryByTestId('listing-delete-dialog')).not.toBeInTheDocument()
  })

  it('calls onConfirm when "Sil" is clicked', () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    render(
      <DeleteListingDialog
        open
        id="L-1234"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    )
    fireEvent.click(screen.getByTestId('listing-delete-confirm'))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('calls onCancel when "İptal" is clicked', () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    render(
      <DeleteListingDialog
        open
        id="L-1234"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    )
    fireEvent.click(screen.getByTestId('listing-delete-cancel'))
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('calls onCancel when ESC is pressed', () => {
    const onCancel = vi.fn()
    render(
      <DeleteListingDialog
        open
        id="L-1234"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    )
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    })
    expect(onCancel).toHaveBeenCalled()
  })

  it('disables both buttons while pending', () => {
    render(
      <DeleteListingDialog
        open
        id="L-1234"
        pending
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    const confirm = screen.getByTestId('listing-delete-confirm') as HTMLButtonElement
    const cancel = screen.getByTestId('listing-delete-cancel') as HTMLButtonElement
    expect(confirm.disabled).toBe(true)
    expect(cancel.disabled).toBe(true)
    expect(confirm.textContent).toMatch(/Siliniyor/)
  })
})
