import { describe, it, expect } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useCreateListing, useListings, listingKeys } from '@landx/data'
import type { Listing } from '@landx/data'
import type { ReactNode } from 'react'
import { createElement } from 'react'

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client: qc, children })
  return { qc, wrapper }
}

describe('useCreateListing (optimistic create)', () => {
  it('prepends temp listing to cache immediately, replaces on settle', async () => {
    const { qc, wrapper } = makeWrapper()

    // Seed cache
    const { result: listResult } = renderHook(() => useListings({}), { wrapper })
    await waitFor(() => expect(listResult.current.data).toBeDefined())
    const seedCount = listResult.current.data!.length

    const { result: mutationResult } = renderHook(() => useCreateListing(), { wrapper })

    act(() => {
      mutationResult.current.mutate({
        title: 'Test ilan',
        city: 'Balıkesir',
        district: 'Ayvalık · Cunda',
        type: 'İmarlı',
        size: 1000,
        price: 5000000,
      })
    })

    // onMutate runs `await cancelQueries(...)` before the optimistic setQueryData,
    // so wait until the temp entry appears at the top of the cached list.
    await waitFor(() => {
      const cached = qc.getQueryData<Listing[]>(listingKeys.list({}))
      expect(cached?.[0]?.id.startsWith('TEMP.')).toBe(true)
    })

    const optimistic = qc.getQueryData<Listing[]>(listingKeys.list({}))
    expect(optimistic).toBeDefined()
    expect(optimistic!.length).toBe(seedCount + 1)
    expect(optimistic![0].title).toBe('Test ilan')
    expect(optimistic![0].id.startsWith('TEMP.')).toBe(true)

    await waitFor(() => expect(mutationResult.current.isSuccess).toBe(true), { timeout: 1500 })
  })
})
