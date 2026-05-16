import { describe, it, expect, vi } from 'vitest'
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
  act,
} from '@testing-library/react'
import { renderHook, waitFor as waitForHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { createElement, type ReactNode } from 'react'
import { Sales } from '@/routes/sales'
import {
  useCreateDeal,
  useUpdateDeal,
  useDeleteDeal,
  useDeals,
  dealKeys,
} from '@landx/data'
import type { Deal } from '@landx/data'

/**
 * F3A — admin sales CRUD UI coverage. Asserts the Kanban → drawer/dialog/modal
 * pipeline works end-to-end plus the create/update/delete hooks fall back to
 * the synthesised mock path (api-client only exposes list + move for /deals).
 */

function makeClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
}

function renderSales(initialEntries = ['/sales']) {
  const qc = makeClient()
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <QueryClientProvider client={qc}>
        <Sales />
      </QueryClientProvider>
    </MemoryRouter>,
  )
}

function hookWrapper() {
  const qc = makeClient()
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: qc, children })
  return { qc, wrapper }
}

async function findFirstCard() {
  // DEALS seed: D-2401 (Burhan Kaynak) is the first entry. Wait until
  // the Kanban hydrates from useDeals().
  return screen.findByTestId('deal-card-D-2401', undefined, { timeout: 2500 })
}

describe('Sales CRUD UI', () => {
  it('opens DealDetailDrawer when a card is clicked', async () => {
    renderSales()
    const card = await findFirstCard()
    fireEvent.click(card)

    const drawer = await screen.findByTestId('deal-detail-drawer')
    expect(drawer).toBeInTheDocument()
    // Customer name appears twice (section heading + Kişi row), so getAllByText.
    expect(within(drawer).getAllByText('Burhan Kaynak').length).toBeGreaterThan(0)
    expect(within(drawer).getAllByText(/D-2401/).length).toBeGreaterThan(0)
  })

  it('submits the edit drawer and the form closes after the mock mutation resolves', async () => {
    renderSales()
    await findFirstCard()

    // Open the row actions menu and pick Düzenle.
    fireEvent.click(screen.getByTestId('deal-row-actions-D-2401'))
    fireEvent.click(await screen.findByTestId('deal-row-edit-D-2401'))

    const drawer = await screen.findByTestId('deal-edit-drawer')
    const valueInput = within(drawer).getByTestId(
      'deal-edit-field-value',
    ) as HTMLInputElement
    fireEvent.change(valueInput, { target: { value: '6500000' } })

    fireEvent.click(within(drawer).getByTestId('deal-edit-submit'))

    // mockAsync resolves in ~200ms; the drawer should unmount once useUpdateDeal
    // settles and the route clears editTarget.
    await waitFor(
      () => expect(screen.queryByTestId('deal-edit-drawer')).toBeNull(),
      { timeout: 2000 },
    )
  })

  it('confirms delete via DeleteDealDialog and tears down the dialog', async () => {
    renderSales()
    await findFirstCard()

    fireEvent.click(screen.getByTestId('deal-row-actions-D-2401'))
    fireEvent.click(await screen.findByTestId('deal-row-delete-D-2401'))

    const dialog = await screen.findByTestId('deal-delete-dialog')
    expect(dialog).toBeInTheDocument()
    expect(within(dialog).getByText(/Burhan Kaynak/)).toBeInTheDocument()

    fireEvent.click(within(dialog).getByTestId('deal-delete-confirm'))

    await waitFor(
      () => expect(screen.queryByTestId('deal-delete-dialog')).toBeNull(),
      { timeout: 2000 },
    )
  })

  it('creates a new deal via the "Yeni fırsat" modal', async () => {
    renderSales()
    await findFirstCard()

    fireEvent.click(screen.getByTestId('deal-new-open'))
    const modal = await screen.findByTestId('deal-new-modal')

    fireEvent.change(within(modal).getByTestId('deal-new-field-customer'), {
      target: { value: 'Test Müşteri' },
    })
    fireEvent.change(within(modal).getByTestId('deal-new-field-value'), {
      target: { value: '4500000' },
    })

    fireEvent.click(within(modal).getByTestId('deal-new-submit'))

    await waitFor(
      () => expect(screen.queryByTestId('deal-new-modal')).toBeNull(),
      { timeout: 2000 },
    )
  })

  it('useCreateDeal + useUpdateDeal + useDeleteDeal mutate the cache via the mock path', async () => {
    const { qc, wrapper } = hookWrapper()

    // Hydrate the list cache first.
    const { result: listResult } = renderHook(() => useDeals(), { wrapper })
    await waitForHook(() => expect(listResult.current.data).toBeDefined())
    const initialCount = listResult.current.data!.length
    expect(initialCount).toBeGreaterThan(0)

    // Create
    const { result: createResult } = renderHook(() => useCreateDeal(), {
      wrapper,
    })
    await act(async () => {
      createResult.current.mutate({
        customerName: 'F3A Test',
        listingTitle: 'F3A demo arsa',
        value: 1234567,
        owner: 'Ahmet',
      })
    })
    // Optimistic insert visible immediately.
    expect(
      (qc.getQueryData<Deal[]>(dealKeys.lists()) ?? []).length,
    ).toBeGreaterThan(initialCount)
    await waitForHook(
      () => expect(createResult.current.isSuccess).toBe(true),
      { timeout: 1500 },
    )

    // Update — pick the deal we know is in the seed.
    const { result: updateResult } = renderHook(() => useUpdateDeal(), {
      wrapper,
    })
    await act(async () => {
      updateResult.current.mutate({
        id: 'D-2401',
        patch: { value: 9_999_000, status: 'Risk' },
      })
    })
    await waitForHook(
      () => expect(updateResult.current.isSuccess).toBe(true),
      { timeout: 1500 },
    )
    const updated = qc
      .getQueryData<Deal[]>(dealKeys.lists())
      ?.find((d) => d.id === 'D-2401')
    expect(updated?.value).toBe(9_999_000)
    expect(updated?.status).toBe('Risk')

    // Delete
    const { result: deleteResult } = renderHook(() => useDeleteDeal(), {
      wrapper,
    })
    await act(async () => {
      deleteResult.current.mutate('D-2401')
    })
    await waitForHook(
      () => expect(deleteResult.current.isSuccess).toBe(true),
      { timeout: 1500 },
    )
    const after = qc.getQueryData<Deal[]>(dealKeys.lists()) ?? []
    expect(after.find((d) => d.id === 'D-2401')).toBeUndefined()
  })

  it('DealDetailDrawer renders the deal-card click path with ?detail URL state', async () => {
    // Mounting straight onto /sales?detail=D-2398 should auto-open the drawer
    // since the route reads detailId from useSearchParams.
    renderSales(['/sales?detail=D-2398'])
    const drawer = await screen.findByTestId('deal-detail-drawer', undefined, {
      timeout: 2500,
    })
    expect(within(drawer).getAllByText('Selin Aksoy').length).toBeGreaterThan(0)

    // The close button should drop the param + unmount the drawer.
    fireEvent.click(within(drawer).getByTestId('deal-detail-close'))
    await waitFor(() =>
      expect(screen.queryByTestId('deal-detail-drawer')).toBeNull(),
    )
  })
})

// Silence framer-motion's strict warnings during this suite (mirrors other
// drawer tests in the repo).
void vi
