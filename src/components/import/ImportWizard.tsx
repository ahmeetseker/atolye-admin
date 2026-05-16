import { useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Loader2, X } from '@landx/icons'
import { cn } from '@landx/ui'
import { useNavigate } from 'react-router'
import {
  useCreateListing,
  useCreateCustomer,
  type NewListingInput,
  type NewCustomerInput,
} from '@landx/data'
import { parseCsv, type CsvParseResult } from '@landx/ui/lib'
import {
  autoMapColumns,
  getFieldsForEntity,
  projectRow,
  type ImportEntity,
} from '@/lib/import-schema'
import { ImportStep1Upload } from './ImportStep1Upload'
import { ImportStep2Preview } from './ImportStep2Preview'
import { ImportStep3Map } from './ImportStep3Map'
import { ImportStep4Validate, summarize } from './ImportStep4Validate'
import { ImportStep5Confirm } from './ImportStep5Confirm'
import { useToast } from '@/lib/use-toast'

export interface ImportWizardProps {
  entity: ImportEntity
  /** Optional callback fired after a successful import. */
  onComplete?: (count: number) => void
}

type Step = 1 | 2 | 3 | 4 | 5

const STEPS: { id: Step; label: string }[] = [
  { id: 1, label: 'Yükle' },
  { id: 2, label: 'Ön izleme' },
  { id: 3, label: 'Eşle' },
  { id: 4, label: 'Doğrula' },
  { id: 5, label: 'Onay' },
]

export function ImportWizard({ entity, onComplete }: ImportWizardProps) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const fields = useMemo(() => getFieldsForEntity(entity), [entity])

  const [step, setStep] = useState<Step>(1)
  const [csvText, setCsvText] = useState<string>('')
  const [filename, setFilename] = useState<string | null>(null)
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [importing, setImporting] = useState(false)
  const [importedCount, setImportedCount] = useState<number | null>(null)
  const [importError, setImportError] = useState<string | null>(null)

  const parseResult: CsvParseResult = useMemo(() => {
    if (!csvText) return { headers: [], rows: [], errors: [] }
    return parseCsv(csvText)
  }, [csvText])

  const validationSummary = useMemo(
    () => summarize(parseResult.rows, mapping, fields),
    [parseResult.rows, mapping, fields],
  )

  const createListing = useCreateListing()
  const createCustomer = useCreateCustomer()

  // Required fields must be in the mapping before user can leave step 3.
  const mappedFieldIds = new Set(Object.values(mapping))
  const missingRequired = fields.filter((f) => f.required && !mappedFieldIds.has(f.id))

  const canGoNext = (() => {
    switch (step) {
      case 1:
        return csvText.length > 0
      case 2:
        return parseResult.rows.length > 0
      case 3:
        return missingRequired.length === 0
      case 4:
        return validationSummary.validRows > 0
      case 5:
        return false
      default:
        return false
    }
  })()

  const handleUploaded = (text: string, name: string) => {
    setFilename(name)
    setCsvText(text)
    const parsed = parseCsv(text)
    setMapping(autoMapColumns(parsed.headers, fields))
    setStep(2)
  }

  const goNext = () => {
    if (!canGoNext) return
    if (step < 5) setStep((step + 1) as Step)
  }

  const goBack = () => {
    if (step > 1) setStep((step - 1) as Step)
  }

  const cancel = () => {
    navigate(entity === 'listing' ? '/listings' : '/customers')
  }

  const doImport = async () => {
    if (importing) return
    setImporting(true)
    setImportError(null)
    const validRows = parseResult.rows.filter((_row, i) => {
      const issues = validationSummary.issuesByRow.find((r) => r.rowIndex === i)
      return !issues
    })
    let imported = 0
    let firstId: string | null = null
    try {
      for (const row of validRows) {
        const projected = projectRow(row, mapping, fields)
        if (entity === 'listing') {
          // Required fields are guaranteed present by validation; cast through
          // unknown is safe since projectRow → numbers + strings match the
          // NewListingInput shape (title/city/district/size/price required).
          const result = await createListing.mutateAsync(projected as unknown as NewListingInput)
          if (!firstId) firstId = result.id
        } else {
          const result = await createCustomer.mutateAsync(projected as unknown as NewCustomerInput)
          if (!firstId) firstId = result.id
        }
        imported += 1
      }
      setImportedCount(imported)
      toast(`${imported} ${entity === 'listing' ? 'ilan' : 'müşteri'} içe aktarıldı.`, {
        variant: 'success',
      })
      onComplete?.(imported)
      // Tiny delay so the success banner is visible before navigation.
      setTimeout(() => {
        const target = entity === 'listing' ? '/listings' : '/customers'
        const qs = firstId ? `?highlight=${encodeURIComponent(firstId)}` : ''
        navigate(`${target}${qs}`)
      }, 600)
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'İçe aktarım başarısız.')
      toast('İçe aktarım sırasında hata oluştu.', { variant: 'error' })
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background pb-32" data-testid="import-wizard" data-entity={entity}>
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              MOD · {entity === 'listing' ? 'İLAN' : 'MÜŞTERİ'} İÇE AKTAR
            </span>
            <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
              %{Math.round(((step - 1) / (STEPS.length - 1)) * 100)} tamamlandı
            </span>
          </div>
          <button
            type="button"
            onClick={cancel}
            aria-label="Sihirbazı kapat"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-foreground/5 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mx-auto flex max-w-[1100px] items-center gap-0 px-4 pb-3">
          {STEPS.map((s, i) => {
            const reached = step >= s.id
            return (
              <div
                key={s.id}
                data-testid={`import-step-indicator-${s.id}`}
                className="flex flex-1 items-center gap-2"
              >
                <span
                  aria-current={step === s.id ? 'step' : undefined}
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-full border font-mono text-[11px] font-medium transition',
                    reached
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-border bg-card text-muted-foreground',
                  )}
                >
                  {s.id}
                </span>
                <span
                  className={cn(
                    'flex-none text-[12px] font-medium',
                    reached ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {s.label}
                </span>
                {i < STEPS.length - 1 && (
                  <span
                    aria-hidden
                    className={cn('h-px flex-1', step > s.id ? 'bg-foreground' : 'bg-border')}
                  />
                )}
              </div>
            )
          })}
        </div>
      </header>

      <main className="mx-auto max-w-[840px] px-4 py-8 md:py-12">
        {step === 1 && <ImportStep1Upload onText={handleUploaded} />}
        {step === 2 && <ImportStep2Preview filename={filename} parseResult={parseResult} />}
        {step === 3 && (
          <ImportStep3Map
            headers={parseResult.headers}
            fields={fields}
            mapping={mapping}
            onMappingChange={setMapping}
          />
        )}
        {step === 4 && (
          <ImportStep4Validate rows={parseResult.rows} mapping={mapping} fields={fields} />
        )}
        {step === 5 && (
          <ImportStep5Confirm
            entity={entity}
            filename={filename}
            validCount={validationSummary.validRows}
            invalidCount={validationSummary.invalidRows}
            importing={importing}
            importedCount={importedCount}
            error={importError}
          />
        )}
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between gap-3 px-4 py-3">
          <button
            type="button"
            onClick={cancel}
            data-testid="import-cancel"
            className="text-sm text-muted-foreground transition hover:text-foreground"
          >
            İptal
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goBack}
              disabled={step === 1 || importing}
              data-testid="import-back"
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium transition hover:bg-foreground/5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ArrowLeft className="h-4 w-4" /> Geri
            </button>
            {step < 5 ? (
              <button
                type="button"
                onClick={goNext}
                disabled={!canGoNext}
                data-testid="import-next"
                className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                İleri <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={doImport}
                disabled={importing || importedCount != null || validationSummary.validRows === 0}
                data-testid="import-confirm"
                className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                İçe aktar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
