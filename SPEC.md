# Sahibinden v3 — Sistem Spec'i

> **Bağlam:** `sahibinden-v2-main-panel/` ekipte denenmiş ilk prototip.
> Bu repoda **frontend'i sıfırdan**, daha iyi içerikle yeniden inşa ediyoruz.
> Tasarım dili, sayfa listesi ve etkileşim sözleşmesi v2'den miras alınır;
> kod, içerik ve deneyim v3'te yeniden yazılır.
>
> **Domain (varsayım):** Emlak (arsa/villa/zeytinlik) marketplace yönetimi.
> Yanlışsa şimdi düzeltilmeli — bu varsayım tüm sayfa içeriklerini etkiler.

---

## 0. Migrasyon Tablosu — v2 → v3

| v2 dosyası | v3 sayfası | Route | Durum |
|------------|-----------|-------|------|
| `dashboard-home.tsx` | **Dashboard Home** | `/` | 🚧 Faz 1 (bu sprint) |
| `listings.tsx` | **Listings** | `/listings` | 📦 Faz 2 |
| `customers.tsx` | **Customers** | `/customers` | 📦 Faz 2 |
| (yok — yeni) | **Sales** (kanban) | `/sales` | 📦 Faz 3 |
| `finance.tsx` | **Finance** | `/finance` | 📦 Faz 3 |
| `reports.tsx` | **Reports** | `/reports` | 📦 Faz 4 |
| `calendar.tsx` | **Calendar** | `/calendar` | 📦 Faz 4 |
| `messages.tsx` | **Messages** | `/messages` | 📦 Faz 5 |
| `search.tsx` | **Search** | `/search` | 📦 Faz 5 |
| `profile.tsx` | **Profile** | `/profile` | 📦 Faz 5 |
| `assistant-modal.tsx` | **AssistantModal** | sistemwide (Cmd+K) | 📦 Faz 6 |

**Faz 0 (tamamlandı):** Vite + React 19 + Tailwind v4 + RR7 + Liquid Glass primitif'leri + DynamicIslandHeader + MorphDock + AnimatedGrid arka plan.

---

## 1. Tasarım Felsefesi (v2'den birebir miras)

> Kaynak: `sahibinden-v2-main-panel/design.md`. Buradan sapma yapılmaz — değişiklik
> gerekiyorsa önce bu dosya güncellenir.

- **Sıcak, kâğıt hissi.** Steril beyaz / saf siyah yok. Light: krem; Dark: yumuşak warm brown.
- **Açık tonlar ağırlıklı.** Light/dark, her ikisinde arka plan ağırlığı açıktan tarafa.
- **Dark mod yormamalı.** `#000` yasak; taban `#3D352D` civarı. "Mağara" hissi yok.
- **Glassmorphism sınırlı.** FAB, asistan paneli, dock — okunaklılığı bozma.
- **İtalik kullanma.** Vurgu = font weight veya renk, eğri yazı değil.
- **Mavi / indigo / soğuk ton UI'da yasak.** (Veri görselinde sınırlı izinli.)

---

## 2. Renk Paleti — v2 ile birebir aynı

CSS değişkenleri `src/index.css` içinde, **Tailwind sınıfları üstünden çağrılır** (`bg-background`, `text-foreground`, `text-muted-foreground`, `bg-card`, `text-accent`).

### Light mode (`:root`)

| Token | HSL | ~Hex | Kullanım |
|-------|-----|-----|----------|
| `--background` | `36 38% 98%` | `#FBF8F2` | Sayfa zemini |
| `--foreground` | `28 14% 22%` | `#3F362D` | Ana yazı (warm ink) |
| `--card` | `36 40% 100%` | `#FFFCF7` | Kart yüzeyi |
| `--muted` | `34 22% 95%` | `#F2EDE3` | Yumuşak arka plan |
| `--muted-foreground` | `28 8% 48%` | `#847B70` | İkincil yazı |
| `--border` | `32 20% 90%` | `#E5DCCD` | Ayraç |
| `--accent` | `28 28% 26%` | `~#4F4034` | **Koyu kahve** vurgu |
| `--accent-foreground` | `36 38% 98%` | `#FBF8F2` | Vurgu üstündeki yazı |

### Dark mode (`.dark`)

| Token | HSL | ~Hex | Kullanım |
|-------|-----|-----|----------|
| `--background` | `28 10% 22%` | `#3D352D` | Sayfa zemini (orta-açık warm brown) |
| `--foreground` | `36 28% 92%` | `#F1E8D6` | Ana yazı (parlak cream) |
| `--card` | `28 10% 26%` | `#463D34` | Kart yüzeyi |
| `--muted` | `28 10% 28%` | `#4B4239` | Yumuşak arka plan |
| `--muted-foreground` | `32 18% 76%` | `#C9BDA8` | İkincil yazı |
| `--border` | `28 10% 34%` | `#5B5145` | Ayraç |
| `--accent` | `36 28% 88%` | `~#ECE2D0` | **Krem** vurgu |
| `--accent-foreground` | `28 14% 18%` | `#352D24` | Vurgu üstündeki yazı |

### Yasaklar (v2 ile aynı)

- ❌ `bg-white` / `bg-black` direkt — token kullan.
- ❌ Saf `#000` arka plan, dark `--background` lightness < 20%.
- ❌ `text-gray-*` yerine `text-muted-foreground`.
- ❌ `sky-*`, `indigo-*`, `blue-*`, `teal-*` UI vurgusu olarak.
- ❌ Üst üste 3'ten fazla koyu yüzey katmanı.

### Vurgu rengi paterni

Submit / primary buton: `bg-accent text-accent-foreground hover:opacity-90`.
- Light modda: koyu kahve buton + krem yazı.
- Dark modda: krem buton + dark brown yazı.

---

## 3. Tipografi — v2 ile birebir aynı

| Token | Font | Tailwind | Kullanım |
|-------|------|---------|---------|
| `--font-sans` | **Inter** | `font-sans` (default) | Tüm gövde, UI, butonlar |
| `--font-serif` | **Lora** | `font-serif` | h1/h3 panel & kart başlıkları |
| `--font-mono` | **JetBrains Mono** | `font-mono` | Etiketler, kbd, küçük caps |

### Boyut iskeleti

| Eleman | Boyut | Weight |
|--------|-------|--------|
| Panel başlık (h1) | `text-3xl md:text-[42px]` | `font-light` (300) |
| Kart başlık (h3) | `text-lg` | 500 |
| Gövde | `text-sm` | 400 |
| Caption / mono | `text-[10px] uppercase tracking-[0.16em]` | 500 |

### Kurallar

- Gövde her zaman `font-sans`.
- Başlıklar `font-serif`, **light weight (300)**, `tracking-tight`.
- Mono yazılar küçük + uppercase + wide tracking.
- Italik **sadece** serif başlık içindeki vurgu kelimesinde — gövde metninde **asla**.

### Yükleme — `index.html`

```html
<link
  href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Lora:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
  rel="stylesheet"
/>
```

---

## 4. Köşe Yarıçapı — v2 sözleşmesi

| Eleman | Class | Değer |
|--------|------|-------|
| Buton, badge | `rounded-xl` | 12px |
| Kart | `rounded-2xl` | 16px |
| Panel, modal | `rounded-xl` | 12px |
| Pill, chip | `rounded-full` | 9999 |
| Mini icon kutu (avatar/lozenge) | `rounded-lg` | 8px |

Concentric (squircle/Apple HIG) sistemi `tokens/radius.ts` + `--radius-*` üstünden kullanılabilir; opt-in.

---

## 5. Glassmorphism — v2 ile birebir aynı

CSS değişkenleri **yeniden hesaplama yapma**:

```
--glass-tint        --glass-tint-soft        --glass-tint-strong
--glass-highlight   --glass-highlight-soft
--glass-edge-top    --glass-edge-bottom
--glass-shadow      --glass-shadow-strong
--glass-text        --glass-border           --glass-border-strong
```

Üretim noktaları:
1. `<GlassEffect>` + `<GlassDock>` + `<GlassFilter>` (`liquid-glass.tsx`) — **dokunma**.
2. `<GlassButton>` (`glass-button.tsx`) — `.glass-button*` sınıfları (`index.css`).
3. `<MorphDock>` (`morph-dock.tsx`) — Apple Dynamic Island morph.
4. `<Squircle>` (`squircle.tsx`) — opt-in G2 köşe.

### Cam yüzey kuralları

- `backdrop-blur ≥ 14px`, `saturate(180%)`.
- Cam altında her zaman bir bulanıklık üreten içerik (gradient, grid, görsel) olmalı.
- `prefers-reduced-transparency: reduce` ve `prefers-contrast: more` fallback'leri korunur.

---

## 6. Sahibinden v2 → v3 Migrasyon Felsefesi

Korunan (v2'den birebir alındı veya alınacak):
- ✅ Liquid Glass primitif'leri (`liquid-glass`, `morph-dock`, `squircle`, `glass-button`, `atom-button`, `dialog`, `glass-tweaks`)
- ✅ Token sistemi (`tokens/radius.ts`)
- ✅ Helper'lar (`lib/utils.ts`, `lib/squircle-path.ts`, `lib/squircle-style.ts`)
- ✅ Dynamic Island pill header (sadece pill+nav yapısı, içerik yenilendi)
- ✅ MorphDock peek-pill mekaniği
- ✅ AnimatedGrid arka plan
- ✅ index.css (palet + glass + dock-hint animasyonları + reduced-motion/transparency)

Yeniden yazılan (v3'te taze):
- 🆕 Dashboard Home (yeni KPI bento, yeni asistan trigger, yeni aktivite feed)
- 🆕 Listings sayfası (filtre/tablo/harita yapısı bambaşka)
- 🆕 Customers sayfası
- 🆕 Sales sayfası (yeni — v2'de yoktu)
- 🆕 Finance, Reports, Calendar, Messages, Search, Profile
- 🆕 AssistantModal (Cmd+K) — v2'deki engine.ts patern'i, v3 intent set'i

Atılan (v2'ye özel, v3'e taşınmaz):
- ❌ `lib/store.tsx` (mock store — v3'te gerçek API client'a evrilecek)
- ❌ `lib/assistant/*` engine — v3'te yeni intent set'iyle yeniden yazılır
- ❌ `infinite-grid-integration.tsx` (1691 satırlık monolit — v3'te route + component bölümlü)
- ❌ `dashboard-home.tsx` (içerik v3'te tamamen yeni)
- ❌ Leaflet/atelier-pin CSS (harita çözümü v3'te yeniden seçilir — leaflet vs maplibre)

---

## 7. Stack

```
React 19 + TypeScript 6 + Vite 8 + Tailwind v4 (@theme inline)
React Router v7 (library mode, createBrowserRouter)
framer-motion v12 (Liquid Glass motion + page transitions)
recharts v3 (chart'lar — v2 ile aynı)
lucide-react (icon set — v2 ile aynı)
clsx + tailwind-merge (cn helper)
Vitest + @testing-library/react (test)
```

State: faz başında YOK. Faz 2'de gerekirse `zustand` veya `jotai` eklenir. RR7 URL state'i + `useSearchParams` çoğu işi görür.

---

## 8. Sayfa Anatomisi — Ortak Sözleşme

Her sayfa `<PageShell>` ile sarılır (v2'deki `page-shell.tsx`'in v3 versiyonu):

```tsx
<PageShell
  eyebrow="MOD · v3"
  title={<>Listings <em className="font-serif italic font-light">portföy</em></>}
  description="Aktif arsa ilanları, harita ve toplu işlem."
  actions={<ActionButtons />}
>
  {/* sayfa içeriği */}
</PageShell>
```

- `eyebrow`: mono uppercase tracking-wider
- `title`: serif `font-light` 3xl/42px, eğer vurgu kelimesi varsa **serif italik**
- `description`: muted-foreground `text-sm`
- `actions`: sağda buton/aksiyon row

---

## 9. AI-First Sözleşmesi

Her sayfada bir veya birden fazla şu davranışlardan biri olmalı:

1. **Asistan trigger:** Cmd+K (sistemwide) **veya** sayfa içi "Bana sor…" input.
2. **Auto-summary:** sayfa açılışında en üstte 2-4 KPI kartı (auto generated).
3. **Suggested actions:** boş state'lerde 3 chip — "Hoş geldin → şimdi şunu yap" rehberi.
4. **Smart filters:** filter UI'da doğal dil placeholder ("deniz manzaralı 5M altı").

AssistantModal Faz 6'da gelecek; öncesinde her sayfa **trigger noktası** ekler (input + Cmd+K event listener).

---

## 10. Build Sırası — Faz Faz

### Faz 1 — Dashboard Home (BU SPRINT)
- [ ] `routes/home.tsx` — yeniden yazım (eski landx-tema silindi)
- [ ] Selamlama bölümü (hour-aware: Günaydın/İyi günler/İyi akşamlar)
- [ ] KPI bento (4 kart): Aktif ilan, Sıcak müşteri, Bu ay satış, Bekleyen tahsilat
- [ ] Asistana sor input (Cmd+K trigger placeholder, henüz modal yok)
- [ ] Son aktiviteler listesi (mock, 5 satır)
- [ ] PageShell yeni componenti
- [ ] Header sub-nav'ı emlak'a çevir (overview/listings/customers/sales/finance/reports)
- [ ] Dock'u emlak ikonlarına çevir
- **Done:** `/` rotasında v3 home render, header pill emlak modüllerini gösteriyor.

### Faz 2 — Listings + Customers (sonraki sprint)
- [ ] `routes/listings.tsx` — tablo + filtre + harita toggle
- [ ] `routes/customers.tsx` — segment tab (Sıcak/Ilık/Soğuk) + tablo + kohort grafiği
- [ ] Mock data layer (`lib/mock/*.ts` — listings, customers, dummy data)
- [ ] `<DataTable>` shared component

### Faz 3 — Sales + Finance
- [ ] `routes/sales.tsx` — kanban (İlk temas → Görüşme → Teklif → Kaparo → Tapu)
- [ ] `routes/finance.tsx` — tahsilat/komisyon/gider tablosu + dönem grafiği

### Faz 4 — Reports + Calendar
- [ ] `routes/reports.tsx` — sekmeli rapor (Performans/Satış/Müşteri/Bölge)
- [ ] `routes/calendar.tsx` — ay/hafta görünümü, randevu listesi

### Faz 5 — Messages + Search + Profile
- [ ] `routes/messages.tsx` — sohbet listesi + thread + composer
- [ ] `routes/search.tsx` — global arama (ilan/müşteri/işlem)
- [ ] `routes/profile.tsx` — ekip/entegrasyon/güvenlik/bildirim shortcut'ları

### Faz 6 — AssistantModal (Cmd+K)
- [ ] `components/assistant/assistant-modal.tsx` — modules ↔ chat sekmesi
- [ ] `lib/assistant/engine.ts` — intent classifier (yeniden yazım)
- [ ] `lib/assistant/intents.ts` — emlak intent seti (listing.search, customer.search, transaction.summary, vb.)
- [ ] Block tipleri: text, listings, customers, stat, chart, suggest
- [ ] Cmd+K key listener — global

### Faz 7 — Polish & Test
- [ ] Vitest unit testleri (atom + composite)
- [ ] @testing-library/react integration testleri
- [ ] Lighthouse Performance ≥ 90, Accessibility ≥ 95
- [ ] Storybook (opsiyonel)

---

## 11. Klasör Yapısı (hedef)

```
sahibinden-v3/
├── src/
│   ├── main.tsx                 # createBrowserRouter
│   ├── index.css                # tokens + glass + animations
│   ├── routes/
│   │   ├── root.tsx             # RootLayout (Header + Bg + Dock + Outlet)
│   │   ├── home.tsx             # Dashboard Home
│   │   ├── listings.tsx         # Faz 2
│   │   ├── customers.tsx        # Faz 2
│   │   ├── sales.tsx            # Faz 3
│   │   ├── finance.tsx          # Faz 3
│   │   ├── reports.tsx          # Faz 4
│   │   ├── calendar.tsx         # Faz 4
│   │   ├── messages.tsx         # Faz 5
│   │   ├── search.tsx           # Faz 5
│   │   └── profile.tsx          # Faz 5
│   ├── components/
│   │   ├── shell/
│   │   │   ├── animated-grid.tsx
│   │   │   ├── dynamic-island-header.tsx
│   │   │   ├── app-dock.tsx
│   │   │   └── page-shell.tsx
│   │   ├── ui/                  # v2'den taşınan primitif'ler
│   │   │   ├── liquid-glass.tsx
│   │   │   ├── morph-dock.tsx
│   │   │   ├── squircle.tsx
│   │   │   ├── glass-button.tsx
│   │   │   ├── atom-button.tsx
│   │   │   ├── dialog.tsx
│   │   │   └── glass-tweaks.tsx
│   │   ├── home/                # Faz 1 sayfa-spesifik
│   │   ├── listings/            # Faz 2
│   │   ├── customers/           # Faz 2
│   │   └── assistant/           # Faz 6
│   ├── lib/
│   │   ├── utils.ts
│   │   ├── squircle-path.ts
│   │   ├── squircle-style.ts
│   │   ├── mock/                # Faz 2'den itibaren mock data
│   │   └── assistant/           # Faz 6
│   └── tokens/
│       └── radius.ts
├── public/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.*.json
└── SPEC.md                      # bu dosya
```

---

## 12. "Definition of Done" — Faz 1 (Dashboard Home)

- [ ] `npm run dev` → http 200, console error-free.
- [ ] `/` rotası v3 home'u render.
- [ ] Selamlama saate göre değişiyor.
- [ ] 4 KPI kartı görünür (mock değer).
- [ ] "Bana sor…" input render (henüz işlevsel olmasa da Cmd+K görünür).
- [ ] Son aktiviteler 5 satır.
- [ ] Header pill artık emlak sub-nav'ı gösteriyor (LandX değil).
- [ ] Dock emlak ikonlarına geçti.
- [ ] Light/dark toggle çalışıyor.
- [ ] `prefers-reduced-motion` aktifken animasyon kapalı.

---

## 13. Yeni Bileşen Eklerken Kontrol Listesi (v2'den miras)

- [ ] Renkler `bg-*` / `text-*` token'ları üstünden (hardcoded hex YOK)?
- [ ] Light + dark her ikisinde kontrast ≥ 4.5:1 (gövdede)?
- [ ] Saf siyah/beyaz kullandın mı? **Hayır** olmalı.
- [ ] Italik gövde metninde mi? **Hayır** olmalı.
- [ ] Font-family override yaptın mı? Sadece `font-serif` / `font-mono` ile.
- [ ] Glass kullanıyorsan `--glass-*` değişkenlerinden mi (yeni shadow icat etmedin)?
- [ ] Köşe yarıçapı § 4'teki tablodan mı?
- [ ] Mavi/indigo soğuk ton var mı (UI'da)? **Hayır** olmalı.

---

**Kaynak:** `sahibinden-v2-main-panel/design.md` (tasarım yönergeleri) +
`sahibinden-v2-main-panel/src/components/pages/*` (sayfa kabuğu/repertuvar).
