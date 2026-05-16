import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { ArrowLeft, ArrowRight, Check, Loader2, MapPin, Sparkles } from '@landx/icons'
import { formatTLCompact } from '@landx/ui'
import { ValuationBar } from '@landx/ui/ai'
import { aiDesc, estimateValue, type ImarType } from '@landx/ai'
import { useCreateListing, type Listing } from '@landx/data'
import { WizardShell } from '@/components/listing-wizard/WizardShell'
import FotoUpload from '@/components/listing-form/FotoUpload'
import MapPicker from '@/components/listing-form/MapPicker'
import type { PhotoMeta } from '@/lib/admin-photos'

const IMAR_MAP: Record<string, ImarType> = {
  Konut: 'konut',
  Ticari: 'ticari',
  Karma: 'karma',
  Tarım: 'tarim',
  'İmara açık değil': 'imarsiz',
}

const TYPE_TO_IMAR: Record<Listing['type'], ImarType> = {
  İmarlı: 'konut',
  Tarla: 'tarim',
  Zeytinlik: 'zeytinlik',
  'Villa Arsası': 'turizm',
}

interface FormState {
  // step 1
  city: string
  district: string
  /** Optional lat/lng picked via MapPicker (Wave F10.A). String for input parity. */
  lat?: string
  lng?: string
  // step 2
  type: Listing['type']
  size: string
  imarDurumu: string
  // step 3
  price: string
  // step 4 (görsel & açıklama)
  /** Photo metadata only — blob URLs stay in FotoUpload (Wave F10.A). */
  photos?: PhotoMeta[]
  tagsCsv: string
  description: string
  // step 5
  status: Listing['status']
  kvkkAccept: boolean
}

const EMPTY: FormState = {
  city: '',
  district: '',
  lat: undefined,
  lng: undefined,
  type: 'İmarlı',
  size: '',
  imarDurumu: '',
  price: '',
  photos: [],
  tagsCsv: '',
  description: '',
  status: 'Taslak',
  kvkkAccept: false,
}

export function ListingNew() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [mapOpen, setMapOpen] = useState(false)
  const create = useCreateListing()

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm(prev => ({ ...prev, [k]: v }))

  const aiImar: ImarType = IMAR_MAP[form.imarDurumu] ?? TYPE_TO_IMAR[form.type] ?? 'konut'
  const aiArea = Number(form.size) || 0
  const aiValuation = useMemo(
    () =>
      aiArea > 0 && form.city
        ? estimateValue({ area: aiArea, imarType: aiImar, city: form.city, district: form.district })
        : null,
    [aiArea, aiImar, form.city, form.district],
  )

  const applyAiPrice = () => {
    if (aiValuation) set('price', String(aiValuation.mid))
  }

  const applyAiDescription = () => {
    if (!form.city || !aiArea) return
    set(
      'description',
      aiDesc({
        city: form.city,
        district: form.district,
        imarType: aiImar,
        area: aiArea,
        tapuType: 'mustakil',
      }),
    )
  }

  const canGoNext = () => {
    switch (step) {
      case 1: return form.city.length > 0 && form.district.length > 0
      case 2: return form.size.length > 0 && Number(form.size) > 0
      case 3: return form.price.length > 0 && Number(form.price) > 0
      case 4: return true  // optional
      case 5: return form.kvkkAccept
      default: return false
    }
  }

  const handleSubmit = async () => {
    if (!canGoNext()) return
    try {
      const latNum = form.lat ? Number(form.lat) : undefined
      const lngNum = form.lng ? Number(form.lng) : undefined
      const created = await create.mutateAsync({
        title: `${form.district} · ${form.size} m² ${form.type}`,
        city: form.city,
        district: form.district,
        type: form.type,
        size: Number(form.size),
        price: Number(form.price),
        status: form.status,
        tags: form.tagsCsv.split(',').map(s => s.trim()).filter(Boolean),
        // Wave F10.A — pass picked coords when present (NewListingInput allows optional lat/lng).
        ...(Number.isFinite(latNum) && Number.isFinite(lngNum)
          ? { lat: latNum, lng: lngNum }
          : {}),
      })
      navigate(`/listings?highlight=${encodeURIComponent(created.id)}`)
    } catch (err) {
      // Optimistic update will roll back; show inline error
      console.error(err)
    }
  }

  return (
    <WizardShell currentStep={step}>
      {/* Step 1 — Konum */}
      {step === 1 && (
        <section>
          <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">ADIM 1 · KONUM</div>
          <h1 className="font-serif text-3xl font-light leading-tight">Arsa <em className="font-serif italic font-light">nerede</em>?</h1>
          <p className="mt-2 text-muted-foreground">İl ve ilçeyi seç. Bölge sayfasındaki ortalama m² fiyatı ile karşılaştırmaya yardımcı.</p>

          <div className="mt-8 space-y-4">
            <Field id="city" label="İl">
              <select
                id="city"
                data-testid="listing-field-city"
                value={form.city}
                onChange={e => set('city', e.target.value)}
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-foreground"
                required
              >
                <option value="">Seç…</option>
                {['Balıkesir', 'İzmir', 'Muğla', 'Aydın', 'Antalya'].map(c => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field id="district" label="İlçe / Mahalle">
              <input
                id="district"
                data-testid="listing-field-district"
                type="text"
                value={form.district}
                onChange={e => set('district', e.target.value)}
                placeholder="Örn: Ayvalık · Cunda"
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-foreground placeholder:text-[hsl(var(--placeholder))]"
                required
              />
            </Field>
            <div
              data-testid="map-picker-block"
              className="rounded-2xl border border-dashed border-border bg-card/50 p-5"
            >
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-5 w-5 flex-none opacity-60" />
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    Harita konumu
                  </div>
                  {form.lat && form.lng ? (
                    <p
                      data-testid="map-picker-coords"
                      className="mt-1 font-mono text-[12px] tabular-nums text-foreground"
                    >
                      {Number(form.lat).toFixed(5)}, {Number(form.lng).toFixed(5)}
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-muted-foreground">
                      Henüz pin seçilmedi — opsiyonel, sonra da düzenleyebilirsin.
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  data-testid="map-picker-open"
                  onClick={() => setMapOpen(true)}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium transition hover:bg-foreground/5"
                >
                  {form.lat && form.lng ? 'Konumu değiştir' : 'Haritada seç'}
                </button>
              </div>
            </div>
            <input type="hidden" data-testid="listing-field-lat" name="lat" value={form.lat ?? ''} />
            <input type="hidden" data-testid="listing-field-lng" name="lng" value={form.lng ?? ''} />
          </div>
        </section>
      )}

      {/* Step 2 — Bilgi */}
      {step === 2 && (
        <section>
          <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">ADIM 2 · TEMEL BİLGİ</div>
          <h1 className="font-serif text-3xl font-light">Arsa <em className="font-serif italic font-light">ne tür</em>?</h1>
          <div className="mt-8 space-y-4">
            <Field id="type" label="Tip">
              <select id="type" data-testid="listing-field-type" value={form.type} onChange={e => set('type', e.target.value as Listing['type'])} className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-foreground">
                {['İmarlı', 'Tarla', 'Zeytinlik', 'Villa Arsası'].map(t => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field id="size" label="Alan (m²)">
              <input id="size" data-testid="listing-field-size" type="number" min="10" value={form.size} onChange={e => set('size', e.target.value)} placeholder="Örn: 1240" className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-foreground placeholder:text-[hsl(var(--placeholder))]" required />
            </Field>
            <Field id="imar" label="İmar durumu" hint="Tapu kayıtlarına göre">
              <select id="imar" value={form.imarDurumu} onChange={e => set('imarDurumu', e.target.value)} className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-foreground">
                <option value="">Seç…</option>
                <option>Konut</option>
                <option>Ticari</option>
                <option>Karma</option>
                <option>Tarım</option>
                <option>İmara açık değil</option>
              </select>
            </Field>
          </div>
        </section>
      )}

      {/* Step 3 — Fiyat */}
      {step === 3 && (
        <section>
          <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">ADIM 3 · FİYAT</div>
          <h1 className="font-serif text-3xl font-light">Satış <em className="font-serif italic font-light">fiyatı</em>?</h1>
          <p className="mt-2 text-muted-foreground">TL cinsinden. Pazarlık payı sonraki adımda.</p>
          <div className="mt-8 space-y-4">
            <Field id="price" label="Fiyat (TL)">
              <input id="price" data-testid="listing-field-price" type="number" min="1000" step="1000" value={form.price} onChange={e => set('price', e.target.value)} placeholder="Örn: 8400000" className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-foreground placeholder:text-[hsl(var(--placeholder))]" required />
            </Field>

            {aiValuation && (
              <div className="space-y-3">
                <ValuationBar
                  result={aiValuation}
                  marketPrice={Number(form.price) > 0 ? Number(form.price) : undefined}
                />
                <button
                  type="button"
                  data-testid="wizard-ai-price"
                  onClick={applyAiPrice}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium transition hover:bg-foreground/5"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  AI önerisini uygula ({formatTLCompact(aiValuation.mid)})
                </button>
              </div>
            )}
            {form.price && Number(form.price) > 0 && form.size && Number(form.size) > 0 && (
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">ÖZET</div>
                <div className="mt-1 flex items-baseline justify-between gap-3">
                  <span className="font-serif text-xl font-light">{formatTLCompact(Number(form.price))}</span>
                  <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
                    ₺ {Math.round(Number(form.price) / Number(form.size)).toLocaleString('tr-TR')} / m²
                  </span>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Step 4 — Görsel & etiket */}
      {step === 4 && (
        <section>
          <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">ADIM 4 · GÖRSEL & AÇIKLAMA</div>
          <h1 className="font-serif text-3xl font-light">Detayları <em className="font-serif italic font-light">ekle</em></h1>
          <div className="mt-8 space-y-4">
            <FotoUpload
              initial={form.photos}
              onChange={(photos) => set('photos', photos)}
            />
            <Field id="tags" label="Etiketler" hint="Virgülle ayır (deniz manzaralı, yola cephe, ...)">
              <input id="tags" data-testid="listing-field-tags" type="text" value={form.tagsCsv} onChange={e => set('tagsCsv', e.target.value)} placeholder="deniz manzaralı, yola cephe" className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-foreground placeholder:text-[hsl(var(--placeholder))]" />
            </Field>
            <Field id="desc" label="Açıklama">
              <textarea id="desc" rows={5} value={form.description} onChange={e => set('description', e.target.value)} className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-foreground placeholder:text-[hsl(var(--placeholder))]" placeholder="Parselin özellikleri, çevre, imar, tapu durumu…" />
              <button
                type="button"
                data-testid="wizard-ai-desc"
                onClick={applyAiDescription}
                disabled={!form.city || !aiArea}
                className="mt-2 inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium transition hover:bg-foreground/5 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Sparkles className="h-3.5 w-3.5" />
                AI ile açıklama oluştur
              </button>
            </Field>
          </div>
        </section>
      )}

      {/* Step 5 — Yayın */}
      {step === 5 && (
        <section>
          <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">ADIM 5 · YAYIN</div>
          <h1 className="font-serif text-3xl font-light">Son <em className="font-serif italic font-light">kontrol</em></h1>
          <p className="mt-2 text-muted-foreground">Yayın tercihini seç ve onayla.</p>

          <div className="mt-8 space-y-4">
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">ÖZET</div>
              <dl className="mt-3 space-y-1.5 text-[13px]">
                <Summary label="Konum" value={`${form.district}, ${form.city}`} />
                <Summary label="Tip · alan" value={`${form.type} · ${form.size} m²`} />
                <Summary label="Fiyat" value={formatTLCompact(Number(form.price) || 0)} />
                {form.tagsCsv && <Summary label="Etiket" value={form.tagsCsv} />}
              </dl>
            </div>
            <Field id="status" label="Yayın tercihi">
              <select id="status" data-testid="listing-field-status" value={form.status} onChange={e => set('status', e.target.value as Listing['status'])} className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-foreground">
                <option value="Taslak">Taslak (sadece kaydet)</option>
                <option value="Aktif">Aktif (hemen yayınla)</option>
                <option value="Pasif">Pasif (daha sonra)</option>
              </select>
            </Field>
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-card p-4 text-sm">
              <input
                type="checkbox"
                data-testid="listing-field-kvkk-accept"
                checked={form.kvkkAccept}
                onChange={e => set('kvkkAccept', e.target.checked)}
                className="mt-0.5 h-4 w-4 flex-none rounded border-border accent-foreground"
                required
              />
              <span className="text-foreground/90">
                Yayınlamak için müşteri kişisel verilerini KVKK uyumlu işlediğimi onaylıyorum.
                Tapu fotokopisi, iletişim ve hassas bilgiler arsam.net üzerinden paylaşılmaz.
              </span>
            </label>
            {create.isError && (
              <div role="alert" className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
                Kayıt başarısız. Tekrar dener misin?
              </div>
            )}
          </div>
        </section>
      )}

      {/* Nav buttons */}
      <nav className="mt-10 flex items-center justify-between">
        {step > 1 ? (
          <button
            type="button"
            data-testid="wizard-back"
            onClick={() => setStep(s => s - 1)}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium transition hover:bg-foreground/5"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Geri
          </button>
        ) : <span aria-hidden />}

        {step < 5 ? (
          <button
            type="button"
            data-testid="wizard-next"
            disabled={!canGoNext()}
            onClick={() => setStep(s => s + 1)}
            className="inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            İleri <ArrowRight className="h-3.5 w-3.5" />
          </button>
        ) : (
          <button
            type="button"
            data-testid="wizard-submit"
            disabled={!canGoNext() || create.isPending}
            onClick={handleSubmit}
            className="inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {create.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            {create.isPending ? 'Kaydediliyor…' : form.status === 'Aktif' ? 'Yayınla' : 'Kaydet'}
          </button>
        )}
      </nav>

      {mapOpen && (
        <MapPicker
          initialLat={form.lat}
          initialLng={form.lng}
          onConfirm={({ lat, lng }) => {
            setForm(prev => ({ ...prev, lat: String(lat), lng: String(lng) }))
            setMapOpen(false)
          }}
          onCancel={() => setMapOpen(false)}
        />
      )}
    </WizardShell>
  )
}

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</label>
      {children}
      {hint && <div className="mt-1 text-[11.5px] text-muted-foreground">{hint}</div>}
    </div>
  )
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</dt>
      <dd className="text-foreground">{value}</dd>
    </div>
  )
}
