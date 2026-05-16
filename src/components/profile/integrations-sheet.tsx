import { Plug, RefreshCw } from '@landx/icons'
import { Dialog, ErrorState, SkeletonRow, cn } from '@landx/ui'
import { useIntegrations } from '@landx/data'
import type { Integration, IntegrationStatus } from '@landx/data'

interface IntegrationsSheetProps {
  open: boolean
  onClose: () => void
}

const STATUS_ORDER: IntegrationStatus[] = ['Bağlı', 'Uyarı', 'Bağlı değil']

const STATUS_TONES: Record<
  IntegrationStatus,
  { bg: string; fg: string; dot: string }
> = {
  Bağlı: {
    bg: 'bg-emerald-500/10',
    fg: 'text-emerald-700 dark:text-emerald-300',
    dot: 'bg-emerald-500',
  },
  Uyarı: {
    bg: 'bg-amber-500/10',
    fg: 'text-amber-700 dark:text-amber-300',
    dot: 'bg-amber-500',
  },
  'Bağlı değil': {
    bg: 'bg-slate-500/10',
    fg: 'text-slate-700 dark:text-slate-300',
    dot: 'bg-slate-400',
  },
}

export function IntegrationsSheet({ open, onClose }: IntegrationsSheetProps) {
  const {
    data: integrations = [],
    isLoading,
    error,
    refetch,
  } = useIntegrations()

  const grouped = STATUS_ORDER.map((status) => ({
    status,
    items: integrations.filter((i) => i.status === status),
  })).filter((g) => g.items.length > 0)

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title={
        <span className="flex flex-col gap-0.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            MOD · ENTEGRASYONLAR
          </span>
          <span className="font-serif text-lg font-light tracking-tight">
            Servis <em className="font-serif italic font-light">bağlantıları</em>
          </span>
        </span>
      }
      description={`${integrations.length} servis · son sync durumu`}
    >
      {error ? (
        <ErrorState
          title="Entegrasyonlar yüklenemedi"
          error={error as Error}
          onRetry={() => refetch()}
        />
      ) : isLoading ? (
        <div className="space-y-2">
          <SkeletonRow cells={3} />
          <SkeletonRow cells={3} />
          <SkeletonRow cells={3} />
        </div>
      ) : (
        <div className="space-y-5">
          {grouped.map((group) => (
            <section key={group.status}>
              <h4 className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {group.status} ({group.items.length})
              </h4>
              <ul className="space-y-2">
                {group.items.map((i) => (
                  <IntegrationRow key={i.id} integration={i} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </Dialog>
  )
}

function IntegrationRow({ integration: i }: { integration: Integration }) {
  const t = STATUS_TONES[i.status]
  const isConnected = i.status === 'Bağlı' || i.status === 'Uyarı'
  return (
    <li className="flex items-start gap-3 rounded-xl border border-border bg-background/40 p-3">
      <span
        className={cn(
          'flex h-9 w-9 flex-none items-center justify-center rounded-lg',
          t.bg,
          t.fg,
        )}
      >
        <Plug className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-2">
          <h5 className="truncate text-[13.5px] font-semibold leading-tight">
            {i.name}
          </h5>
          <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted-foreground">
            {i.category}
          </span>
          <span
            className={cn(
              'ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium',
              t.bg,
              t.fg,
            )}
          >
            <span className={cn('h-1 w-1 rounded-full', t.dot)} />
            {i.status}
          </span>
        </div>
        <p className="mt-0.5 text-[11.5px] text-muted-foreground">
          {i.description}
        </p>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          {i.lastSyncAt ? (
            <p className="font-mono text-[10px] text-muted-foreground">
              Son sync:{' '}
              {new Date(i.lastSyncAt).toLocaleString('tr-TR', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          ) : (
            <p className="font-mono text-[10px] text-muted-foreground">
              Henüz bağlanmadı
            </p>
          )}
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-background/60 px-2 py-1 text-[11px] font-medium transition hover:bg-foreground/[0.05]"
          >
            {isConnected ? (
              <>
                <RefreshCw className="h-3 w-3" />
                Yenile
              </>
            ) : (
              <>
                <Plug className="h-3 w-3" />
                Bağlan
              </>
            )}
          </button>
        </div>
      </div>
    </li>
  )
}
