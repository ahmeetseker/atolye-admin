/**
 * /offline — Wave F30.A
 *
 * Static fallback page that the service worker can navigate to when a
 * network request fails and no cache entry is available. Surfaces a
 * reload button + the live `useOnline` indicator from `@landx/ui/lib`
 * so the user can retry as soon as connectivity returns.
 */

import { CloudOff, RefreshCw } from '@landx/icons'
import { PageShell } from '@landx/ui'
import { useOnline } from '@landx/ui/lib'

export function Offline() {
  const online = useOnline()

  const handleReload = () => {
    if (typeof window !== 'undefined') window.location.reload()
  }

  return (
    <PageShell
      eyebrow="MOD · ÇEVRİMDIŞI"
      title={
        <>
          Bağlantı <em className="font-serif italic font-light">yok</em>
        </>
      }
      description="Atölye'ye ulaşmak için aktif bir internet bağlantısı gerekiyor. Bağlantın geri geldiğinde sayfayı yenileyebilirsin."
    >
      <div className="mx-auto flex max-w-xl flex-col items-center gap-6 rounded-2xl border border-border bg-card p-8 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-foreground/[0.06] text-foreground/80">
          <CloudOff className="h-6 w-6" />
        </span>
        <div className="space-y-2">
          <p className="font-serif text-xl tracking-tight">
            {online ? 'Bağlantı geri geldi' : 'İnternet erişimi yok'}
          </p>
          <p className="text-[13.5px] leading-relaxed text-muted-foreground">
            {online
              ? 'Sayfayı yenileyerek devam edebilirsin.'
              : 'Wi-Fi veya mobil veri bağlantını kontrol et. Bağlantın döndüğünde bu durum otomatik güncellenecek.'}
          </p>
        </div>
        <button
          type="button"
          onClick={handleReload}
          className="inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-[13px] font-semibold text-background transition hover:bg-foreground/90"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Yeniden dene
        </button>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          durum · {online ? 'çevrimiçi' : 'çevrimdışı'}
        </p>
      </div>
    </PageShell>
  )
}
