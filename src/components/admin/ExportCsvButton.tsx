import { Download } from '@landx/icons'
import { downloadCsv, toCsv, todayStamp, type CsvColumn } from '@/lib/csv-export'

interface ExportCsvButtonProps<T> {
  /** Filtered rows currently shown to the user. */
  rows: T[]
  /** Column definitions; cells are derived from `row[col.key]`. */
  columns: CsvColumn<T>[]
  /** Filename prefix; date suffix is appended automatically. */
  filenamePrefix: string
  /** Display label, defaults to "CSV indir". */
  label?: string
}

export function ExportCsvButton<T>({
  rows,
  columns,
  filenamePrefix,
  label = 'CSV indir',
}: ExportCsvButtonProps<T>) {
  const handleClick = () => {
    const csv = toCsv(rows, columns)
    downloadCsv(`${filenamePrefix}-${todayStamp()}.csv`, csv)
  }
  return (
    <button
      type="button"
      data-testid="export-csv-button"
      onClick={handleClick}
      disabled={rows.length === 0}
      className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium transition hover:bg-foreground/5 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Download className="h-3.5 w-3.5" />
      {label}
      <span className="hidden font-mono text-[10px] tabular-nums text-muted-foreground md:inline">
        ({rows.length})
      </span>
    </button>
  )
}
