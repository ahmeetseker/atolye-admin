import type { CsvParseResult } from '@landx/ui/lib'
import { AlertTriangle } from '@landx/icons'

export interface ImportStep2PreviewProps {
  filename: string | null
  parseResult: CsvParseResult
}

const PREVIEW_LIMIT = 10

export function ImportStep2Preview({ filename, parseResult }: ImportStep2PreviewProps) {
  const { headers, rows, errors } = parseResult
  const previewRows = rows.slice(0, PREVIEW_LIMIT)

  return (
    <section data-testid="import-step-2" className="space-y-6">
      <header>
        <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          ADIM 2 · ÖN İZLEME
        </div>
        <h2 className="font-serif text-3xl font-light leading-tight">
          Veriyi <span className="font-serif font-light">gözden geçir</span>
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {filename ? (
            <>
              <span className="font-mono text-foreground">{filename}</span> — {rows.length} satır,{' '}
              {headers.length} sütun
            </>
          ) : (
            <>
              {rows.length} satır, {headers.length} sütun
            </>
          )}
        </p>
      </header>

      {errors.length > 0 && (
        <div
          data-testid="import-parse-errors"
          role="alert"
          className="space-y-1 rounded-xl border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em]">
            <AlertTriangle className="h-3 w-3" aria-hidden /> Ayrıştırma hatası
          </div>
          <ul className="ml-4 list-disc text-xs">
            {errors.slice(0, 5).map((err, i) => (
              <li key={i}>
                Satır {err.line}: {err.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-card">
            <tr>
              <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                #
              </th>
              {headers.map((h, i) => (
                <th
                  key={i}
                  className="whitespace-nowrap px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
                >
                  {h || <span className="text-muted-foreground/50">(boş)</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {previewRows.map((row, ri) => (
              <tr key={ri} data-testid={`import-preview-row-${ri}`}>
                <td className="px-3 py-2 font-mono text-[11px] tabular-nums text-muted-foreground">
                  {ri + 1}
                </td>
                {headers.map((_h, ci) => (
                  <td key={ci} className="px-3 py-2 whitespace-nowrap text-sm">
                    {row[ci] ?? ''}
                  </td>
                ))}
              </tr>
            ))}
            {previewRows.length === 0 && (
              <tr>
                <td
                  colSpan={headers.length + 1}
                  className="px-3 py-6 text-center text-sm text-muted-foreground"
                >
                  Veri satırı bulunamadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {rows.length > PREVIEW_LIMIT && (
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          {PREVIEW_LIMIT} satır gösteriliyor · toplam {rows.length}
        </p>
      )}
    </section>
  )
}
