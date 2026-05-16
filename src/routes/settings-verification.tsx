import { useRef, useTransition } from 'react'
import { ArrowLeft, CheckCircle2, AlertCircle, Clock, Upload, FileText } from '@landx/icons'
import { PageShell, cn } from '@landx/ui'
import { Link } from 'react-router'
import { useOfficeVerification, useSubmitVerificationDoc } from '@landx/data'
import type { OfficeVerificationDoc, OfficeVerificationDocStatus } from '@landx/data'

type RequiredDocType = 'tax_certificate' | 'kep_address' | 'broker_license'

interface DocSlot {
  type: RequiredDocType
  title: string
  description: string
}

const DOC_SLOTS: DocSlot[] = [
  {
    type: 'tax_certificate',
    title: 'Vergi Levhası',
    description:
      'Geçerli bir vergi levhası. PDF veya JPG. Maksimum 5 MB.',
  },
  {
    type: 'kep_address',
    title: 'KEP Adresi',
    description: 'Kayıtlı Elektronik Posta (KEP) doğrulama belgesi.',
  },
  {
    type: 'broker_license',
    title: 'Broker Yetki Belgesi',
    description:
      'Yetki belgesi (TARSEM/sektörel düzenleyici tarafından verilmiş).',
  },
]

function StatusBadge({ status }: { status: OfficeVerificationDocStatus }) {
  if (status === 'approved') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
        <CheckCircle2 className="h-3 w-3" />
        Onaylı
      </span>
    )
  }
  if (status === 'rejected') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-rose-700 dark:text-rose-300">
        <AlertCircle className="h-3 w-3" />
        Reddedildi
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-700 dark:text-amber-300">
      <Clock className="h-3 w-3" />
      İncelemede
    </span>
  )
}

function OverallBadge({ status }: { status: 'incomplete' | 'pending_review' | 'verified' | 'rejected' }) {
  const map = {
    verified: { label: 'Doğrulanmış', cls: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' },
    pending_review: { label: 'İnceleme bekliyor', cls: 'bg-amber-500/10 text-amber-700 dark:text-amber-300' },
    incomplete: { label: 'Eksik', cls: 'bg-foreground/10 text-muted-foreground' },
    rejected: { label: 'Reddedildi', cls: 'bg-rose-500/10 text-rose-700 dark:text-rose-300' },
  } as const
  const item = map[status]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide',
        item.cls,
      )}
    >
      {item.label}
    </span>
  )
}

interface UploadRowProps {
  slot: DocSlot
  latest: OfficeVerificationDoc | null
}

function UploadRow({ slot, latest }: UploadRowProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [, startTransition] = useTransition()
  const submitMutation = useSubmitVerificationDoc()

  const handlePick = () => inputRef.current?.click()

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    startTransition(() => {
      submitMutation.mutate({ type: slot.type, fileName: file.name })
    })
    e.target.value = ''
  }

  return (
    <li
      data-settings-verification-row={slot.type}
      className="flex flex-wrap items-start gap-3 rounded-2xl border border-border bg-card p-4"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-foreground/5">
        <FileText className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-medium">{slot.title}</h3>
          {latest ? (
            <StatusBadge status={latest.status} />
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-foreground/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Yüklenmedi
            </span>
          )}
        </div>
        <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{slot.description}</p>
        {latest && (
          <div className="mt-2 inline-flex items-center gap-2 rounded-lg bg-background px-2.5 py-1 font-mono text-[11px] tabular-nums text-muted-foreground">
            <FileText className="h-3 w-3" />
            {latest.fileName}
            <span className="text-muted-foreground/60">
              · {new Date(latest.uploadedAt).toLocaleDateString('tr-TR')}
            </span>
          </div>
        )}
        {latest?.rejectionReason && (
          <div className="mt-2 inline-flex items-center gap-1 rounded-lg bg-rose-500/5 px-2 py-1 text-[11px] text-rose-700 dark:text-rose-300">
            <AlertCircle className="h-3 w-3" />
            Sebep: {latest.rejectionReason}
          </div>
        )}
      </div>
      <div className="shrink-0">
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          className="hidden"
          onChange={handleFile}
          data-testid={`settings-verification-file-${slot.type}`}
        />
        <button
          type="button"
          onClick={handlePick}
          disabled={submitMutation.isPending}
          data-testid={`settings-verification-upload-${slot.type}`}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-medium transition hover:bg-foreground/5 disabled:opacity-50"
        >
          <Upload className="h-3.5 w-3.5" />
          {submitMutation.isPending ? 'Yükleniyor…' : latest ? 'Yeni belge yükle' : 'Belge yükle'}
        </button>
      </div>
    </li>
  )
}

/**
 * /settings/verification — Wave F32 / W3B.
 *
 * Kurumsal doğrulama: 3 belge satırı (Vergi Levhası | KEP | Broker Yetki).
 * Her satır mevcut durum + dosya yükle (mock — gerçek upload yok, sadece
 * dosya adı kaydedilir).
 */
export function SettingsVerification() {
  const { data, isPending } = useOfficeVerification()

  const latestByType = (type: RequiredDocType): OfficeVerificationDoc | null => {
    if (!data) return null
    const docs = data.documents.filter((d) => d.type === type)
    if (docs.length === 0) return null
    return [...docs].sort(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
    )[0] ?? null
  }

  return (
    <PageShell
      eyebrow="MOD · DOĞRULAMA"
      title={
        <>
          Kurumsal <em className="font-serif italic font-light">doğrulama</em>
        </>
      }
      description="Ofisinin doğrulanması için Vergi Levhası, KEP Adresi ve Broker Yetki Belgesi yüklenmelidir. Tüm belgeler onaylandığında ofis Doğrulanmış statüsü alır."
      actions={
        <Link
          to="/settings"
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium transition hover:bg-foreground/5 md:min-h-0 md:w-auto"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Ayarlara dön
        </Link>
      }
    >
      {isPending || !data ? (
        <div role="status" aria-busy="true" className="animate-pulse space-y-3">
          <div className="h-24 rounded-2xl bg-foreground/5" />
          <div className="h-24 rounded-2xl bg-foreground/5" />
          <div className="h-24 rounded-2xl bg-foreground/5" />
        </div>
      ) : (
        <>
          <section
            data-settings-verification-overall=""
            className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4"
          >
            <div>
              <h2 className="font-serif text-base font-light tracking-tight">Genel durum</h2>
              <p className="text-[12px] text-muted-foreground">
                Son güncelleme:{' '}
                <span className="font-mono tabular-nums">
                  {new Date(data.updatedAt).toLocaleDateString('tr-TR')}
                </span>
              </p>
            </div>
            <OverallBadge status={data.overallStatus} />
          </section>

          <ul className="space-y-3" data-testid="settings-verification-list">
            {DOC_SLOTS.map((slot) => (
              <UploadRow key={slot.type} slot={slot} latest={latestByType(slot.type)} />
            ))}
          </ul>
        </>
      )}
    </PageShell>
  )
}
