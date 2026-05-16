import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import {
  Clock,
  Filter,
  Flame,
  Mail,
  Phone,
  Plus,
  Search,
  TrendingUp,
  UserPlus,
} from '@landx/icons'
import { PageShell, ErrorState, SkeletonTable } from '@landx/ui'
import { DataTable, type Column } from '@/components/data-table/data-table'
import { SegmentChip, StageChip } from '@landx/ui'
import { useCustomers, useSegmentCounts, useUpdateCustomer } from '@landx/data'
import type { Customer, CustomerSegment } from '@landx/data'
import { formatTLCompact, timeAgo } from '@landx/ui'
import { cn } from '@landx/ui'
import { RowActionsMenu } from '@/components/customer-edit/RowActionsMenu'
import { EditCustomerDrawer } from '@/components/customer-edit/EditCustomerDrawer'
import { DeleteCustomerDialog } from '@/components/customer-edit/DeleteCustomerDialog'
import { CustomerDetailDrawer } from '@/components/customer-edit/CustomerDetailDrawer'
import { ExportCsvButton } from '@/components/admin/ExportCsvButton'
import { SavedViewsDropdown } from '@/components/admin/SavedViewsDropdown'
import { SavedViewsMenu } from '@/components/shared/SavedViewsMenu'
import { useFilterParams, type FilterMap } from '@landx/ui/lib'
import type { CsvColumn } from '@/lib/csv-export'
import { BulkActionsBar, type BulkAction } from '@/components/shared/BulkActionsBar'
import { useBulkSelection } from '@/components/shared/use-bulk-selection'
import { BulkUpdateCustomerModal } from '@/components/customers/BulkUpdateCustomerModal'
import { BulkMessageModal } from '@/components/customers/BulkMessageModal'
import { BulkDeleteCustomerDialog } from '@/components/customers/BulkDeleteCustomerDialog'
import { toCsv, downloadCsv, todayStamp } from '@landx/ui/lib'
import { calculateLeadScore, tierBadgeClass } from '@/lib/lead-scoring'
import { InlineEditCell } from '@/components/shared/InlineEditCell'

const SEGMENT_TABS: Array<'Tümü' | CustomerSegment> = ['Tümü', 'Sıcak', 'Ilık', 'Soğuk']

const COHORT_WEEKS = [
  { label: '4 hf önce', sıcak: 6, ılık: 8, soğuk: 4 },
  { label: '3 hf önce', sıcak: 7, ılık: 6, soğuk: 3 },
  { label: '2 hf önce', sıcak: 4, ılık: 9, soğuk: 5 },
  { label: 'Geçen hf', sıcak: 5, ılık: 7, soğuk: 2 },
  { label: 'Bu hafta', sıcak: 12, ılık: 5, soğuk: 3 },
]

export function Customers() {
  const [editing, setEditing] = useState<Customer | null>(null)
  const [deleting, setDeleting] = useState<Customer | null>(null)
  // Wave F2C — row-click drill-in. `?detail=<id>` keeps the open detail
  // drawer in URL state so deep-links and back-button work naturally.
  const [searchParams, setSearchParams] = useSearchParams()
  const detailId = searchParams.get('detail')

  // Wave F19.B — filter state owned by `useFilterParams` (F19.0 helper). The
  // schema acts as a whitelist + default-value witness so SavedViewsMenu can
  // snapshot the live URL state and apply it back without leaking `detail`
  // (drawer state) into the saved view.
  const [filters] = useFilterParams<FilterMap>({
    segment: '',
    stage: '',
    source: '',
    search: '',
  })
  const segment = parseSegmentParam(filters.segment as string)
  const search = (filters.search as string) ?? ''

  // Custom writer that preserves the non-schema `detail` param. F19.0's
  // built-in setFilters overwrites the entire search string, which would
  // close the open detail drawer on every filter change.
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

  const setSegment = (v: (typeof SEGMENT_TABS)[number]) =>
    setFilters({ segment: v === 'Tümü' ? '' : v })
  const setSearch = (v: string) => setFilters({ search: v })

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
          const detail = prev.get('detail')
          if (detail) next.set('detail', detail)
          return next
        },
        { replace: false },
      )
    },
    [setSearchParams],
  )

  // F19.B — applies a SavedViewsMenu snapshot. Replaces schema-tracked
  // filter keys wholesale so a saved view without `search` clears any
  // in-flight search input. `detail` (drawer) is preserved.
  const applyFilterSnapshot = useCallback(
    (snapshot: FilterMap) => {
      const schemaKeys: Array<keyof FilterMap> = ['segment', 'stage', 'source', 'search']
      const patch: Partial<FilterMap> = {}
      for (const key of schemaKeys) patch[key] = snapshot[key] ?? ''
      setFilters(patch)
    },
    [setFilters],
  )

  const {
    data: filtered = [],
    isLoading,
    isPlaceholderData,
    error,
    refetch,
  } = useCustomers({ segment, search })

  // F19.C — segment inline edit mutation hook.
  const updateMutation = useUpdateCustomer()

  // F18.B — shared bulk selection hook. Prunes IDs that fall out of the
  // filtered set automatically (segment/search switches won't strand stale
  // ids in the selection set).
  const bulk = useBulkSelection(filtered)
  const [bulkUpdateOpen, setBulkUpdateOpen] = useState(false)
  const [bulkMessageOpen, setBulkMessageOpen] = useState(false)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)

  const detailCustomer = useMemo(
    () => (detailId ? filtered.find((c) => c.id === detailId) ?? null : null),
    [filtered, detailId],
  )

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

  const openDetail = (id: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set('detail', id)
        return next
      },
      { replace: false },
    )
  }

  // If the detail param references a customer that's filtered out (e.g. user
  // tightens the segment tab), close the drawer instead of stranding a stale
  // URL param. Mirrors F2B's listings pattern.
  useEffect(() => {
    if (detailId && !isLoading && filtered.length > 0 && !detailCustomer) {
      closeDetail()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailId, filtered, isLoading, detailCustomer])

  const { data: segmentCounts } = useSegmentCounts()
  // Stats için tüm müşteri listesi gerekli (filter'dan bağımsız)
  const { data: allCustomers = [] } = useCustomers({})

  const totalValue = useMemo(
    () => filtered.reduce((s, c) => s + c.value, 0),
    [filtered],
  )

  const meetingCount = allCustomers.filter((c) => c.stage === 'Görüşme').length
  const newThisWeek = allCustomers.filter(
    (c) => Date.now() - new Date(c.lastContact).getTime() < 7 * 86400 * 1000,
  ).length

  const columns: Column<Customer>[] = [
    {
      key: 'select',
      header: (
        <input
          type="checkbox"
          aria-label="Tümünü seç"
          data-testid="customer-select-all"
          checked={bulk.selectionState === 'all'}
          ref={(el) => {
            if (el) el.indeterminate = bulk.selectionState === 'partial'
          }}
          onChange={() => bulk.toggleAll()}
          onClick={(e) => e.stopPropagation()}
          className="h-3.5 w-3.5 cursor-pointer rounded border-border accent-foreground"
        />
      ),
      className: 'w-10',
      cell: (r) => (
        <div onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            aria-label={`${r.name} seç`}
            data-testid={`customer-select-${r.id}`}
            checked={bulk.isSelected(r.id)}
            onChange={() => bulk.toggle(r.id)}
            className="h-3.5 w-3.5 cursor-pointer rounded border-border accent-foreground"
          />
        </div>
      ),
    },
    {
      key: 'name',
      header: 'Müşteri',
      sortValue: (r) => r.name,
      cell: (r) => (
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-foreground/[0.08] font-mono text-[12px] font-semibold text-foreground/85"
          >
            {r.name
              .split(' ')
              .map((p) => p[0])
              .slice(0, 2)
              .join('')}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-medium leading-tight">{r.name}</span>
              <span className="font-mono text-[10px] text-muted-foreground">{r.id}</span>
            </div>
            <span className="mt-0.5 inline-block truncate text-[11.5px] text-muted-foreground">
              {r.interestArea}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'segment',
      header: 'Segment',
      sortValue: (r) => r.segment,
      cell: (r) => <SegmentChip segment={r.segment} />,
      editor: (r, ctx) => (
        <InlineEditCell<CustomerSegment>
          value={r.segment}
          display={(v) => <SegmentChip segment={v} />}
          editor={(v, onChange, onCommit, onCancel) => (
            <select
              autoFocus
              data-testid={`inline-edit-input-${r.id}-segment`}
              value={v}
              onChange={(e) => onChange(e.target.value as CustomerSegment)}
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
              <option value="Sıcak">Sıcak</option>
              <option value="Ilık">Ilık</option>
              <option value="Soğuk">Soğuk</option>
            </select>
          )}
          onSave={(next) =>
            updateMutation.mutateAsync({ id: r.id, patch: { segment: next } })
          }
          onClose={ctx.onClose}
        />
      ),
    },
    {
      key: 'score',
      header: 'Skor',
      className: 'whitespace-nowrap',
      sortValue: (r) => calculateLeadScore(r).score,
      cell: (r) => {
        const { tier, score } = calculateLeadScore(r)
        return (
          <span
            data-testid={`customer-score-${r.id}`}
            className={cn(
              'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[11px] tabular-nums',
              tierBadgeClass(tier),
            )}
          >
            {score}
          </span>
        )
      },
    },
    {
      key: 'stage',
      header: 'Aşama',
      sortValue: (r) =>
        ['İlk temas', 'Görüşme', 'Teklif', 'Kaparo', 'Tapu'].indexOf(r.stage),
      cell: (r) => <StageChip stage={r.stage} />,
    },
    {
      key: 'value',
      header: 'Potansiyel',
      className: 'text-right whitespace-nowrap',
      sortValue: (r) => r.value,
      cell: (r) =>
        r.value > 0 ? (
          <span className="font-serif text-[14px] font-medium tabular-nums">
            {formatTLCompact(r.value)}
          </span>
        ) : (
          <span className="font-mono text-[11px] text-muted-foreground">—</span>
        ),
    },
    {
      key: 'owner',
      header: 'Sahibi',
      cell: (r) => <span className="font-mono text-[12px] text-muted-foreground">{r.owner}</span>,
    },
    {
      key: 'lastContact',
      header: 'Son temas',
      className: 'whitespace-nowrap',
      sortValue: (r) => new Date(r.lastContact).getTime(),
      cell: (r) => (
        <span className="inline-flex items-center gap-1 text-[12px] text-muted-foreground">
          <Clock className="h-3 w-3" />
          {timeAgo(r.lastContact)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right whitespace-nowrap',
      cell: (r) => (
        <div
          className="flex justify-end gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <IconButton title="Ara">
            <Phone className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton title="Mail">
            <Mail className="h-3.5 w-3.5" />
          </IconButton>
          <RowActionsMenu
            rowId={r.id}
            label={`${r.name} işlemleri`}
            onEdit={() => setEditing(r)}
            onDelete={() => setDeleting(r)}
          />
        </div>
      ),
    },
  ]

  const responsivenessMinutes = 42
  const responsivenessDelta = -18

  // F6.C — header export still uses the old CsvColumn helper for parity with
  // listings; bulk export below the table flows through F18.0's tuple-based
  // `toCsv` because selection-aware exports want the full customer shape.
  const csvColumns: CsvColumn<Customer>[] = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Ad' },
    { key: 'phone', label: 'Telefon' },
    { key: 'email', label: 'E-posta' },
    { key: 'interestArea', label: 'İlgi alanı' },
    { key: 'lastContact', label: 'Son temas' },
  ]

  const handleBulkExport = useCallback(() => {
    const rows = bulk.selectedItems.map((c) => [
      c.id,
      c.name,
      c.segment,
      c.stage,
      c.source,
      c.interestArea,
      c.value,
      c.phone ?? '',
      c.email ?? '',
    ])
    const csv = toCsv(
      ['id', 'name', 'segment', 'stage', 'source', 'interestArea', 'value', 'phone', 'email'],
      rows,
    )
    downloadCsv(`musteriler_${todayStamp()}.csv`, csv)
  }, [bulk.selectedItems])

  const bulkActions: BulkAction[] = [
    { id: 'segment', label: 'Toplu segment', onClick: () => setBulkUpdateOpen(true) },
    { id: 'message', label: 'Toplu mesaj', onClick: () => setBulkMessageOpen(true) },
    { id: 'export', label: 'CSV indir', onClick: handleBulkExport },
    { id: 'delete', label: 'Sil', tone: 'destructive', onClick: () => setBulkDeleteOpen(true) },
  ]

  return (
    <PageShell
      eyebrow="MOD · MÜŞTERİLER"
      title={
        <>
          CRM <em className="font-serif italic font-light">defteri</em>
        </>
      }
      description="Sıcak adayları, devam eden görüşmeleri ve geçmiş etkileşimleri tek panelde takip et."
      actions={
        <>
          <SavedViewsDropdown
            app="customers"
            currentParams={filterParams}
            onApply={applySavedView}
          />
          <ExportCsvButton
            rows={filtered}
            columns={csvColumns}
            filenamePrefix="customers"
          />
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium transition hover:bg-foreground/5"
          >
            <Filter className="h-3.5 w-3.5" />
            Filtre
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Yeni müşteri
          </button>
        </>
      }
    >
      {/* Top stats */}
      <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat
          icon={Flame}
          label="Sıcak"
          value={(segmentCounts?.Sıcak ?? 0).toString()}
          hint="aday"
          tone="rose"
        />
        <Stat
          icon={TrendingUp}
          label="Görüşme aşaması"
          value={meetingCount.toString()}
          hint="ilan ziyareti planlandı"
          tone="emerald"
        />
        <Stat
          icon={Clock}
          label="Yanıt süresi"
          value={`${responsivenessMinutes} dk`}
          hint={
            responsivenessDelta < 0
              ? `▼ ${Math.abs(responsivenessDelta)} dk daha hızlı`
              : `▲ ${responsivenessDelta} dk daha yavaş`
          }
          tone={responsivenessDelta < 0 ? 'emerald' : 'rose'}
        />
        <Stat
          icon={Plus}
          label="Bu hafta yeni"
          value={newThisWeek.toString()}
          hint="ilk temas"
          tone="amber"
        />
      </section>

      {/* Filter row */}
      <section className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto]">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <label htmlFor="search-input-customers" className="sr-only">
            Müşteri adı, ID, ilgi alanı, not ara
          </label>
          <input
            id="search-input-customers"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="İsim, ID, ilgi alanı, not…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="-mx-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card p-1">
          {SEGMENT_TABS.map((s) => {
            const count = segmentCounts?.[s] ?? 0
            const active = segment === s
            return (
              <button
                key={s}
                type="button"
                onClick={() => setSegment(s)}
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
        </div>
        <SavedViewsMenu
          entity="customers"
          currentFilters={filters}
          onApply={applyFilterSnapshot}
        />
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_360px]">
        {error ? (
          <ErrorState
            title="Müşteriler yüklenemedi"
            error={error}
            onRetry={() => refetch()}
          />
        ) : isLoading ? (
          <div
            className="rounded-2xl border border-border bg-card"
            data-testid="customers-skeleton"
          >
            <SkeletonTable rows={10} cells={5} />
          </div>
        ) : (
        <div className={cn('transition-opacity', isPlaceholderData && 'opacity-60')}>
          <BulkActionsBar
            count={bulk.selectedIds.size}
            onClear={bulk.clear}
            actions={bulkActions}
          />
          <DataTable
            rows={filtered}
            columns={columns}
            rowKey={(r) => r.id}
            onRowClick={(r) => openDetail(r.id)}
            emptyTitle="Eşleşen müşteri yok"
            emptyDescription="Segment filtresini gevşet veya yeni bir müşteri ekle."
            selectable={false}
          />
        </div>
        )}

        <CohortChart />
      </div>

      <section className="mt-6 rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h3 className="font-serif text-lg font-medium tracking-tight">
              Toplam potansiyel
            </h3>
            <p className="text-[12.5px] text-muted-foreground">
              Filtrelenen {filtered.length} müşterinin söz verdiği veya konuştuğu işlemler toplamı.
            </p>
          </div>
          <span className="font-serif text-3xl font-light tabular-nums">
            {formatTLCompact(totalValue)}
          </span>
        </div>
      </section>

      <CustomerDetailDrawer
        open={!!detailCustomer}
        customer={detailCustomer}
        onClose={closeDetail}
        onEdit={() => {
          if (!detailCustomer) return
          setEditing(detailCustomer)
          closeDetail()
        }}
        onDelete={() => {
          if (!detailCustomer) return
          setDeleting(detailCustomer)
          closeDetail()
        }}
      />
      <EditCustomerDrawer
        open={!!editing}
        customer={editing}
        onClose={() => setEditing(null)}
      />
      <DeleteCustomerDialog
        open={!!deleting}
        customer={deleting}
        onClose={() => setDeleting(null)}
      />

      <BulkUpdateCustomerModal
        open={bulkUpdateOpen}
        customers={bulk.selectedItems}
        onClose={() => setBulkUpdateOpen(false)}
        onUpdated={() => bulk.clear()}
      />
      <BulkMessageModal
        open={bulkMessageOpen}
        customers={bulk.selectedItems}
        onClose={() => setBulkMessageOpen(false)}
        onSent={() => bulk.clear()}
      />
      <BulkDeleteCustomerDialog
        open={bulkDeleteOpen}
        customers={bulk.selectedItems}
        onClose={() => setBulkDeleteOpen(false)}
        onDeleted={() => bulk.clear()}
      />
    </PageShell>
  )
}

function parseSegmentParam(raw: string | null): (typeof SEGMENT_TABS)[number] {
  if (!raw) return 'Tümü'
  return (SEGMENT_TABS as readonly string[]).includes(raw)
    ? (raw as (typeof SEGMENT_TABS)[number])
    : 'Tümü'
}

const TONE_MAP = {
  rose: 'text-rose-700 dark:text-rose-300 bg-rose-500/10 dark:bg-rose-400/10',
  emerald:
    'text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 dark:bg-emerald-400/10',
  amber:
    'text-amber-700 dark:text-amber-300 bg-amber-500/10 dark:bg-amber-400/10',
  sky: 'text-sky-700 dark:text-sky-300 bg-sky-500/10 dark:bg-sky-400/10',
} as const

function Stat({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: typeof Flame
  label: string
  value: string
  hint: string
  tone: keyof typeof TONE_MAP
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <span
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-xl',
            TONE_MAP[tone],
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 font-serif text-3xl font-light tracking-tight">{value}</div>
      <div className={cn('mt-1.5 inline-flex items-center gap-1 font-mono text-[11px]', tone === 'rose' ? 'text-rose-700 dark:text-rose-300' : tone === 'emerald' ? 'text-emerald-700 dark:text-emerald-300' : tone === 'amber' ? 'text-amber-700 dark:text-amber-300' : 'text-muted-foreground')}>
        {hint}
      </div>
    </div>
  )
}

function IconButton({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-background/40 text-muted-foreground transition hover:bg-foreground/10 hover:text-foreground"
    >
      {children}
    </button>
  )
}

function CohortChart() {
  const max = Math.max(
    ...COHORT_WEEKS.map((w) => w.sıcak + w.ılık + w.soğuk),
    1,
  )
  return (
    <article className="rounded-2xl border border-border bg-card p-5">
      <header className="mb-4">
        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Haftalık kohort
        </div>
        <h3 className="font-serif text-lg font-medium tracking-tight">
          Yeni temaslar
        </h3>
      </header>
      <div className="space-y-2.5">
        {COHORT_WEEKS.map((w) => {
          const total = w.sıcak + w.ılık + w.soğuk
          const pct = (n: number) => (total === 0 ? 0 : (n / total) * 100)
          return (
            <div key={w.label} className="space-y-1">
              <div className="flex items-baseline justify-between text-[11px]">
                <span className="text-muted-foreground">{w.label}</span>
                <span className="font-mono tabular-nums text-foreground/80">{total}</span>
              </div>
              <div className="relative flex h-2 w-full overflow-hidden rounded-full bg-foreground/[0.06]">
                <div
                  className="h-full bg-rose-500/70"
                  style={{ width: `${(w.sıcak / max) * 100}%` }}
                  title={`Sıcak: ${w.sıcak}`}
                />
                <div
                  className="h-full bg-amber-500/70"
                  style={{ width: `${(w.ılık / max) * 100}%` }}
                  title={`Ilık: ${w.ılık}`}
                />
                <div
                  className="h-full bg-sky-500/70"
                  style={{ width: `${(w.soğuk / max) * 100}%` }}
                  title={`Soğuk: ${w.soğuk}`}
                />
              </div>
              <div className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500/70" />
                  {w.sıcak}
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500/70" />
                  {w.ılık}
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-sky-500/70" />
                  {w.soğuk}
                </span>
                <span className="ml-auto tabular-nums">{Math.round(pct(w.sıcak))}% Sıcak</span>
              </div>
            </div>
          )
        })}
      </div>
    </article>
  )
}
