/**
 * Wave F18.B — Bulk message modal (mock send).
 *
 * No real messaging backend yet — we just queue an entry into
 * `arsam.admin-bulk-messages.v1` so the history is inspectable. Templates
 * substitute `{name}` so the preview pane shows what the first selected
 * customer would actually receive.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { Loader2 } from '@landx/icons'
import type { Customer } from '@landx/data'
import { useToast } from '@/lib/use-toast'

export const BULK_MESSAGES_STORAGE_KEY = 'arsam.admin-bulk-messages.v1'

export interface BulkMessageTemplate {
  id: string
  label: string
  body: string
}

export const BULK_MESSAGE_TEMPLATES: BulkMessageTemplate[] = [
  {
    id: 'new-listing',
    label: 'Yeni ilan duyurusu',
    body: 'Merhaba {name}, yeni eklenen ilanları göstermek isterim.',
  },
  {
    id: 'meeting-reminder',
    label: 'Randevu hatırlatma',
    body: 'Sayın {name}, yarın saat 14:00’teki yer gösterimi için hatırlatmadır.',
  },
  {
    id: 'general-followup',
    label: 'Genel takip',
    body: 'Selam {name}, son durumumuzu görüşmek için müsait misiniz?',
  },
]

export interface BulkMessageRecord {
  id: string
  templateId: string
  customerIds: string[]
  sentAt: string
}

interface BulkMessageModalProps {
  open: boolean
  customers: Customer[]
  onClose: () => void
  onSent?: () => void
}

function renderTemplate(body: string, name: string): string {
  return body.replaceAll('{name}', name)
}

function appendHistory(record: BulkMessageRecord) {
  try {
    const raw = window.localStorage.getItem(BULK_MESSAGES_STORAGE_KEY)
    const list: BulkMessageRecord[] = raw ? (JSON.parse(raw) as BulkMessageRecord[]) : []
    list.push(record)
    window.localStorage.setItem(BULK_MESSAGES_STORAGE_KEY, JSON.stringify(list))
  } catch {
    // localStorage may be unavailable (private mode / quota) — best effort.
  }
}

export function BulkMessageModal({ open, customers, onClose, onSent }: BulkMessageModalProps) {
  const { toast } = useToast()
  const [templateId, setTemplateId] = useState<string>(BULK_MESSAGE_TEMPLATES[0]!.id)
  const [busy, setBusy] = useState(false)
  const cancelRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (open) {
      setTemplateId(BULK_MESSAGE_TEMPLATES[0]!.id)
      setBusy(false)
      queueMicrotask(() => cancelRef.current?.focus())
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, busy])

  const template = useMemo(
    () => BULK_MESSAGE_TEMPLATES.find((t) => t.id === templateId) ?? BULK_MESSAGE_TEMPLATES[0]!,
    [templateId],
  )
  const previewName = customers[0]?.name ?? 'Müşteri'
  const preview = renderTemplate(template.body, previewName)
  const count = customers.length

  if (!open) return null

  const handleSend = async () => {
    setBusy(true)
    try {
      const record: BulkMessageRecord = {
        id: `bm-${Date.now()}`,
        templateId: template.id,
        customerIds: customers.map((c) => c.id),
        sentAt: new Date().toISOString(),
      }
      appendHistory(record)
      // Simulate a short latency so the spinner is visible — mirrors the
      // mockAsync 150ms baseline used elsewhere.
      await new Promise((r) => setTimeout(r, 150))
      toast(`${count} kişiye mesaj kuyruğa alındı`, { variant: 'success' })
      onSent?.()
      onClose()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Bilinmeyen hata'
      toast(`Gönderilemedi: ${msg}`, { variant: 'error' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="bulk-message-title"
      data-testid="bulk-message-modal"
      className="fixed inset-0 z-[80] grid place-items-center p-4 md:p-6"
    >
      <button
        type="button"
        aria-label="Kapat"
        onClick={() => !busy && onClose()}
        className="absolute inset-0 cursor-default bg-foreground/40 backdrop-blur-sm"
      />
      <div
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-xl"
        style={{ contain: 'layout style paint' }}
      >
        <div className="p-4 md:p-6">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            TOPLU MESAJ · {count} ALICI
          </div>
          <h2
            id="bulk-message-title"
            className="mt-1 font-serif text-xl font-light leading-tight"
          >
            Şablon <em className="font-serif italic font-light">seç</em> ve gönder
          </h2>

          <fieldset className="mt-4">
            <label
              htmlFor="bulk-message-template"
              className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
            >
              Şablon
            </label>
            <select
              id="bulk-message-template"
              data-testid="bulk-message-template"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              disabled={busy}
              className="mt-1.5 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-foreground/20 disabled:opacity-50"
            >
              {BULK_MESSAGE_TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </fieldset>

          <div className="mt-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Önizleme — {previewName}
            </div>
            <p
              data-testid="bulk-message-preview"
              className="mt-1.5 rounded-xl border border-border bg-muted/30 px-3 py-3 text-[13px] leading-relaxed text-foreground"
            >
              {preview}
            </p>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-border bg-muted/30 px-4 py-3 md:flex-row md:items-center md:justify-end md:px-6">
          <button
            ref={cancelRef}
            type="button"
            data-testid="bulk-message-cancel"
            onClick={() => !busy && onClose()}
            disabled={busy}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-[13px] font-medium transition hover:bg-foreground/5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            İptal
          </button>
          <button
            type="button"
            data-testid="bulk-message-confirm"
            onClick={handleSend}
            disabled={busy || count === 0}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-foreground px-4 py-2 text-[13px] font-medium text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {busy ? 'Gönderiliyor…' : 'Gönder'}
          </button>
        </div>
      </div>
    </div>
  )
}

export { renderTemplate as renderBulkMessageTemplate }
