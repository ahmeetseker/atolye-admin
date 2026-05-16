---
name: react-19
description: Use when writing or editing React 19 components, hooks, or state logic in sahibinden-v3. Covers new hooks (useTransition, useOptimistic, useActionState, useFormStatus, use()), ref-as-prop, useEffect anti-patterns, performance (INP < 200ms), and component patterns.
---

# React 19 — Çalışma Kuralları

Bu dosya React 19 spesifik patterns ve **anti-patterns**'leri içerir. Genel
tasarım yönergeleri için **CLAUDE.md** ve **SPEC.md**'ye bak.

---

## 1. useEffect — En Sık Yapılan Hatalar

**`useEffect` "side effect" değil, "harici sisteme senkronizasyon" demektir.**
Aşağıdaki durumlarda `useEffect` KULLANMA:

| ❌ Yanlış kullanım | ✅ Doğru yöntem |
|--------------------|------------------|
| Veri fetch | **TanStack Query** (`useQuery`) — bkz. `tanstack-query` skill |
| Prop'a göre state hesaplama | **Render sırasında derive et**: `const filtered = useMemo(() => filter(data, q), [data, q])` |
| State değişiminde başka state güncelleme | **Event handler içinde** yap, veya derived state |
| Parent'a değer iletmek | **Callback prop** ile event-driven yap |
| `setTimeout` ile zamanlanmış işlemler | Çoğunlukla event handler'da olmalı |
| Component mount'unda 1 kez fetch (DEV'de 2 kez çalışır) | TanStack Query — cache, dedupe, retry hep otomatik |

`useEffect` SADECE şunlar için doğru:
- Browser API'a abone olma (`window.addEventListener`, `ResizeObserver`, `IntersectionObserver`, `matchMedia`)
- Manual DOM manipulation (3. parti library — Leaflet, Maplibre vs.)
- Analytics event publish (sayfa görüntülenme, vb.)
- Cleanup zorunlu işler (`setInterval`, WebSocket, AbortController)

**Cleanup yazmadan `useEffect` kullanma.** Subscribe ettiysen unsubscribe et.

---

## 2. useTransition — Yeni Standart

**INP > 100ms olan her state değişimi için `useTransition` kullan.**
React state setter'ını `startTransition` içine koy → React reconciliation'ı arka plana atar, click handler hemen geri döner, kullanıcı bekleme hissetmez.

```ts
const [isPending, startTransition] = useTransition()

onClick={() => {
  startTransition(() => setTab(key))  // ✅ click anında paint, render arka planda
}}
```

### Ne ZAMAN kullan:
- Tab switching, accordion expand, modal/drawer open
- Liste filtreleme/sıralama (büyük listelerde)
- Sayfa içi navigation (route değişimi değil, page-internal state)
- Heavy chart re-render tetikleyen filter değişimi

### Ne ZAMAN KULLANMA:
- ❌ Text input `value`/`onChange` — anlık yanıt gerekir, transition gecikmesi UX'i bozar
- ❌ Drag handlers, slider — frame-perfect tepki şart
- ❌ Toggle/checkbox — zaten <16ms, transition gereksiz overhead

### React 19'da YENI: async transition
`startTransition`'a `async` function geçebilirsin — "Actions" denir:

```ts
startTransition(async () => {
  await saveListing(data)       // bu sürede isPending=true
  setStatus('saved')
})
```

`useTransition`'ın 1. dönüş değeri `isPending` → loading state'i bu boolean ile göster.

---

## 3. useOptimistic — UI Hızını "Yalan" ile Artır

Mutation yapan herhangi bir aksiyon için:

```ts
const [optimisticListings, addOptimistic] = useOptimistic(
  listings,
  (state, newListing: Listing) => [...state, newListing],
)

async function handleAdd(listing: Listing) {
  addOptimistic(listing)           // UI hemen güncellenir
  await createListing(listing)     // arka planda kaydedilir
}
```

Sales (kaparo verme), Customers (segment değiştirme), Messages (mesaj gönderme) — hep bu pattern.

---

## 4. useActionState + useFormStatus — Form Pattern

`<form action={fn}>` ile birlikte:

```ts
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'

function ListingForm() {
  const [state, formAction, isPending] = useActionState(
    async (prev, formData: FormData) => {
      const result = await createListing(Object.fromEntries(formData))
      return result.success ? { ok: true } : { ok: false, error: result.error }
    },
    { ok: null }
  )
  return <form action={formAction}><SubmitBtn /></form>
}

function SubmitBtn() {
  const { pending } = useFormStatus()   // parent form'un state'ini okur
  return <button disabled={pending}>{pending ? 'Kaydediliyor…' : 'Kaydet'}</button>
}
```

Faz 5 Profile + Faz 3 Sales kaparo form'larında bunu kullan.

---

## 5. `use()` Hook — Conditional + Promise Unwrap

`use()` **conditional** çağrılabilen tek hook. Promise veya Context unwrap eder:

```ts
function ListingDetail({ promise }: { promise: Promise<Listing> }) {
  const listing = use(promise)  // Suspense ile entegre
  return <div>{listing.title}</div>
}
```

Çoğu zaman `useQuery`'nin sonucunu kullanırız — `use()`'a direkt ihtiyacımız az olur. Ama Suspense + streaming yaparsak (Faz 5+), şart.

---

## 6. Ref as Prop — `forwardRef` ÖLDÜ

React 19'da `forwardRef` artık gereksiz. `ref`'i direkt prop olarak al:

```ts
// ❌ Eski
const Input = forwardRef<HTMLInputElement, Props>((props, ref) => (
  <input ref={ref} {...props} />
))

// ✅ Yeni (React 19)
function Input({ ref, ...props }: Props & { ref?: Ref<HTMLInputElement> }) {
  return <input ref={ref} {...props} />
}
```

Yeni component yazarken `forwardRef` yazma. Mevcutları yavaş yavaş geçirebiliriz ama refactor zorunlu değil.

---

## 7. Server Components — KULLANILMIYOR

Vite SPA'dayız, **server components yok**. `'use client'` direktifi yazma — Next.js'e özgü. Async component yazma — Vite reject eder.

---

## 8. State Yönetimi

### Lokal state önce
Çoğu state component-local. `useState` ile başla.

### URL state
`useSearchParams` (React Router) → filtre, sayfa, sort gibi paylaşılabilir state. Önce burası, sonra global.

### Server state
**TanStack Query.** Mock data dahil, `useQuery` ile sar — Faz 3'te kolay swap.

### Global client state
**Eklemeden önce sor.** Çoğu durumda Context yeter. Zustand/Jotai sadece performance ölçtükten sonra.

---

## 9. Performance Hiyerarşisi

Re-render sorunu çözmek için sırayla dene:

1. **Component'i böl** — küçük parçalar daha az re-render eder
2. **State'i aşağıya it** — değişen state, kullanıldığı en küçük component'te dursun
3. **`useTransition`** — yavaş re-render'ı arka plana at
4. **`useDeferredValue`** — input value'sunu lag'le, ağır render geride kalsın
5. **`React.memo`** — child aynı props'la sürekli render oluyorsa
6. **`useMemo` / `useCallback`** — sadece referans stability kritikse (memo child'a prop geçerken)
7. **CSS `contain`** — backdrop-filter olan yerlerde browser scope'unu daralt

**Önce ölç, sonra optimize et.** Chrome DevTools Performance > Record > Tıkla > Stop. INP <200ms = yeşil.

---

## 10. Hook Dependency Array — Lint Uy

ESLint `react-hooks/exhaustive-deps` kuralı aktif (sahibinden-v2'den miras). **DİSABLE ETME.**

Tüm değişken referansları array'de olmalı. Eğer `useEffect` her render'da çalışıyor ve sorun yaratıyorsa:
- Dependency'i `useMemo`/`useCallback` ile stable yap
- VEYA `useEffect`'i baştan kaldır (madde 1)

`// eslint-disable-next-line react-hooks/exhaustive-deps` yazıyorsan **dur ve sor**.

---

## 11. Naming Konvansiyonları

- **Component**: PascalCase, dosya kebab-case (`module-card.tsx` → `export function ModuleCard()`)
- **Hook**: `use*` prefix, camelCase (`useCatalog`, `useDebounce`)
- **Event handler**: `handle*` prefix (`handleSubmit`, `handleSelect`)
- **Boolean state**: `is*` / `has*` / `should*` (`isPending`, `hasError`, `shouldRender`)
- **Setter**: React standardı (`setX`)

---

## 12. Props Tipleme

```ts
// ✅ Inline interface yerine type
type Props = {
  title: string
  onSelect?: (id: string) => void
  children?: ReactNode
}

// ✅ Children rendering
function Foo({ children }: Props) {
  return <div>{children}</div>
}

// ✅ Spread + own
function Btn({ className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={cn('base', className)} {...rest} />
}
```

`React.FC` KULLANMA — gereksiz, `children` zorunlu yapar, generic'i bozar.

---

## 13. Liste Render

`key`: **stable + unique**. Index kullanma (sıralama değişirse render bug'ı verir).

```ts
// ✅ ID varsa
{listings.map((l) => <Card key={l.id} listing={l} />)}

// ✅ Stable string yoksa, türetilebilir bir kombinasyon
{messages.map((m) => <Msg key={`${m.threadId}-${m.timestamp}`} msg={m} />)}

// ❌ Asla
{items.map((item, i) => <X key={i} {...item} />)}
```

---

## 14. Conditional Render

`&&` operatörünün **falsy değerleri** dikkat — `0` ekrana yazılır:

```ts
{items.length && <List />}        // ❌ items.length === 0 ise "0" yazar
{items.length > 0 && <List />}    // ✅
{items.length ? <List /> : null}  // ✅
```

---

## 15. Error Boundary

Async error'lar Error Boundary tarafından yakalanmaz — `useQuery`'nin `error` state'ini ya da `useActionState`'in `state.error`'ını handle et. Sync render error'ları için her route'a `errorElement` koy (Faz 5'te).

---

## Hızlı Kontrol Listesi

Yeni component yazarken kendine sor:
- [ ] `useEffect` gerçekten harici sistem mi? Yoksa derived state mi?
- [ ] State setter ≥ 50ms iş tetikliyorsa `useTransition`?
- [ ] Form yazıyorsam `useActionState` + `useFormStatus`?
- [ ] Mutation varsa `useOptimistic`?
- [ ] `ref` gerekiyorsa prop olarak alıyor muyum (forwardRef değil)?
- [ ] Liste key'i stable mı?
- [ ] `&&` operatöründe falsy `0` riski var mı?
