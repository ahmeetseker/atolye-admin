import { useRef, useState } from 'react'
import { AlertTriangle, FileText, Upload } from '@landx/icons'
import { cn } from '@landx/ui'

const MAX_BYTES = 5 * 1024 * 1024

export interface ImportStep1UploadProps {
  onText: (text: string, filename: string) => void
}

export function ImportStep1Upload({ onText }: ImportStep1UploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reading, setReading] = useState(false)

  const handleFile = (file: File) => {
    setError(null)
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Yalnız .csv uzantılı dosyalar destekleniyor.')
      return
    }
    if (file.size > MAX_BYTES) {
      setError(`Dosya 5 MB'ı aşıyor (${(file.size / 1024 / 1024).toFixed(1)} MB).`)
      return
    }
    setReading(true)
    const reader = new FileReader()
    reader.onload = () => {
      setReading(false)
      const text = typeof reader.result === 'string' ? reader.result : ''
      if (!text) {
        setError('Dosya boş veya okunamadı.')
        return
      }
      onText(text, file.name)
    }
    reader.onerror = () => {
      setReading(false)
      setError('Dosya okunurken bir hata oluştu.')
    }
    reader.readAsText(file, 'utf-8')
  }

  return (
    <section data-testid="import-step-1" className="space-y-6">
      <header>
        <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          ADIM 1 · YÜKLE
        </div>
        <h2 className="font-serif text-3xl font-light leading-tight">
          CSV <span className="font-serif font-light">dosyasını</span> seç
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          UTF-8 önerilir. İlk satır başlık olmalı. En fazla 5 MB.
        </p>
      </header>

      <div
        data-testid="import-dropzone"
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          const file = e.dataTransfer.files[0]
          if (file) handleFile(file)
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-12 text-center transition',
          dragOver
            ? 'border-foreground bg-foreground/5'
            : 'border-border bg-card/50 hover:border-foreground/40 hover:bg-foreground/[0.02]',
        )}
      >
        <Upload className="h-8 w-8 text-muted-foreground" aria-hidden />
        <div>
          <div className="text-sm font-medium">Dosyayı buraya bırak ya da seçmek için tıkla</div>
          <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            .csv · maks. 5 MB · UTF-8
          </div>
        </div>
        <input
          ref={inputRef}
          data-testid="import-file-input"
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
            e.target.value = ''
          }}
        />
      </div>

      {reading && (
        <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          okunuyor…
        </div>
      )}

      {error && (
        <div
          data-testid="import-upload-error"
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" aria-hidden />
          <span>{error}</span>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card/50 px-4 py-3 text-xs text-muted-foreground">
        <div className="mb-1 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em]">
          <FileText className="h-3 w-3" aria-hidden /> Şablon önerisi
        </div>
        <p>
          İlk satır: <span className="font-mono">Başlık,İl,İlçe,Tür,Alan,Fiyat</span> (ilanlar) ya da{' '}
          <span className="font-mono">Ad Soyad,Segment,Telefon,E-posta</span> (müşteriler). TR Excel
          dosyaları için noktalı virgül (<span className="font-mono">;</span>) de desteklenir.
        </p>
      </div>
    </section>
  )
}
