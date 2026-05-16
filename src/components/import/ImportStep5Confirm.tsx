import { CheckCircle2, FileText } from '@landx/icons'
import type { ImportEntity } from '@/lib/import-schema'

export interface ImportStep5ConfirmProps {
  entity: ImportEntity
  filename: string | null
  validCount: number
  invalidCount: number
  importing: boolean
  importedCount: number | null
  error: string | null
}

export function ImportStep5Confirm({
  entity,
  filename,
  validCount,
  invalidCount,
  importing,
  importedCount,
  error,
}: ImportStep5ConfirmProps) {
  const entityLabel = entity === 'listing' ? 'ilan' : 'müşteri'

  return (
    <section data-testid="import-step-5" className="space-y-6">
      <header>
        <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          ADIM 5 · ONAY
        </div>
        <h2 className="font-serif text-3xl font-light leading-tight">
          İçe aktarmaya <span className="font-serif font-light">hazır</span>
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Aşağıdaki özeti gözden geçir, sorun yoksa "İçe aktar"a bas.
        </p>
      </header>

      <dl className="grid grid-cols-1 gap-2 rounded-xl border border-border bg-card px-4 py-3 sm:grid-cols-2">
        <SummaryRow label="Tür" value={entityLabel} />
        <SummaryRow label="Dosya" value={filename ?? '—'} mono />
        <SummaryRow label="Eklenecek" value={String(validCount)} mono highlight />
        <SummaryRow label="Atlanacak (hata)" value={String(invalidCount)} mono />
      </dl>

      <div
        className="flex items-start gap-2 rounded-xl border border-border bg-card/50 px-3 py-2 text-xs text-muted-foreground"
        data-testid="import-confirm-note"
      >
        <FileText className="mt-0.5 h-3.5 w-3.5 flex-none" aria-hidden />
        <span>
          Kayıtlar yerel veri katmanına eklenir. Aynı id'ye sahip satırlar olası duplicate'tir —
          listede en üstte gösterilir. İşlem geri alınamaz; gerekirse listede tek tek silinebilir.
        </span>
      </div>

      {importedCount != null && (
        <div
          data-testid="import-success"
          role="status"
          className="flex items-start gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/5 px-3 py-2 text-sm"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-emerald-500" aria-hidden />
          <span>
            <span className="font-mono">{importedCount}</span> {entityLabel} eklendi. Yönlendiriliyor…
          </span>
        </div>
      )}

      {error && (
        <div
          data-testid="import-error"
          role="alert"
          className="rounded-xl border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      {importing && (
        <div
          data-testid="import-progress"
          className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground"
        >
          içe aktarılıyor…
        </div>
      )}
    </section>
  )
}

function SummaryRow({
  label,
  value,
  mono,
  highlight,
}: {
  label: string
  value: string
  mono?: boolean
  highlight?: boolean
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 sm:flex-col sm:items-start sm:gap-1">
      <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </dt>
      <dd
        className={[
          mono ? 'font-mono tabular-nums' : '',
          highlight ? 'text-lg font-medium text-foreground' : 'text-sm',
        ].join(' ')}
      >
        {value}
      </dd>
    </div>
  )
}
