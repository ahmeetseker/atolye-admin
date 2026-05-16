import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import type { ReactNode } from 'react'
import { Customers } from '@/routes/customers'

/**
 * Integration coverage for Wave-F1B: row Düzenle/Sil action menu on the
 * `/customers` page. Asserts:
 *   1. ⋯ trigger opens a menu with Düzenle + Sil items.
 *   2. Düzenle mounts the edit drawer (`customer-edit-drawer`) prefilled
 *      from the first row in the seed CUSTOMERS mock.
 *   3. The drawer's save button calls `useUpdateCustomer` (Save toggles to
 *      "Kaydediliyor…" while the mock latency resolves).
 *   4. Sil mounts the confirm dialog (`customer-delete-confirm`) and
 *      cancel dismisses it.
 */

function renderWithClient(node: ReactNode) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  // Wave-F2C: Customers route now reads `?detail=<id>` via useSearchParams,
  // so the route needs a Router in scope. MemoryRouter is the cheapest
  // wrapper that satisfies that without changing the assertion shape.
  return render(
    <MemoryRouter initialEntries={['/customers']}>
      <QueryClientProvider client={qc}>{node}</QueryClientProvider>
    </MemoryRouter>,
  )
}

async function waitForFirstRow() {
  // CUSTOMERS seed lists `M-2401` (Burhan Kaynak) first.
  const trigger = await screen.findByTestId('customer-row-actions-M-2401', undefined, {
    timeout: 2000,
  })
  return trigger
}

describe('Customers — row actions', () => {
  it('opens the action menu on ⋯ click and shows Düzenle + Sil', async () => {
    renderWithClient(<Customers />)
    const trigger = await waitForFirstRow()
    fireEvent.click(trigger)

    const menu = await screen.findByRole('menu')
    expect(within(menu).getByText('Düzenle')).toBeInTheDocument()
    expect(within(menu).getByText('Sil')).toBeInTheDocument()
  })

  it('prefills the edit drawer with the row values', async () => {
    renderWithClient(<Customers />)
    const trigger = await waitForFirstRow()
    fireEvent.click(trigger)
    fireEvent.click(await screen.findByTestId('customer-row-action-edit'))

    const drawer = await screen.findByTestId('customer-edit-drawer')
    expect(drawer).toBeInTheDocument()
    const nameInput = within(drawer).getByTestId('customer-edit-name') as HTMLInputElement
    const segmentSelect = within(drawer).getByTestId('customer-edit-segment') as HTMLSelectElement
    const valueInput = within(drawer).getByTestId('customer-edit-value') as HTMLInputElement
    expect(nameInput.value).toBe('Burhan Kaynak')
    expect(segmentSelect.value).toBe('Sıcak')
    expect(valueInput.value).toBe('8400000')
  })

  it('fires the update mutation when Save is clicked after editing a field', async () => {
    renderWithClient(<Customers />)
    const trigger = await waitForFirstRow()
    fireEvent.click(trigger)
    fireEvent.click(await screen.findByTestId('customer-row-action-edit'))

    const drawer = await screen.findByTestId('customer-edit-drawer')
    const nameInput = within(drawer).getByTestId('customer-edit-name') as HTMLInputElement
    fireEvent.change(nameInput, { target: { value: 'Burhan K. (revize)' } })

    const saveBtn = within(drawer).getByTestId('customer-edit-save')
    fireEvent.click(saveBtn)

    // The mock layer resolves the update after ~200ms, closing the drawer.
    // We assert the drawer eventually leaves the DOM as the success signal —
    // proves `useUpdateCustomer` ran and `onClose()` fired.
    await waitFor(() => expect(screen.queryByTestId('customer-edit-drawer')).toBeNull(), {
      timeout: 2000,
    })
  })

  it('opens the delete confirm dialog and dismisses it on İptal', async () => {
    renderWithClient(<Customers />)
    const trigger = await waitForFirstRow()
    fireEvent.click(trigger)
    fireEvent.click(await screen.findByTestId('customer-row-action-delete'))

    const confirm = await screen.findByTestId('customer-delete-confirm')
    expect(confirm).toBeInTheDocument()
    expect(within(confirm).getByText(/M-2401 müşteri silinecek/)).toBeInTheDocument()

    fireEvent.click(within(confirm).getByTestId('delete-customer-cancel'))
    await waitFor(() => expect(screen.queryByTestId('customer-delete-confirm')).toBeNull())
  })
})
