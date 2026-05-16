import { useMemo, useState, useTransition } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { ArrowLeft, ArrowRight, Check, Loader2 } from '@landx/icons'
import { formatTLCompact } from '@landx/ui'
import { useCreateCustomer, type Customer } from '@landx/data'
import { WizardShell } from '@/components/customer-wizard/WizardShell'

interface FormState {
  // step 1 — Kimlik
  name: string
  phone: string
  email: string
  // step 2 — İlişki
  segment: Customer['segment']
  stage: Customer['stage']
  // step 3 — Ticari
  value: string
  source: Customer['source']
  owner: string
  interestArea: string
  // step 4 — Onay
  kvkkAccept: boolean
}

const EMPTY: FormState = {
  name: '',
  phone: '',
  email: '',
  segment: 'Ilık',
  stage: 'İlk temas',
  value: '',
  source: 'Sahibinden',
  owner: 'Ahmet',
  interestArea: '',
  kvkkAccept: false,
}

const SEGMENTS: Customer['segment'][] = ['Sıcak', 'Ilık', 'Soğuk']
const STAGES: Customer['stage'][] = ['İlk temas', 'Görüşme', 'Teklif', 'Kaparo', 'Tapu']
const SOURCES: Customer['source'][] = ['Sahibinden', 'Hürriyet Emlak', 'Referans', 'Sosyal Medya', 'Walk-in']

export function CustomerNew() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [, startTransition] = useTransition()
  const create = useCreateCustomer()

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((prev) => ({ ...prev, [k]: v }))

  const canGoNext = useMemo(() => {
    switch (step) {
      case 1:
        return form.name.trim().length > 0
      case 2:
        return Boolean(form.segment) && Boolean(form.stage)
      case 3:
        return form.value.length > 0 && Number(form.value) > 0 && form.owner.trim().length > 0
      case 4:
        return form.kvkkAccept
      default:
        return false
    }
  }, [step, form])

  const goNext = () => {
    startTransition(() => setStep((s) => Math.min(4, s + 1)))
  }
  const goBack = () => {
    startTransition(() => setStep((s) => Math.max(1, s - 1)))
  }

  const handleSubmit = async () => {
    if (!canGoNext) return
    try {
      await create.mutateAsync({
        name: form.name.trim(),
        segment: form.segment,
        stage: form.stage,
        value: Number(form.value),
        source: form.source,
        owner: form.owner.trim(),
        interestArea: form.interestArea.trim(),
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
      })
      navigate('/customers')
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <WizardShell currentStep={step}>
      {step === 1 && (
        <section>
          <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">ADIM 1 · KİMLİK</div>
          <h1 className="font-serif text-3xl font-light leading-tight">
            Müşteri <em className="font-serif italic font-light">kim</em>?
          </h1>
          <p className="mt-2 text-muted-foreground">İletişim bilgileri opsiyonel ama hatırlatma kurabilmek için faydalı.</p>

          <div className="mt-8 space-y-4">
            <Field id="name" label="Ad soyad">
              <input
                id="name"
                data-testid="customer-field-name"
                type="text"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="Örn: Burhan Kaynak"
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-foreground placeholder:text-[hsl(var(--placeholder))]"
                required
                autoFocus
              />
            </Field>
            <Field id="phone" label="Telefon" hint="E.164 önerilir — +90...">
              <input
                id="phone"
                data-testid="customer-field-phone"
                type="tel"
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                placeholder="+90 5xx xxx xx xx"
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-foreground placeholder:text-[hsl(var(--placeholder))]"
              />
            </Field>
            <Field id="email" label="E-posta">
              <input
                id="email"
                data-testid="customer-field-email"
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="ornek@arsam.net"
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-foreground placeholder:text-[hsl(var(--placeholder))]"
              />
            </Field>
          </div>
        </section>
      )}

      {step === 2 && (
        <section>
          <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">ADIM 2 · İLİŞKİ</div>
          <h1 className="font-serif text-3xl font-light">
            Hangi <em className="font-serif italic font-light">aşama</em>?
          </h1>
          <p className="mt-2 text-muted-foreground">Segment ve süreç adımı — pipeline görünümü için.</p>

          <div className="mt-8 space-y-4">
            <Field id="segment" label="Segment">
              <select
                id="segment"
                data-testid="customer-field-segment"
                value={form.segment}
                onChange={(e) => set('segment', e.target.value as Customer['segment'])}
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-foreground"
              >
                {SEGMENTS.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field id="stage" label="Süreç adımı">
              <select
                id="stage"
                data-testid="customer-field-stage"
                value={form.stage}
                onChange={(e) => set('stage', e.target.value as Customer['stage'])}
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-foreground"
              >
                {STAGES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
          </div>
        </section>
      )}

      {step === 3 && (
        <section>
          <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">ADIM 3 · TİCARİ</div>
          <h1 className="font-serif text-3xl font-light">
            Beklenen <em className="font-serif italic font-light">değer</em>?
          </h1>
          <p className="mt-2 text-muted-foreground">İlgi alanı, kaynak ve sorumlu kişi.</p>

          <div className="mt-8 space-y-4">
            <Field id="value" label="Potansiyel değer (TL)">
              <input
                id="value"
                data-testid="customer-field-value"
                type="number"
                min="1000"
                step="1000"
                value={form.value}
                onChange={(e) => set('value', e.target.value)}
                placeholder="Örn: 8400000"
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-foreground placeholder:text-[hsl(var(--placeholder))]"
                required
              />
            </Field>
            <Field id="source" label="Kaynak">
              <select
                id="source"
                data-testid="customer-field-source"
                value={form.source}
                onChange={(e) => set('source', e.target.value as Customer['source'])}
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-foreground"
              >
                {SOURCES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field id="owner" label="Sorumlu">
              <input
                id="owner"
                data-testid="customer-field-owner"
                type="text"
                value={form.owner}
                onChange={(e) => set('owner', e.target.value)}
                placeholder="Ahmet"
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-foreground placeholder:text-[hsl(var(--placeholder))]"
                required
              />
            </Field>
            <Field id="interestArea" label="İlgi alanı" hint="Bölge, parsel tipi, m²…">
              <input
                id="interestArea"
                type="text"
                value={form.interestArea}
                onChange={(e) => set('interestArea', e.target.value)}
                placeholder="Örn: Ayvalık zeytinlik · 1500 m²+"
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-foreground placeholder:text-[hsl(var(--placeholder))]"
              />
            </Field>
            {form.value && Number(form.value) > 0 && (
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">ÖZET</div>
                <div className="mt-1 flex items-baseline justify-between gap-3">
                  <span className="font-serif text-xl font-light">{formatTLCompact(Number(form.value))}</span>
                  <span className="font-mono text-[11px] text-muted-foreground tabular-nums">{form.segment} · {form.stage}</span>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {step === 4 && (
        <section>
          <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">ADIM 4 · ONAY</div>
          <h1 className="font-serif text-3xl font-light">
            Son <em className="font-serif italic font-light">kontrol</em>
          </h1>
          <p className="mt-2 text-muted-foreground">Özet doğruysa KVKK onayını ver ve kaydet.</p>

          <div className="mt-8 space-y-4">
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">ÖZET</div>
              <dl className="mt-3 space-y-1.5 text-[13px]">
                <Summary label="Ad" value={form.name} />
                {form.phone && <Summary label="Telefon" value={form.phone} />}
                {form.email && <Summary label="E-posta" value={form.email} />}
                <Summary label="Segment · adım" value={`${form.segment} · ${form.stage}`} />
                <Summary label="Değer" value={formatTLCompact(Number(form.value) || 0)} />
                <Summary label="Kaynak · sorumlu" value={`${form.source} · ${form.owner}`} />
                {form.interestArea && <Summary label="İlgi alanı" value={form.interestArea} />}
              </dl>
            </div>
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-card p-4 text-sm">
              <input
                type="checkbox"
                data-testid="customer-field-kvkk-accept"
                checked={form.kvkkAccept}
                onChange={(e) => set('kvkkAccept', e.target.checked)}
                className="mt-0.5 h-4 w-4 flex-none rounded border-border accent-foreground"
                required
              />
              <span className="text-foreground/90">
                Müşteri kişisel verilerini KVKK uyumlu işlediğimi, açık rıza alındığını ve hassas
                bilgileri arsam.net üzerinden paylaşmayacağımı onaylıyorum.
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

      <nav className="mt-10 flex items-center justify-between">
        {step > 1 ? (
          <button
            type="button"
            data-testid="wizard-back"
            onClick={goBack}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium transition hover:bg-foreground/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Geri
          </button>
        ) : (
          <span aria-hidden />
        )}

        {step < 4 ? (
          <button
            type="button"
            data-testid="wizard-next"
            disabled={!canGoNext}
            onClick={goNext}
            className="inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
          >
            İleri <ArrowRight className="h-3.5 w-3.5" />
          </button>
        ) : (
          <button
            type="button"
            data-testid="wizard-submit"
            disabled={!canGoNext || create.isPending}
            onClick={handleSubmit}
            className="inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
          >
            {create.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            {create.isPending ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        )}
      </nav>
    </WizardShell>
  )
}

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </label>
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
