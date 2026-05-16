import { lazy, Suspense, useCallback, useMemo, useState, useTransition } from 'react'
import { Link, useSearchParams } from 'react-router'
import {
  ArrowUpRight,
  Eye,
  Layers,
  MapPin,
  Plus,
  Search,
  SlidersHorizontal,
  Table as TableIcon,
} from '@landx/icons'
import { PageShell, ErrorState, SkeletonTable } from '@landx/ui'
import { DataTable, type Column } from '@/components/data-table/data-table'
import { StatusChip, TypeChip } from '@landx/ui'
import { Sparkline } from '@landx/ui'
import { useListings, useListingStatusCounts, useUpdateListing, useDeleteListing } from '@landx/data'
import type { Listing, ListingStatus, ListingType } from '@landx/data'
import { RowActionsMenu } from '@/components/listing-edit/RowActionsMenu'
import { EditListingDrawer } from '@/components/listing-edit/EditListingDrawer'
import { DeleteListingDialog } from '@/components/listing-edit/DeleteListingDialog'
import { ListingDetailDrawer } from '@/components/listing-edit/ListingDetailDrawer'
import { ExportCsvButton } from '@/components/admin/ExportCsvButton'
import { SavedViewsDropdown } from '@/components/admin/SavedViewsDropdown'
import { SavedViewsMenu } from '@/components/shared/SavedViewsMenu'
import { useFilterParams, type FilterMap } from '@landx/ui/lib'
import { BulkActionsBar } from '@/components/shared/BulkActionsBar'
import { useBulkSelection } from '@/components/shared/use-bulk-selection'
import { BulkEditListingModal } from '@/components/listings/BulkEditListingModal'
import { BulkDeleteListingDialog } from '@/components/listings/BulkDeleteListingDialog'
import { InlineEditCell } from '@/components/shared/InlineEditCell'
import { toCsv, downloadCsv, todayStamp } from '@landx/ui/lib'
import { formatTLCompact, formatArea, timeAgo } from '@landx/ui'
import { cn } from '@landx/ui'
import type { CsvColumn } from '@/lib/csv-export'
import '@landx/ui/styles/leaflet.css'

const ListingsMap = lazy(() =>
  import('@landx/ui').then((m) => ({ default: m.ListingsMap })),
)

const STATUS_TABS: Array<'Tümü' | ListingStatus> = ['Tümü', 'Aktif', 'Pasif', 'Taslak']
const TYPE_OPTIONS: Array<'Tümü' | ListingType> = [
  'Tümü',
  'İmarlı',
  'Tarla',
  'Zeytinlik',
  'Villa Arsası',
]
const SORT_OPTIONS = [
  { key: 'lastUpdate', label: 'Son güncelleme' },
  { key: 'views', label: 'En çok görüntülenen' },
  { key: 'price-desc', label: 'Fiyat (yüksek → düşük)' },
  { key: 'price-asc', label: 'Fiyat (düşük → yüksek)' },
  { key: 'size-desc', label: 'Büyüklük (büyük → küçük)' },
] as const

type SortKey = (typeof SORT_OPTIONS)[number]['key']

export function Listings() {
  const [view, setView] = useState<'table' | 'map'>('table')
  const [searchParams, setSearchParams] = useSearchParams()

  // Wave F19.B — filter state owned by `useFilterParams` (F19.0 helper). The
  // schema acts as a whitelist + default-value witness so SavedViewsMenu can
  // snapshot the live URL state and apply it back without leaking sort/detail
  // (which are presentation-only, not "filter" state).
  const [filters] = useFilterParams<FilterMap>({
    status: '',
    type: '',
    city: '',
    district: '',
    search: '',
  })
  const status = parseStatusParam(filters.status as string)
  const type = parseTypeParam(filters.type as string)
  const search = (filters.search as string) ?? ''
  const sortKey = parseSortParam(searchParams.get('sort'))

  // Custom writer: merges filter changes into the URL while preserving
  // sort/detail (and any other non-schema params). F19.0's `setFilters`
  // wipes the whole search string, which we don't want here.
  const setFilters = useCallback(
    (next: Partial<FilterMap>) => {
      setSearchParams(
        (prev) => {
          const out = new URLSearchParams(prev)
          for (const [key, value] of Object.entries(next)) {
            if (value === undefined) continue
            if (Array.isArray(value)) {
              out.delete(key)
              for (const v of value) if (v && v.length > 0) out.append(key, v)
            } else if (value === '' || value == null) {
              out.delete(key)
            } else {
              out.set(key, value as string)
            }
          }
          return out
        },
        { replace: false },
      )
    },
    [setSearchParams],
  )

  const setStatus = (v: (typeof STATUS_TABS)[number]) =>
    setFilters({ status: v === 'Tümü' ? '' : v })
  const setType = (v: (typeof TYPE_OPTIONS)[number]) =>
    setFilters({ type: v === 'Tümü' ? '' : v })
  const setSearch = (v: string) => setFilters({ search: v })
  const setSortKey = (v: SortKey) =>
    updateFilterParam(setSearchParams, 'sort', v === 'lastUpdate' ? null : v)

  // F6.C — saved-views param string for the legacy SavedViewsDropdown
  // (system defaults + F6.C user views). Excludes the per-row `detail`
  // param, which is drawer state rather than filter state.
  const filterParams = useMemo(() => {
    const next = new URLSearchParams(searchParams)
    next.delete('detail')
    return next.toString()
  }, [searchParams])

  const applySavedView = useCallback(
    (params: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(params)
          // Preserve drawer state if any.
          const detail = prev.get('detail')
          if (detail) next.set('detail', detail)
          return next
        },
        { replace: false },
      )
    },
    [setSearchParams],
  )

  // F19.B — applies a SavedViewsMenu snapshot. Replaces the schema-tracked
  // filter keys wholesale (so a saved view "Sıcak Ayvalık" with no search
  // term clears any in-flight search input). Sort/detail are preserved.
  const applyFilterSnapshot = useCallback(
    (snapshot: FilterMap) => {
      const schemaKeys: Array<keyof FilterMap> = [
        'status',
        'type',
        'city',
        'district',
        'search',
      ]
      const patch: Partial<FilterMap> = {}
      for (const key of schemaKeys) patch[key] = snapshot[key] ?? ''
      setFilters(patch)
    },
    [setFilters],
  )

  const [editTarget, setEditTarget] = useState<Listing | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Listing | null>(null)
  const [bulkEditOpen, setBulkEditOpen] = useState(false)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const detailId = searchParams.get('detail')
  const [, startUiTransition] = useTransition()
  const updateMutation = useUpdateListing()
  const deleteMutation = useDeleteListing()

  const {
    data: filtered = [],
    isLoading,
    isPlaceholderData,
    error,
    refetch,
  } = useListings({ status, type, search })

  const { data: counts } = useListingStatusCounts()

  const sorted = useMemo(() => {
    const list = [...filtered]
    switch (sortKey) {
      case 'views':
        return list.sort((a, b) => b.views - a.views)
      case 'price-desc':
        return list.sort((a, b) => b.price - a.price)
      case 'price-asc':
        return list.sort((a, b) => a.price - b.price)
      case 'size-desc':
        return list.sort((a, b) => b.size - a.size)
      case 'lastUpdate':
      default:
        return list.sort(
          (a, b) =>
            new Date(b.lastUpdate).getTime() - new Date(a.lastUpdate).getTime(),
        )
    }
  }, [filtered, sortKey])

  const bulkSelection = useBulkSelection<Listing>(sorted)
  const {
    selectedItems,
    isSelected,
    toggle,
    toggleAll,
    clear,
    selectionState,
  } = bulkSelection
  const selectedCount = selectedItems.length

  const columns: Column<Listing>[] = [
    {
      key: 'select',
      header: (
        <input
          type="checkbox"
          aria-label="Tüm satırları seç"
          data-testid="bulk-select-all"
          checked={selectionState === 'all'}
          ref={(el) => {
            if (el) el.indeterminate = selectionState === 'partial'
          }}
          onChange={toggleAll}
          onClick={(e) => e.stopPropagation()}
          className="h-3.5 w-3.5 cursor-pointer rounded border-border accent-foreground"
        />
      ),
      className: 'w-10',
      cell: (r) => (
        <input
          type="checkbox"
          aria-label={`${r.id} seç`}
          data-testid={`bulk-row-${r.id}`}
          checked={isSelected(r.id)}
          onChange={() => toggle(r.id)}
          onClick={(e) => e.stopPropagation()}
          className="h-3.5 w-3.5 cursor-pointer rounded border-border accent-foreground"
        />
      ),
    },
    {
      key: 'title',
      header: 'İlan',
      sortValue: (r) => r.title,
      cell: (r) => (
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <TypeChip type={r.type} />
            <span className="font-mono text-[10px] text-muted-foreground">{r.id}</span>
          </div>
          <span className="mt-1 text-[14px] font-medium leading-snug">{r.title}</span>
          <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <MapPin className="h-3 w-3" />
            {r.district}
          </span>
        </div>
      ),
    },
    {
      key: 'size',
      header: 'Büyüklük',
      className: 'text-right whitespace-nowrap',
      sortValue: (r) => r.size,
      cell: (r) => (
        <span className="font-mono text-[12.5px] tabular-nums">{formatArea(r.size)}</span>
      ),
    },
    {
      key: 'price',
      header: 'Fiyat',
      className: 'text-right whitespace-nowrap',
      sortValue: (r) => r.price,
      cell: (r) => (
        <span className="font-serif text-[15px] font-medium tabular-nums">
          {formatTLCompact(r.price)}
        </span>
      ),
      editor: (r, ctx) => (
        <InlineEditCell<number>
          value={r.price}
          display={(v) => (
            <span className="font-serif text-[15px] font-medium tabular-nums">
              {formatTLCompact(v)}
            </span>
          )}
          editor={(v, onChange, onCommit, onCancel) => (
            <input
              type="number"
              autoFocus
              data-testid={`inline-edit-input-${r.id}-price`}
              value={Number.isFinite(v) ? v : 0}
              onChange={(e) => onChange(Number(e.target.value))}
              onBlur={onCommit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  onCommit()
                } else if (e.key === 'Escape') {
                  e.preventDefault()
                  onCancel()
                }
              }}
              className="w-full rounded-lg border border-border bg-background px-2 py-1 text-right font-mono text-[12.5px] tabular-nums outline-none focus:ring-2 focus:ring-foreground/20"
            />
          )}
          onSave={(next) =>
            updateMutation.mutateAsync({ id: r.id, patch: { price: next } })
          }
          onClose={ctx.onClose}
        />
      ),
    },
    {
      key: 'views',
      header: 'Görüntülenme',
      className: 'whitespace-nowrap',
      sortValue: (r) => r.views,
      cell: (r) => (
        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center gap-1 font-mono text-[12px] tabular-nums">
            <Eye className="h-3 w-3" />
            {r.views.toLocaleString('tr-TR')}
          </span>
          <Sparkline data={r.weeklyTrend} />
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Durum',
      sortValue: (r) => r.status,
      cell: (r) => <StatusChip status={r.status} />,
      editor: (r, ctx) => (
        <InlineEditCell<ListingStatus>
          value={r.status}
          display={(v) => <StatusChip status={v} />}
          editor={(v, onChange, onCommit, onCancel) => (
            <select
              autoFocus
              data-testid={`inline-edit-input-${r.id}-status`}
              value={v}
              onChange={(e) => onChange(e.target.value as ListingStatus)}
              onBlur={onCommit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  onCommit()
                } else if (e.key === 'Escape') {
                  e.preventDefault()
                  onCancel()
                }
              }}
              className="w-full rounded-lg border border-border bg-background px-2 py-1 text-[12.5px] outline-none focus:ring-2 focus:ring-foreground/20"
            >
              <option value="Aktif">Aktif</option>
              <option value="Pasif">Pasif</option>
              <option value="Taslak">Taslak</option>
            </select>
          )}
          onSave={(next) =>
            updateMutation.mutateAsync({ id: r.id, patch: { status: next } })
          }
          onClose={ctx.onClose}
        />
      ),
    },
    {
      key: 'lastUpdate',
      header: 'Güncellendi',
      className: 'whitespace-nowrap text-muted-foreground',
      sortValue: (r) => new Date(r.lastUpdate).getTime(),
      cell: (r) => <span className="text-[12px]">{timeAgo(r.lastUpdate)}</span>,
    },
    {
      key: 'actions',
      header: '',
      className: 'w-12 text-right',
      cell: (r) => (
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          <RowActionsMenu
            id={r.id}
            label={`${r.id} için işlemler`}
            onEdit={() =>
              startUiTransition(() => {
                setEditTarget(r)
              })
            }
            onDelete={() =>
              startUiTransition(() => {
                setDeleteTarget(r)
              })
            }
          />
        </div>
      ),
    },
  ]

  const detailTarget = useMemo(
    () => (detailId ? sorted.find((l) => l.id === detailId) ?? null : null),
    [detailId, sorted],
  )

  const openDetail = (l: Listing) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set('detail', l.id)
        return next
      },
      { replace: false },
    )
  }

  const closeDetail = () => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('detail')
        return next
      },
      { replace: true },
    )
  }

  const handleSave = (input: Parameters<typeof updateMutation.mutate>[0]) => {
    updateMutation.mutate(input, {
      onSuccess: () => {
        startUiTransition(() => setEditTarget(null))
      },
    })
  }

  const handleDelete = () => {
    if (!deleteTarget) return
    const id = deleteTarget.id
    deleteMutation.mutate(id, {
      onSuccess: () => {
        startUiTransition(() => setDeleteTarget(null))
      },
    })
  }

  const handleBulkExport = useCallback(() => {
    if (selectedItems.length === 0) return
    const headers = [
      'id',
      'title',
      'city',
      'district',
      'type',
      'size',
      'price',
      'status',
    ]
    const rows = selectedItems.map((l) => [
      l.id,
      l.title,
      l.city,
      l.district,
      l.type,
      l.size,
      l.price,
      l.status,
    ])
    const csv = toCsv(headers, rows)
    downloadCsv(`ilanlar_${todayStamp()}.csv`, csv)
  }, [selectedItems])

  const csvColumns: CsvColumn<Listing>[] = [
    { key: 'id', label: 'ID' },
    { key: 'title', label: 'Başlık' },
    { key: 'district', label: 'İlçe' },
    { key: 'city', label: 'Şehir' },
    { key: 'price', label: 'Fiyat' },
    { key: 'size', label: 'Büyüklük' },
    { key: 'status', label: 'Durum' },
    { key: 'lastUpdate', label: 'Güncellendi' },
  ]

  return (
    <PageShell
      eyebrow="MOD · İLANLAR"
      title={
        <>
          Arsa <em className="font-serif italic font-light">portföyü</em>
        </>
      }
      description={`${counts?.Tümü ?? '—'} ilan · ${counts?.Aktif ?? '—'} aktif yayın. Aşağıdaki filtrelerden daralt veya yeni bir ilan ekle.`}
      actions={
        <>
          <SavedViewsDropdown
            app="listings"
            currentParams={filterParams}
            onApply={applySavedView}
          />
          <ExportCsvButton
            rows={sorted}
            columns={csvColumns}
            filenamePrefix="listings"
          />
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium transition hover:bg-foreground/5"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filtre
          </button>
          <Link
            to="/listings/new"
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90"
          >
            <Plus className="h-3.5 w-3.5" />
            Yeni ilan
          </Link>
        </>
      }
    >
      {/* Filter bar */}
      <section className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto_auto_auto]">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <label htmlFor="search-input-listings" className="sr-only">
            İlan başlığı, bölge, etiket ara
          </label>
          <input
            id="search-input-listings"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="İlan başlığı, bölge, etiket… (ID de aranır)"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <SegmentSelector
          value={type}
          options={TYPE_OPTIONS}
          onChange={(v) => setType(v as typeof type)}
        />
        <SortPicker value={sortKey} onChange={setSortKey} />
        <ViewToggle value={view} onChange={setView} />
        <SavedViewsMenu
          entity="listings"
          currentFilters={filters}
          onApply={applyFilterSnapshot}
        />
      </section>

      {/* Status tabs */}
      <section className="mb-4 -mx-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card p-1">
          {STATUS_TABS.map((s) => {
            const count = counts?.[s] ?? 0
            const active = status === s
            return (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition',
                  active
                    ? 'bg-foreground text-background shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {s}
                <span
                  className={cn(
                    'rounded-full px-1.5 font-mono text-[10px] tabular-nums',
                    active ? 'bg-background/20' : 'bg-foreground/[0.06]',
                  )}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      {/* View */}
      {error ? (
        <ErrorState
          title="İlanlar yüklenemedi"
          description="Sunucuya ulaşılamadı. Tekrar dener misin?"
          error={error}
          onRetry={() => refetch()}
        />
      ) : isLoading ? (
        <div
          className="rounded-2xl border border-border bg-card"
          data-testid="listings-skeleton"
        >
          <SkeletonTable rows={10} cells={5} />
        </div>
      ) : view === 'table' ? (
        <div className={cn('transition-opacity', isPlaceholderData && 'opacity-60')}>
          <BulkActionsBar
            count={selectedCount}
            onClear={clear}
            actions={[
              {
                id: 'edit',
                label: 'Toplu düzenle',
                onClick: () => setBulkEditOpen(true),
              },
              {
                id: 'export',
                label: 'CSV indir',
                onClick: handleBulkExport,
              },
              {
                id: 'delete',
                label: 'Sil',
                tone: 'destructive',
                onClick: () => setBulkDeleteOpen(true),
              },
            ]}
          />
          <DataTable
            rows={sorted}
            columns={columns}
            rowKey={(r) => r.id}
            onRowClick={(r) => startUiTransition(() => openDetail(r))}
            emptyTitle="Eşleşen ilan yok"
            emptyDescription="Filtreyi gevşet veya yeni bir ilan ekle."
            selectable={false}
          />
        </div>
      ) : (
        <Suspense
          fallback={
            <div className="grid place-items-center rounded-2xl border border-dashed border-border/70 bg-card/50" style={{ height: 480 }}>
              <div className="flex flex-col items-center gap-2 text-center text-muted-foreground">
                <Layers className="h-5 w-5 animate-pulse" />
                <span className="text-sm">Harita yükleniyor…</span>
              </div>
            </div>
          }
        >
          <ListingsMap
            listings={sorted}
            height={520}
            onMarkerClick={(id) => {
              setSearch(id)
              setView('table')
            }}
          />
        </Suspense>
      )}

      {/* Summary footer */}
      <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <SummaryStat
          label="Toplam değer"
          value={formatTLCompact(sorted.reduce((s, l) => s + l.price, 0))}
          hint={`${sorted.length} ilan`}
        />
        <SummaryStat
          label="Ortalama m² fiyatı"
          value={
            sorted.length === 0
              ? '—'
              : formatTLCompact(
                  sorted.reduce((s, l) => s + l.price / l.size, 0) / sorted.length,
                )
          }
          hint="m² başına"
        />
        <SummaryStat
          label="Bu hafta görüntülenme"
          value={sorted.reduce((s, l) => s + (l.weeklyTrend.at(-1) ?? 0), 0).toLocaleString('tr-TR')}
          hint="son 7 gün"
        />
        <SummaryStat
          label="En çok ilgi"
          value={
            sorted[0]?.id ?? '—'
          }
          hint={sorted[0]?.title.slice(0, 28) ?? ''}
        />
      </section>

      <ListingDetailDrawer
        open={detailTarget !== null}
        listing={detailTarget}
        onClose={() => startUiTransition(() => closeDetail())}
        onEdit={(l) =>
          startUiTransition(() => {
            closeDetail()
            setEditTarget(l)
          })
        }
        onDelete={(l) =>
          startUiTransition(() => {
            closeDetail()
            setDeleteTarget(l)
          })
        }
      />

      <EditListingDrawer
        open={editTarget !== null}
        listing={editTarget}
        pending={updateMutation.isPending}
        error={updateMutation.error}
        onSubmit={handleSave}
        onClose={() => {
          if (updateMutation.isPending) return
          startUiTransition(() => {
            setEditTarget(null)
            updateMutation.reset()
          })
        }}
      />

      <DeleteListingDialog
        open={deleteTarget !== null}
        id={deleteTarget?.id}
        listingTitle={deleteTarget?.title}
        pending={deleteMutation.isPending}
        error={deleteMutation.error}
        onConfirm={handleDelete}
        onCancel={() => {
          if (deleteMutation.isPending) return
          startUiTransition(() => {
            setDeleteTarget(null)
            deleteMutation.reset()
          })
        }}
      />

      <BulkEditListingModal
        open={bulkEditOpen}
        selectedItems={selectedItems}
        onClose={() => setBulkEditOpen(false)}
        onSuccess={() => clear()}
      />

      <BulkDeleteListingDialog
        open={bulkDeleteOpen}
        selectedItems={selectedItems}
        onClose={() => setBulkDeleteOpen(false)}
        onSuccess={() => clear()}
      />
    </PageShell>
  )
}

function parseStatusParam(raw: string | null): (typeof STATUS_TABS)[number] {
  if (!raw) return 'Tümü'
  return (STATUS_TABS as readonly string[]).includes(raw)
    ? (raw as (typeof STATUS_TABS)[number])
    : 'Tümü'
}

function parseTypeParam(raw: string | null): (typeof TYPE_OPTIONS)[number] {
  if (!raw) return 'Tümü'
  return (TYPE_OPTIONS as readonly string[]).includes(raw)
    ? (raw as (typeof TYPE_OPTIONS)[number])
    : 'Tümü'
}

function parseSortParam(raw: string | null): SortKey {
  if (!raw) return 'lastUpdate'
  return (SORT_OPTIONS.map((o) => o.key) as readonly string[]).includes(raw)
    ? (raw as SortKey)
    : 'lastUpdate'
}

type SetSearchParams = ReturnType<typeof useSearchParams>[1]

function updateFilterParam(
  setSearchParams: SetSearchParams,
  key: string,
  value: string | null,
) {
  setSearchParams(
    (prev) => {
      const next = new URLSearchParams(prev)
      if (value === null || value === '') {
        next.delete(key)
      } else {
        next.set(key, value)
      }
      return next
    },
    { replace: true },
  )
}

function SegmentSelector<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: readonly T[]
  onChange: (v: T) => void
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="appearance-none rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium outline-none transition hover:bg-foreground/5 focus:ring-2 focus:ring-foreground/20"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          Tip: {o}
        </option>
      ))}
    </select>
  )
}

function SortPicker({
  value,
  onChange,
}: {
  value: SortKey
  onChange: (v: SortKey) => void
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as SortKey)}
      className="appearance-none rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium outline-none transition hover:bg-foreground/5 focus:ring-2 focus:ring-foreground/20"
    >
      {SORT_OPTIONS.map((o) => (
        <option key={o.key} value={o.key}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

function ViewToggle({
  value,
  onChange,
}: {
  value: 'table' | 'map'
  onChange: (v: 'table' | 'map') => void
}) {
  return (
    <div className="inline-flex items-center rounded-xl border border-border bg-card p-0.5">
      <button
        type="button"
        onClick={() => onChange('table')}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition',
          value === 'table' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground',
        )}
      >
        <TableIcon className="h-3.5 w-3.5" />
        Tablo
      </button>
      <button
        type="button"
        onClick={() => onChange('map')}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition',
          value === 'map' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground',
        )}
      >
        <MapPin className="h-3.5 w-3.5" />
        Harita
      </button>
    </div>
  )
}

function SummaryStat({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="font-serif text-2xl font-light tracking-tight">{value}</span>
      </div>
      {hint && <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>}
      <ArrowUpRight className="mt-2 hidden h-3 w-3 text-muted-foreground/50" />
    </div>
  )
}
