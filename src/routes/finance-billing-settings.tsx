import { useEffect, useState } from 'react'
import { Building2, Check, Loader2, Mail } from '@landx/icons'
import { PageShell, cn } from '@landx/ui'
import { useBillingProfile, useUpdateBillingProfile } from '@landx/data'
import { useToast } from '@/lib/use-toast'

interface FormState {
  legalName: string
  taxId: string
  taxOffice: string
  kepAddress: string
  address: string
  city: string
  district: string
  zipCode: string
  email: string
  phone: string
  isEInvoiceTaxpayer: boolean
}

const EMPTY: FormState = {
  legalName: '',
  taxId: '',
  taxOffice: '',
  kepAddress: '',
  address: '',
  city: '',
  district: '',
  zipCode: '',
  email: '',
  phone: '',
  isEInvoiceTaxpayer: false,
}

export function FinanceBillingSettings() {
  const { data: profile, isLoading } = useBillingProfile()
  const update = useUpdateBillingProfile()
  const { toast } = useToast()

  const [form, setForm] = useState<FormState>(EMPTY)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (profile) {
      setForm({
        legalName: profile.legalName,
        taxId: profile.taxId,
        taxOffice: profile.taxOffice,
        kepAddress: profile.kepAddress ?? '',
        address: profile.address,
        city: profile.city,
        district: profile.district,
        zipCode: profile.zipCode ?? '',
        email: profile.email,
        phone: profile.phone ?? '',
        isEInvoiceTaxpayer: !!profile.kepAddress,
      })
      setDirty(false)
    }
  }, [profile])

  const handleField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setDirty(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return
    update.mutate(
      {
        legalName: form.legalName.trim(),
        taxId: form.taxId.trim(),
        taxOffice: form.taxOffice.trim(),
        kepAddress: form.isEInvoiceTaxpayer ? form.kepAddress.trim() || undefined : undefined,
        address: form.address.trim(),
        city: form.city.trim(),
        district: form.district.trim(),
        zipCode: form.zipCode.trim() || undefined,
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast('Vergi profili güncellendi.', { variant: 'success' })
          setDirty(false)
        },
        onError: () => {
          toast('Güncelleme başarısız oldu.', { variant: 'error' })
        },
      },
    )
  }

  return (
    <PageShell
      eyebrow="MOD · FİNANS · AYARLAR"
      title={
        <>
          Fatura <em className="font-serif italic font-light">ayarları</em>
        </>
      }
      description="Vergi numarası, vergi dairesi, KEP adresi ve fatura iletişim bilgileri. E-fatura mükellefi için zorunlu alanlar."
    >
      {isLoading || !profile ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          Profil yükleniyor…
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          <div className="flex flex-col gap-6">
            <Section
              icon={Building2}
              title="Şirket bilgileri"
              description="Faturada görünecek tüzel kişi bilgileri."
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Şirket unvanı" required>
                  <input
                    type="text"
                    value={form.legalName}
                    onChange={(e) => handleField('legalName', e.target.value)}
                    required
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
                  />
                </Field>
                <Field label="Vergi numarası" required>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.taxId}
                    onChange={(e) => handleField('taxId', e.target.value)}
                    required
                    pattern="[0-9]{10,11}"
                    title="10 veya 11 haneli vergi/TC kimlik no"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-sm tabular-nums outline-none focus:border-foreground"
                  />
                </Field>
                <Field label="Vergi dairesi" required>
                  <input
                    type="text"
                    value={form.taxOffice}
                    onChange={(e) => handleField('taxOffice', e.target.value)}
                    required
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
                  />
                </Field>
                <Field label="Posta kodu">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.zipCode}
                    onChange={(e) => handleField('zipCode', e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-sm tabular-nums outline-none focus:border-foreground"
                  />
                </Field>
              </div>
            </Section>

            <Section
              icon={Building2}
              title="Fatura adresi"
              description="Yasal kayıtta görünecek adres."
            >
              <div className="grid grid-cols-1 gap-4">
                <Field label="Adres" required>
                  <textarea
                    value={form.address}
                    onChange={(e) => handleField('address', e.target.value)}
                    required
                    rows={2}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
                  />
                </Field>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label="İlçe" required>
                    <input
                      type="text"
                      value={form.district}
                      onChange={(e) => handleField('district', e.target.value)}
                      required
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
                    />
                  </Field>
                  <Field label="Şehir" required>
                    <input
                      type="text"
                      value={form.city}
                      onChange={(e) => handleField('city', e.target.value)}
                      required
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
                    />
                  </Field>
                </div>
              </div>
            </Section>

            <Section
              icon={Mail}
              title="E-fatura & iletişim"
              description="KEP adresi e-fatura mükellefiyseniz zorunludur."
            >
              <div className="grid grid-cols-1 gap-4">
                <label className="flex items-start gap-3 rounded-xl border border-border bg-background p-3 text-sm">
                  <input
                    type="checkbox"
                    checked={form.isEInvoiceTaxpayer}
                    onChange={(e) => handleField('isEInvoiceTaxpayer', e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-border text-foreground focus:ring-0"
                  />
                  <span className="flex-1">
                    <span className="font-medium">E-fatura mükellefiyiz</span>
                    <span className="mt-0.5 block text-[12px] text-muted-foreground">
                      İşaretli ise KEP adresi üzerinden e-fatura gönderilir.
                    </span>
                  </span>
                </label>

                {form.isEInvoiceTaxpayer && (
                  <Field label="KEP adresi" required>
                    <input
                      type="email"
                      value={form.kepAddress}
                      onChange={(e) => handleField('kepAddress', e.target.value)}
                      required={form.isEInvoiceTaxpayer}
                      placeholder="ornek@hs01.kep.tr"
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-foreground"
                    />
                  </Field>
                )}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label="Fatura e-postası" required>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => handleField('email', e.target.value)}
                      required
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
                    />
                  </Field>
                  <Field label="Telefon">
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => handleField('phone', e.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-foreground"
                    />
                  </Field>
                </div>
              </div>
            </Section>
          </div>

          <aside className="flex flex-col gap-4">
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Profil özeti
              </div>
              <h3 className="mt-1 font-serif text-lg font-medium tracking-tight">
                {form.legalName || 'Şirket unvanı —'}
              </h3>
              <dl className="mt-4 space-y-2 text-[12px]">
                <SummaryRow label="VKN" value={form.taxId || '—'} mono />
                <SummaryRow label="V.D." value={form.taxOffice || '—'} />
                <SummaryRow
                  label="E-fatura"
                  value={form.isEInvoiceTaxpayer ? 'Mükellef' : 'Mükellef değil'}
                />
                {form.isEInvoiceTaxpayer && (
                  <SummaryRow label="KEP" value={form.kepAddress || '—'} mono />
                )}
              </dl>
            </div>

            <div className="sticky top-24 flex flex-col gap-2">
              <button
                type="submit"
                disabled={!dirty || update.isPending}
                className={cn(
                  'inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition',
                  dirty && !update.isPending
                    ? 'bg-foreground text-background hover:opacity-90'
                    : 'cursor-not-allowed bg-foreground/10 text-muted-foreground',
                )}
              >
                {update.isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Kaydediliyor…
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    Değişiklikleri kaydet
                  </>
                )}
              </button>
              {!dirty && !update.isPending && (
                <p className="text-center font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  değişiklik yok
                </p>
              )}
            </div>
          </aside>
        </form>
      )}
    </PageShell>
  )
}

function Section({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof Building2
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <header className="mb-4 flex items-start gap-3">
        <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-foreground/10 text-foreground">
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <h3 className="font-serif text-lg font-medium tracking-tight">{title}</h3>
          <p className="text-[12px] text-muted-foreground">{description}</p>
        </div>
      </header>
      {children}
    </section>
  )
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
        {required && <span className="ml-1 text-foreground">*</span>}
      </span>
      {children}
    </label>
  )
}

function SummaryRow({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </dt>
      <dd className={cn('truncate text-right text-foreground', mono && 'font-mono tabular-nums')}>
        {value}
      </dd>
    </div>
  )
}
