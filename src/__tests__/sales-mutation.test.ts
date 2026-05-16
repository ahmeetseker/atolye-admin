import { describe, it, expect } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useDeals, useDealMove, dealKeys } from '@landx/data'
import type { Deal } from '@landx/data'
import type { ReactNode } from 'react'
import { createElement } from 'react'

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: qc, children })
  return { qc, wrapper }
}

describe('useDealMove (optimistic mutation)', () => {
  it('cache is optimistically updated before server resolves', async () => {
    const { qc, wrapper } = makeWrapper()

    const { result: dealsResult } = renderHook(() => useDeals(), { wrapper })
    await waitFor(() => expect(dealsResult.current.data).toBeDefined())
    const firstDeal = dealsResult.current.data![0]
    const originalStage = firstDeal.stage
    const targetStage = originalStage === 'Tapu' ? 'İlk temas' : 'Tapu'

    const { result: mutationResult } = renderHook(() => useDealMove(), { wrapper })

    await act(async () => {
      mutationResult.current.mutate({ id: firstDeal.id, toStage: targetStage })
    })

    // Optimistic update visible in cache before server resolves
    const optimisticData = qc.getQueryData<Deal[]>(dealKeys.lists())
    const optimisticallyMovedDeal = optimisticData?.find((d) => d.id === firstDeal.id)
    expect(optimisticallyMovedDeal?.stage).toBe(targetStage)

    await waitFor(() => expect(mutationResult.current.isSuccess).toBe(true), { timeout: 1500 })

    await waitFor(() => {
      const settled = qc.getQueryData<Deal[]>(dealKeys.lists())
      expect(settled?.find((d) => d.id === firstDeal.id)?.stage).toBe(targetStage)
    })
  })

  it('multiple sequential moves all reflect in cache', async () => {
    const { qc, wrapper } = makeWrapper()
    const { result: dealsResult } = renderHook(() => useDeals(), { wrapper })
    await waitFor(() => expect(dealsResult.current.data).toBeDefined())
    const deal = dealsResult.current.data![0]
    const { result: mutationResult } = renderHook(() => useDealMove(), { wrapper })

    await act(async () => {
      mutationResult.current.mutate({ id: deal.id, toStage: 'Görüşme' })
    })
    await waitFor(() => expect(mutationResult.current.isSuccess).toBe(true), { timeout: 1500 })
    expect(qc.getQueryData<Deal[]>(dealKeys.lists())?.find((d) => d.id === deal.id)?.stage).toBe(
      'Görüşme',
    )

    await act(async () => {
      mutationResult.current.mutate({ id: deal.id, toStage: 'Teklif' })
    })
    await waitFor(() => expect(mutationResult.current.isSuccess).toBe(true), { timeout: 1500 })
    expect(qc.getQueryData<Deal[]>(dealKeys.lists())?.find((d) => d.id === deal.id)?.stage).toBe(
      'Teklif',
    )
  })
})
