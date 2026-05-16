import { describe, it, expect } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useCreateCustomer, useCustomers, customerKeys } from '@landx/data'
import type { Customer } from '@landx/data'
import type { ReactNode } from 'react'
import { createElement } from 'react'

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client: qc, children })
  return { qc, wrapper }
}

describe('useCreateCustomer (optimistic create)', () => {
  it('prepends temp customer to cache immediately, settles successfully', async () => {
    const { qc, wrapper } = makeWrapper()

    const { result: listResult } = renderHook(() => useCustomers({}), { wrapper })
    await waitFor(() => expect(listResult.current.data).toBeDefined())
    const seedCount = listResult.current.data!.length

    const { result: mutationResult } = renderHook(() => useCreateCustomer(), { wrapper })

    act(() => {
      mutationResult.current.mutate({
        name: 'Yeni Müşteri',
        segment: 'Ilık',
        stage: 'İlk temas',
        value: 5000000,
        source: 'Sahibinden',
        owner: 'Ahmet',
        interestArea: 'Cunda',
      })
    })

    await waitFor(() => {
      const cached = qc.getQueryData<Customer[]>(customerKeys.list({}))
      expect(cached?.[0]?.id.startsWith('TEMP.')).toBe(true)
    })

    const optimistic = qc.getQueryData<Customer[]>(customerKeys.list({}))
    expect(optimistic).toBeDefined()
    expect(optimistic!.length).toBe(seedCount + 1)
    expect(optimistic![0].name).toBe('Yeni Müşteri')
    expect(optimistic![0].segment).toBe('Ilık')

    await waitFor(() => expect(mutationResult.current.isSuccess).toBe(true), { timeout: 1500 })
  })
})
