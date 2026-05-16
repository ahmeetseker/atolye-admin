import type { ImportField } from '@/lib/import-schema'
import { AlertTriangle } from '@landx/icons'

export interface ImportStep3MapProps {
  headers: ReadonlyArray<string>
  fields: ReadonlyArray<ImportField>
  /** Mapping keyed by column-index string → field id. */
  mapping: Record<string, string>
  onMappingChange: (next: Record<string, string>) => void
}

const UNMAPPED = '__none__'

export function ImportStep3Map({ headers, fields, mapping, onMappingChange }: ImportStep3MapProps) {
  const requiredFieldIds = fields.filter((f) => f.required).map((f) => f.id)
  const mappedFieldIds = new Set(Object.values(mapping))
  const missingRequired = requiredFieldIds.filter((id) => !mappedFieldIds.has(id))

  const updateOne = (colIndex: number, fieldId: string) => {
    const next: Record<string, string> = { ...mapping }
    if (fieldId === UNMAPPED) {
      delete next[String(colIndex)]
    } else {
      next[String(colIndex)] = fieldId
    }
    onMappingChange(next)
  }

  return (
    <section data-testid="import-step-3" className="space-y-6">
      <header>
        <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          ADIM 3 · EŞLEŞTİR
        </div>
        <h2 className="font-serif text-3xl font-light leading-tight">
          CSV sütunlarını <span className="font-serif font-light">alanlarla</span> eşle
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Otomatik eşleştirme yapıldı — ihtiyaç olursa elle değiştir. Zorunlu alanların eşlenmesi
          gerekir.
        </p>
      </header>

      {missingRequired.length > 0 && (
        <div
          data-testid="import-missing-required"
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/5 px-3 py-2 text-sm"
          style={{ borderColor: 'hsl(var(--warning, 36 90% 50%) / 0.4)' }}
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-none text-foreground" aria-hidden />
          <div>
            <div className="font-medium">Eşlenmemiş zorunlu alan</div>
            <div className="text-xs text-muted-foreground">
              {missingRequired
                .map((id) => fields.find((f) => f.id === id)?.label ?? id)
                .join(', ')}
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-card">
            <tr>
              <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                CSV sütunu
              </th>
              <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Alan
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {headers.map((header, idx) => {
              const fieldId = mapping[String(idx)]
              return (
                <tr key={idx} data-testid={`import-map-row-${idx}`}>
                  <td className="px-3 py-2 align-middle">
                    <div className="text-sm font-medium">{header || <em className="text-muted-foreground">(boş başlık)</em>}</div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      kolon {idx + 1}
                    </div>
                  </td>
                  <td className="px-3 py-2 align-middle">
                    <select
                      aria-label={`Sütun ${idx + 1} eşleştirme`}
                      data-testid={`import-map-select-${idx}`}
                      value={fieldId ?? UNMAPPED}
                      onChange={(e) => updateOne(idx, e.target.value)}
                      className="w-full rounded-lg border border-border bg-card px-2 py-1.5 text-sm outline-none focus:border-foreground"
                    >
                      <option value={UNMAPPED}>— yok say —</option>
                      {fields.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.label}
                          {f.required ? ' *' : ''}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
