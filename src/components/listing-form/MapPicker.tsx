/**
 * MapPicker — modal Leaflet map for selecting an arsa pin in
 * /listings/new Step 1 (Wave F10.A).
 *
 * Mirrors apps/public-site/src/components/ilan-ver/MapPicker.tsx (F6.A),
 * adapted for admin:
 *   • TR-only labels (admin convention)
 *   • Same Leaflet lazy-chunk + marker icon path workaround
 *   • Türkiye bbox default; single marker, drag-to-reposition; click drops new pin
 *   • Modal Confirm/Cancel returning { lat, lng } | null to parent
 *   • Body-scroll lock + Escape closes
 *
 * Leaflet is imported via dynamic import() so the vite chunk stays out of the
 * main route bundle (see vite.config.ts manualChunks 'vendor-leaflet').
 */
import { useCallback, useEffect, useRef, useState } from 'react'

/** Türkiye bbox center — matches the listings map default. */
const TURKEY_CENTER: [number, number] = [39.0, 35.0]
const TURKEY_ZOOM = 6
const PIN_ZOOM = 12

const L_TXT = {
  title: 'Haritada konumu seç',
  subtitle: 'Haritaya tıkla veya pin\'i sürükle. Hassas adres aramak için yakınlaş.',
  selected: 'Seçilen konum',
  none: 'Henüz konum seçilmedi',
  confirm: 'Onayla',
  cancel: 'İptal',
  closeAria: 'Haritayı kapat',
} as const

export interface MapPickerProps {
  /** Pre-seeded lat (string from form state) — picker opens centered on this point. */
  initialLat?: string
  initialLng?: string
  onConfirm: (coord: { lat: number; lng: number }) => void
  onCancel: () => void
}

function parseCoord(s?: string): number | null {
  if (!s) return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

export default function MapPicker({
  initialLat,
  initialLng,
  onConfirm,
  onCancel,
}: MapPickerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<any | null>(null)
  const markerRef = useRef<any | null>(null)
  const leafletRef = useRef<any | null>(null)
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(() => {
    const lat = parseCoord(initialLat)
    const lng = parseCoord(initialLng)
    if (lat != null && lng != null) return { lat, lng }
    return null
  })
  const [ready, setReady] = useState(false)

  const placeMarker = useCallback((lat: number, lng: number) => {
    const LL = leafletRef.current
    const map = mapRef.current
    if (!LL || !map) return
    if (markerRef.current) {
      map.removeLayer(markerRef.current)
      markerRef.current = null
    }
    const marker = LL.marker([lat, lng], { draggable: true }).addTo(map)
    marker.on('dragend', (e: any) => {
      const ll = e.target.getLatLng()
      setPin({ lat: ll.lat, lng: ll.lng })
    })
    markerRef.current = marker
    setPin({ lat, lng })
  }, [])

  // Lazy-load Leaflet + init once per mount. Mirrors the listings map pattern.
  useEffect(() => {
    let cancelled = false
    async function init() {
      const LL = (await import('leaflet')).default
      await import('leaflet/dist/leaflet.css')
      if (cancelled || !containerRef.current) return

      // Marker icon path workaround (Leaflet's default image bundling is broken
      // under Vite — point to /leaflet/* in public/).
      delete (LL.Icon.Default.prototype as any)._getIconUrl
      LL.Icon.Default.mergeOptions({
        iconRetinaUrl: '/leaflet/marker-icon-2x.png',
        iconUrl: '/leaflet/marker-icon.png',
        shadowUrl: '/leaflet/marker-shadow.png',
      })

      const initial: [number, number] = pin ? [pin.lat, pin.lng] : TURKEY_CENTER
      const zoom = pin ? PIN_ZOOM : TURKEY_ZOOM
      const map = LL.map(containerRef.current).setView(initial, zoom)
      LL.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '© OpenStreetMap',
      }).addTo(map)

      leafletRef.current = LL
      mapRef.current = map

      map.on('click', (e: any) => {
        placeMarker(e.latlng.lat, e.latlng.lng)
      })

      if (pin) {
        placeMarker(pin.lat, pin.lng)
      }

      setReady(true)
    }
    init()
    return () => {
      cancelled = true
      setReady(false)
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
      markerRef.current = null
      leafletRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Modal a11y: body-scroll lock + Escape closes.
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [onCancel])

  const fmt = (n: number) => n.toFixed(5)

  function confirm() {
    if (!pin) return
    onConfirm(pin)
  }

  return (
    <div
      data-map-picker=""
      data-ready={ready ? 'true' : 'false'}
      role="dialog"
      aria-modal="true"
      aria-labelledby="map-picker-title"
      className="fixed inset-0 z-50 flex items-stretch justify-center bg-background/60 p-0 backdrop-blur-sm sm:items-center sm:p-6"
    >
      <div
        className="flex h-full w-full flex-col overflow-hidden border border-border bg-background shadow-xl sm:h-[min(80vh,640px)] sm:max-w-3xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <h2
              id="map-picker-title"
              className="font-serif text-xl font-light tracking-tight"
            >
              {L_TXT.title}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">{L_TXT.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label={L_TXT.closeAria}
            data-map-close=""
            data-testid="map-close"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
          >
            ×
          </button>
        </header>

        <div
          ref={containerRef}
          data-map-picker-canvas=""
          data-testid="map-picker-canvas"
          className="min-h-[280px] flex-1"
        />

        <footer className="flex flex-col gap-3 border-t border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="font-mono text-[11px] text-muted-foreground">
            {pin ? (
              <span data-map-picker-coords="">
                <span className="uppercase tracking-[0.14em]">{L_TXT.selected}: </span>
                <span className="tabular-nums text-foreground">
                  {new Intl.NumberFormat('tr-TR').format(Number(fmt(pin.lat)))},{' '}
                  {new Intl.NumberFormat('tr-TR').format(Number(fmt(pin.lng)))}
                </span>
              </span>
            ) : (
              <span className="italic">{L_TXT.none}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              data-map-cancel=""
              data-testid="map-cancel"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
            >
              {L_TXT.cancel}
            </button>
            <button
              type="button"
              onClick={confirm}
              disabled={!pin}
              data-map-confirm=""
              data-testid="map-confirm"
              data-can-confirm={pin ? 'true' : 'false'}
              className={`inline-flex min-h-11 items-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-medium transition ${
                pin
                  ? 'bg-foreground text-background hover:opacity-90'
                  : 'cursor-not-allowed bg-foreground/40 text-background'
              }`}
            >
              {L_TXT.confirm}
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}
