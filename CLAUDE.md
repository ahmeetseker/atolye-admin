# Sahibinden v3 — Çalışma Kuralları

Bu dosya Claude'un her oturuma giriş aldığı kalıcı bağlamdır. **Kısa tutuluyor**
— detay aşağıdaki kaynaklarda:

- **Tasarım & build planı:** `@SPEC.md`
- **Sahibinden v2 tasarım yönergeleri (palet/font/glass/yasaklar):** `@../sahibinden-v2-main-panel/design.md`
- **React 19 patterns (hooks, performance, anti-patterns):** `@.claude/skills/react-19/SKILL.md`
- **TanStack Query (data fetching, mutations, cache):** `@.claude/skills/tanstack-query/SKILL.md`

Skill dosyaları **on-demand** yüklenir — sen ilgili konuda iş yapıyorsan Claude
otomatik açar. CLAUDE.md sadece **her zaman bilinmesi gereken**leri içerir.

---

## Komutlar (Claude'un bilemeyeceği)

```bash
npm run dev          # Vite dev server (genelde :5174, 5173 doluysa)
npm run build        # tsc -b + vite build (lint zorunlu)
npm run preview      # Production build önizleme
npx tsc -b           # Sadece typecheck (exit 0 zorunlu)
npm test             # Vitest run
npm run test:watch   # Vitest watch
```

Veri katmanı: `src/lib/mock/*.ts` (mock). API entegrasyonu Faz 3+ — TanStack Query kullanılacak.

---

## Stack

- React 19 + TypeScript 6 (strict, `verbatimModuleSyntax`, `erasableSyntaxOnly`, `noUnusedLocals`)
- Vite 8 + Tailwind v4 (`@theme inline`, **`tailwind.config.*` YOK**)
- React Router v7 (library mode, `createBrowserRouter`)
- framer-motion v12 · recharts v3 · lucide-react
- **TanStack Query v5** (data layer) + DevTools (yalnız dev)
- Vitest + @testing-library/react

---

## 🔴 Yasaklar (İHLAL DURUMUNDA DURDUR, KULLANICIYA SOR)

1. **`bg-white` / `bg-black` / `#000` direkt kullanma.** Token kullan (`bg-background`, `bg-card`, `bg-foreground`).
2. **`text-gray-*` yasak.** `text-muted-foreground` kullan.
3. **`sky-*`, `indigo-*`, `blue-*`, `teal-*` UI vurgusu olarak kullanma.** (Veri görselinde — chart line/dot — sınırlı izinli.)
4. **Italik gövde metninde yasak.** `italic` sadece `font-serif` başlık içindeki **vurgu kelimesinde** kullanılır (`<em className="font-serif italic font-light">kelime</em>`).
5. **Font override:** sadece `font-sans` (default), `font-serif`, `font-mono`. Başka değer yazma.
6. **Üç koyu yüzey üst üste koyma.** (Card > Card > Card yığma — açık zemin nefes alsın.)
7. **Dark mod `--background` lightness < 20% yasak.** Mağara hissi olmaz.
8. **`backdrop-filter` değerlerini yeniden icat etme.** `--glass-tint`, `--glass-shadow` vb. değişkenleri kullan.
9. **Border radius:** sadece `rounded-xl` (12), `rounded-2xl` (16), `rounded-lg` (8), `rounded-full`. Concentric token'lar (`r-shell`/`r-surface`/`r-container`/`r-control`/`r-chip`) opt-in.

Bu yasakların kaynağı: `../sahibinden-v2-main-panel/design.md`. Değişiklik gerekiyorsa **önce o dosyayı güncelle**.

---

## 🟡 Performans Kuralları (INP < 200ms)

**INP** (Interaction to Next Paint) Web Vitals'ın en kritik metriği. State değişiklikleri ≥ 100ms iş yapacaksa **YOU MUST** aşağıdaki tekniklerden birini kullan:

### `useTransition` — state setter'ı sar

Liste filtreleme, sekme değiştirme, navigasyon panel açma gibi **kullanıcı bekleyebilecek** state'ler için zorunlu:

```ts
const [, startTransition] = useTransition()

onClick={() => {
  startTransition(() => setSelectedTab(key))  // ✅ INP < 100ms
}}
```

❌ **input alanlarında kullanma** — text input'lar her tuşta anlık güncellenmeli.

### CSS izolasyonu — backdrop-filter olan yerlerde

Cam yüzeylerde (header pill, modal, dialog) parent'a şu stilleri ekle:

```ts
style={{ contain: 'layout style paint', willChange: 'transform' }}
```

### framer-motion

- `AnimatePresence`: çoğu durumda `mode="popLayout"` (yetişen anim) `mode="wait"`'tan hızlı hissedilir.
- Stagger delay'leri: `delay: 0.04 + i * 0.015` (cömert olma).
- Spring: stiffness 380–500, damping 32–42, mass 0.7–0.9. Mass 1.0 üstüne çıkma.
- Reduced-motion (`prefers-reduced-motion`) **otomatik kapanıyor** (`index.css` § 358-367). Sen ekstra kontrole gerek yok.

### `React.memo`

Sub-component aynı props ile sürekli render oluyorsa memo'la — özellikle DataTable satır componenti, dock ikonu, chart segmenti.

---

## 🟢 React 19 + TanStack Query (özet)

Detaylı kurallar skill dosyalarında — Claude otomatik yükler. Burada her oturumda
hatırlanması gereken **kritik 3 nokta**:

1. **`useEffect` veri fetch için ASLA** → `useQuery` (TanStack Query) kullan.
2. **State setter ≥ 50ms iş tetikliyorsa `useTransition`** içine sar.
3. **`QueryClient` component içinde oluşturma** — modül seviyesinde, zaten kurulu (`src/lib/query/client.ts`).

Detay: `@.claude/skills/react-19/SKILL.md` · `@.claude/skills/tanstack-query/SKILL.md`

---

## Dosya & Kod Stili

- Path alias: **`@/*`** (`./src/*`). `../../../` zinciri YAZMA.
- Dosya adı: **kebab-case** (`dynamic-island-header.tsx`, `mini-bars.tsx`).
- Component adı: **PascalCase**.
- Hook adı: `use*` prefix.
- Type-only import: `import type { Foo } from './bar'` (verbatimModuleSyntax açık).
- ES modules. CommonJS YASAK.
- `cn(...)` helper (`@/lib/utils`) kullan — twMerge + clsx.
- Inline `<style>` yerine Tailwind sınıfı. Tailwind ifade edemiyorsa CSS değişkeni (`var(--glass-tint)`).
- **Inline yorum yazma** — sadece **NEDEN** açıklamak gerekiyorsa, **NE** yaptığı belliyse yazma.

---

## Page Anatomisi (her sayfada)

Her route sayfası `<PageShell>` ile sarılır:

```tsx
<PageShell
  eyebrow="MOD · LISTINGS"
  title={<>Arsa <em className="font-serif italic font-light">portföyü</em></>}
  description="..."
  actions={<ActionButtons />}
>
  {/* içerik */}
</PageShell>
```

- `eyebrow`: mono uppercase tracking-[0.18em] muted-foreground.
- `title`: serif `font-light` 4xl/5xl.
- Vurgu kelimesi varsa **`<em>` serif italic** ile sar.
- Container max-w-[1280px] mx-auto.

---

## Klasör Yapısı

```
src/
├── main.tsx                # QueryClient + Router providers
├── index.css               # tokens + glass + animations (DOKUNMA — palet/font orada)
├── routes/                 # her sayfa bir dosya
├── components/
│   ├── shell/              # layout componentleri (header/dock/grid/page-shell)
│   ├── ui/                 # primitif'ler (liquid-glass/squircle/morph-dock) — DOKUNMA
│   ├── atoms/              # küçük paylaşılan (chips/sparkline)
│   └── data-table/         # DataTable + Column<T>
├── lib/
│   ├── utils.ts            # cn()
│   ├── format.ts           # tr-TR Intl formatters
│   ├── mock/               # mock data (Faz 3+'ta API'ya geçecek)
│   ├── query/              # TanStack QueryClient + custom hooks
│   ├── assistant/          # AI search (Faz 6'da gerçek engine)
│   └── squircle-path.ts    # SVG path generator
└── tokens/
    └── radius.ts           # concentric radius scale
```

---

## Yaygın Tuzaklar

- **Header pill içeriğini değiştiriyorsan:** `useTransition` + `contain` zaten kurulu — bozma.
- **DataTable kolonu eklerken:** `Column<T>` tipiyle kal, `sortValue` opsiyonel ama eklenirse `string | number` döndür.
- **Glass yüzeyi yeni component'te:** `bg-card` (solid) tercih et. Glass sadece floating element (header pill, modal, dock).
- **Date format:** Manuel string concat yapma — `lib/format.ts`'den `formatTL`, `formatArea`, `timeAgo` kullan.
- **Para birimi:** `formatTLCompact(amount)` → "₺ 8,4M". `formatTL(amount)` → "₺8.400.000".

---

## Görev Tamamlama Kontrolü

Bir feature/sayfayı bitirdiğinde **YOU MUST** sırayla:

1. `npx tsc -b` → exit 0
2. Dev server'da görsel doğrulama (`curl http://localhost:5174/<route>` HTTP 200 + Vite log error-free)
3. Yeni komponent eklediysen Bash log'unda HMR error olmadığını kontrol et
4. SPEC.md migrasyon tablosunda ilgili satırı 🚧 → ✅ güncelle

---

## Sahibinden v2'den Miras Korunan Bileşenler

Bunları **yeniden yazma**, sadece prop ekleyerek genişlet:
- `liquid-glass.tsx` (GlassEffect, GlassDock, GlassFilter)
- `morph-dock.tsx` (Apple Dynamic Island morph)
- `squircle.tsx` (G2 köşe)
- `glass-button.tsx` + `.glass-button*` CSS sınıfları
- `atom-button.tsx`, `dialog.tsx`, `glass-tweaks.tsx`

---

## Acil İletişim

- Bir kuralı bozman gerekiyorsa **önce sor**.
- 2 kez aynı hatayı yapıyorsan `/clear` ve daha spesifik prompt'la baştan başla.
- INP/CLS skorları için DevTools Performance kullan — **kullanıcıya rakam gösterilebilir** olsun.
