import { useEffect } from 'react'
import { Loader2, Trash2 } from '@landx/icons'
import { useDeleteCustomer, type Customer } from '@landx/data'
import { useToast } from '@/lib/use-toast'

interface DeleteCustomerDialogProps {
  open: boolean
  customer: Customer | null
  onClose: () => void
  onDeleted?: () => void
}

export function DeleteCustomerDialog({ open, customer, onClose, onDeleted }: DeleteCustomerDialogProps) {
  const remove = useDeleteCustomer()
  const { toast } = useToast()

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !remove.isPending) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose, remove.isPending])

  if (!open || !customer) return null

  const handleDelete = async () => {
    try {
      await remove.mutateAsync(customer.id)
      toast('Silindi', { variant: 'success' })
      onDeleted?.()
      onClose()
    } catch (err) {
      console.error(err)
      const msg = err instanceof Error ? err.message : 'Tekrar dener misin?'
      toast(`Silinemedi: ${msg}`, { variant: 'error' })
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 md:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-customer-title"
    >
      <button
        type="button"
        aria-label="Kapat"
        onClick={() => !remove.isPending && onClose()}
        className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
      />
      <div
        className="relative w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-xl"
        style={{ contain: 'layout style paint' }}
        data-testid="customer-delete-confirm"
      >
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-rose-500/10 text-rose-700 dark:text-rose-300">
            <Trash2 className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              MÜŞTERİ · {customer.id}
            </div>
            <h2 id="delete-customer-title" className="mt-1 font-serif text-xl font-light leading-tight">
              <em className="font-serif italic font-light">{customer.name}</em> silinecek
            </h2>
            <p className="mt-2 text-[13px] text-muted-foreground">
              {customer.id} müşteri silinecek. Geri alınamaz.
            </p>
          </div>
        </div>

        {remove.isError && (
          <div role="alert" className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
            Silme başarısız. Tekrar dener misin?
          </div>
        )}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            data-testid="delete-customer-cancel"
            onClick={() => !remove.isPending && onClose()}
            disabled={remove.isPending}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium transition hover:bg-foreground/5 disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
          >
            İptal
          </button>
          <button
            type="button"
            data-testid="delete-customer-confirm"
            onClick={handleDelete}
            disabled={remove.isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600 dark:bg-rose-500"
          >
            {remove.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            {remove.isPending ? 'Siliniyor…' : 'Sil'}
          </button>
        </div>
      </div>
    </div>
  )
}
