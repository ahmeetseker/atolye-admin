---
name: tanstack-query
description: Use when writing data-fetching code, mutations, optimistic updates, or cache invalidation in sahibinden-v3. Covers TanStack Query v5 patterns, query key arrays, mutation lifecycle, and migrating from mock data to real API.
---

# TanStack Query v5 — Çalışma Kuralları

`QueryClient` modül-seviyesinde: `src/lib/query/client.ts`. Provider `main.tsx`'te
sarılı. **Yeni client oluşturma.**

---

## 1. Query Key — HER ZAMAN Array

```ts
// ✅
useQuery({ queryKey: ['listings'], queryFn: fetchListings })
useQuery({ queryKey: ['listings', { status, search }], queryFn: ... })
useQuery({ queryKey: ['listing', id], queryFn: () => fetchListing(id) })

// ❌ String
useQuery({ queryKey: 'listings', queryFn: fetchListings })
```

**Hierarchy patterns** (cache invalidation kolaylığı için):
- `['listings']` → tüm listing query'leri
- `['listings', { status: 'Aktif' }]` → spesifik filter
- `['listing', id]` → tekil kayıt

`queryClient.invalidateQueries({ queryKey: ['listings'] })` üst düzeyi invalidate eder, tüm alt çocuklara yayılır.

---

## 2. Custom Hook Pattern (önerilen)

Component'lerde direkt `useQuery` yazma — custom hook'a sar. Reusable, test edilebilir, query key duplikasyonu önler.

```ts
// src/lib/query/listings.ts
import { useQuery } from '@tanstack/react-query'
import { LISTINGS } from '@/lib/mock/listings'
import type { Listing, ListingStatus } from '@/lib/mock/types'

const listingKeys = {
  all: ['listings'] as const,
  filtered: (filters: { status?: ListingStatus; search?: string }) =>
    [...listingKeys.all, filters] as const,
  detail: (id: string) => ['listing', id] as const,
}

export function useListings(filters: { status?: ListingStatus; search?: string } = {}) {
  return useQuery({
    queryKey: listingKeys.filtered(filters),
    queryFn: async () => {
      // Faz 3'te API: const r = await fetch(`/api/listings?${qs}`); return r.json()
      // Şimdi: mock'tan filter et
      return LISTINGS.filter(/* ... */)
    },
  })
}

export function useListing(id: string) {
  return useQuery({
    queryKey: listingKeys.detail(id),
    queryFn: () => Promise.resolve(LISTINGS.find((l) => l.id === id)),
    enabled: !!id,
  })
}
```

Component:
```tsx
const { data: listings = [], isLoading, error } = useListings({ status: 'Aktif' })
```

---

## 3. Default Config (zaten kurulu)

`src/lib/query/client.ts`:
- `staleTime: 60_000` — 1 dk içinde refetch yok
- `gcTime: 300_000` — 5 dk cache (eski ad: cacheTime)
- `retry: 1` — bir kez yeniden dene
- `refetchOnWindowFocus: false` — sahibinden UX'i için pencere değişiminde refetch spam'i istemiyoruz
- `refetchOnReconnect: 'always'` — internet geri gelince refetch
- `mutations.retry: 0` — idempotent değilse riski yok

**Override gerekiyorsa** spesifik query'de:
```ts
useQuery({ queryKey, queryFn, staleTime: Infinity })  // veri hiç bayatlamaz
useQuery({ queryKey, queryFn, refetchInterval: 5_000 })  // 5 sn polling
```

---

## 4. Mutation Pattern

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query'

export function useCreateListing() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: NewListing) => {
      const r = await fetch('/api/listings', { method: 'POST', body: JSON.stringify(data) })
      if (!r.ok) throw new Error('Listing oluşturulamadı')
      return r.json() as Promise<Listing>
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['listings'] })
    },
    onError: (err) => {
      // Toast/snackbar göster
      console.error(err)
    },
  })
}
```

Component:
```tsx
const { mutate, isPending } = useCreateListing()
<button onClick={() => mutate(data)} disabled={isPending}>Kaydet</button>
```

---

## 5. Optimistic Update — UI hemen güncellensin

```ts
useMutation({
  mutationFn: updateListingStatus,
  onMutate: async (vars) => {
    await qc.cancelQueries({ queryKey: ['listings'] })
    const prev = qc.getQueryData<Listing[]>(['listings'])
    qc.setQueryData<Listing[]>(['listings'], (old = []) =>
      old.map((l) => (l.id === vars.id ? { ...l, status: vars.status } : l)),
    )
    return { prev }  // rollback context
  },
  onError: (_err, _vars, ctx) => {
    if (ctx?.prev) qc.setQueryData(['listings'], ctx.prev)
  },
  onSettled: () => qc.invalidateQueries({ queryKey: ['listings'] }),
})
```

React 19'da daha basit yol: `useOptimistic` — bkz. `react-19` skill.

---

## 6. Infinite Query (sonsuz scroll / sayfalı liste)

```ts
const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
  queryKey: ['listings', 'infinite'],
  queryFn: ({ pageParam = 0 }) => fetchListingsPage(pageParam),
  getNextPageParam: (last) => last.nextCursor ?? undefined,
  initialPageParam: 0,
})
```

Faz 2 Listings'te 100+ kayda çıkarsak gerekir.

---

## 7. Loading / Error UI

```tsx
if (isLoading) return <Skeleton />
if (error) return <ErrorState onRetry={refetch} />
if (data.length === 0) return <EmptyState />
return <DataTable rows={data} />
```

**Skeleton'ları placeholder data ile değiştirme** — flicker'ı önler:
```ts
useQuery({ queryKey, queryFn, placeholderData: keepPreviousData })
```

`keepPreviousData` Faz 2 filter'lar için altın değerinde — filter değişirken eski liste kalır, üstüne loading overlay binmez.

---

## 8. DevTools

`main.tsx`'te `lazy + Suspense`'la sadece dev'de yüklendi. Browser sol-alt köşede flotting butonla aç → cache'i, query state'lerini, retry zincirini gör.

**Production build'de yok**, kullanıcı görmez.

---

## 9. Server Components & SSR — KULLANILMIYOR

Vite SPA'dayız. `hydrate`, `dehydrate`, `prefetchQuery` server-side yok. Tüm fetching client-side.

---

## 10. Mock → API Migrasyonu (Faz 3+)

Şu an `routes/listings.tsx` direkt `LISTINGS` import ediyor. Faz 3'te:

```diff
- import { LISTINGS } from '@/lib/mock/listings'
+ import { useListings } from '@/lib/query/listings'

  export function Listings() {
-   const listings = LISTINGS
+   const { data: listings = [], isLoading } = useListings({ status, search })
```

`useListings` hook'u içinde `fetch('/api/listings?...')` çağrısı.

---

## Anti-Patterns

- ❌ Query key string concat: `queryKey: \`listings-${id}\`` → array kullan
- ❌ Component içinde `new QueryClient()` → modül seviyesi
- ❌ `useEffect` ile fetch → `useQuery`
- ❌ `useState + fetch` ile manuel loading state → `useQuery` zaten verir
- ❌ Her component'te aynı query'i tekrar yazma → custom hook'a sar
- ❌ Mutation sonrası manuel state update → `invalidateQueries` veya `setQueryData`
- ❌ `enabled: false` ile sürekli query stop → query'i hiç render etme, conditional rendering

---

## Hızlı Kontrol Listesi

Yeni data fetch / mutation eklerken:
- [ ] Query key array mı?
- [ ] `src/lib/query/<resource>.ts` içinde custom hook mu yazıyorum?
- [ ] Hook key'leri tek bir `<resource>Keys` factory'den mi geliyor?
- [ ] Loading / error / empty state'leri component'te handle ediyor muyum?
- [ ] Mutation sonrası ilgili query'i invalidate ediyor muyum?
- [ ] Optimistic update gerekiyorsa `useOptimistic` veya `onMutate` kullanıyor muyum?
