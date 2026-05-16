import { useMemo } from 'react'
import { AlertTriangle, CheckCircle2 } from '@landx/icons'
import { validateRow, type ImportField, type RowValidationIssue } from '@/lib/import-schema'

export interface ImportStep4ValidateProps {
  rows: ReadonlyArray<ReadonlyArray<string>>
  mapping: Record<string, string>
  fields: ReadonlyArray<ImportField>
}

export interface ValidationSummary {
  totalRows: number
  validRows: number
  invalidRows: number
  issuesByRow: { rowIndex: number; issues: RowValidationIssue[] }[]
}

export function summarize(
  rows: ReadonlyArray<ReadonlyArray<string>>,
  mapping: Record<string, string>,
  fields: ReadonlyArray<ImportField>,
): ValidationSummary {
  const issuesByRow: ValidationSummary['issuesByRow'] = []
  let valid = 0
  rows.forEach((row, rowIndex) => {
    const { issues } = validateRow(row, mapping, fields)
    if (issues.length === 0) {
      valid += 1
    } else {
      issuesByRow.push({ rowIndex, issues })
    }
  })
  return {
    totalRows: rows.length,
    validRows: valid,
    invalidRows: rows.length - valid,
    issuesByRow,
  }
}

const ISSUE_LIMIT = 50

export function ImportStep4Validate({ rows, mapping, fields }: ImportStep4ValidateProps) {
  const summary = useMemo(() => summarize(rows, mapping, fields), [rows, mapping, fields])
  const visible = summary.issuesByRow.slice(0, ISSUE_LIMIT)

  return (
    <section data-testid="import-step-4" className="space-y-6">
      <header>
        <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          ADIM 4 · DOĞRULA
        </div>
        <h2 className="font-serif text-3xl font-light leading-tight">
          Satırları <span className="font-serif font-light">doğrula</span>
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {summary.invalidRows === 0 ? (
            <>
              Tüm satırlar geçerli. <span className="font-mono">{summary.validRows}</span> kayıt
              içe aktarılacak.
            </>
          ) : (
            <>
              <span className="font-mono">{summary.invalidRows}</span> satırda hata var. Devam edersen
              hatalı satırlar atlanır, <span className="font-mono">{summary.validRows}</span> kayıt
              içe aktarılır.
            </>
          )}
        </p>
      </header>

      <div className="grid grid-cols-3 gap-3" data-testid="import-validate-summary">
        <SummaryCard
          icon={<CheckCircle2 className="h-4 w-4" aria-hidden />}
          label="Geçerli"
          value={summary.validRows}
        />
        <SummaryCard
          icon={<AlertTriangle className="h-4 w-4" aria-hidden />}
          label="Hatalı"
          value={summary.invalidRows}
          warn
        />
        <SummaryCard label="Toplam" value={summary.totalRows} />
      </div>

      {summary.issuesByRow.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-card">
              <tr>
                <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  Satır
                </th>
                <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  Alan
                </th>
                <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  Sorun
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visible.flatMap(({ rowIndex, issues }) =>
                issues.map((issue, j) => (
                  <tr
                    key={`${rowIndex}-${j}`}
                    data-testid={`import-validate-row-${rowIndex}`}
                  >
                    <td className="px-3 py-2 font-mono text-[11px] tabular-nums text-muted-foreground">
                      {rowIndex + 1}
                    </td>
                    <td className="px-3 py-2 text-sm">{issue.field}</td>
                    <td className="px-3 py-2 text-sm text-destructive">{issue.message}</td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
          {summary.issuesByRow.length > ISSUE_LIMIT && (
            <div className="border-t border-border bg-card px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              ilk {ISSUE_LIMIT} hatalı satır gösteriliyor · toplam {summary.issuesByRow.length}
            </div>
          )}
        </div>
      )}
    </section>
  )
}

function SummaryCard({
  icon,
  label,
  value,
  warn,
}: {
  icon?: React.ReactNode
  label: string
  value: number
  warn?: boolean
}) {
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2.5">
      <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {icon}
        {label}
      </div>
      <div
        className={`mt-1 font-mono text-2xl tabular-nums ${warn && value > 0 ? 'text-destructive' : 'text-foreground'}`}
      >
        {value}
      </div>
    </div>
  )
}
