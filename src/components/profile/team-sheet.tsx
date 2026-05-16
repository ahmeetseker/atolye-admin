import { Mail, Phone, Plus, ShieldCheck, UserMinus } from '@landx/icons'
import { Dialog, ErrorState, SkeletonRow, cn } from '@landx/ui'
import { useTeam } from '@landx/data'

interface TeamSheetProps {
  open: boolean
  onClose: () => void
}

const ROLE_TONE: Record<string, string> = {
  Patron: 'bg-foreground/10 text-foreground',
  Senior: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  Junior: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
}

export function TeamSheet({ open, onClose }: TeamSheetProps) {
  const { data: team = [], isLoading, error, refetch } = useTeam()

  const onlineCount = team.filter((m) => m.online).length

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title={
        <span className="flex flex-col gap-0.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            MOD · EKİP
          </span>
          <span className="font-serif text-lg font-light tracking-tight">
            Atölye <em className="font-serif italic font-light">ekibi</em>
          </span>
        </span>
      }
      description={
        team.length
          ? `${team.length} üye · ${onlineCount} çevrimiçi`
          : 'Ekip listesi yükleniyor'
      }
      footer={
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-1.5 text-xs font-medium text-background transition-opacity hover:opacity-90"
        >
          <Plus className="h-3.5 w-3.5" />
          Yeni üye davet et
        </button>
      }
    >
      {error ? (
        <ErrorState
          title="Ekip yüklenemedi"
          description="Sunucuya ulaşılamadı."
          error={error as Error}
          onRetry={() => refetch()}
        />
      ) : isLoading ? (
        <div className="space-y-2">
          <SkeletonRow cells={4} />
          <SkeletonRow cells={4} />
          <SkeletonRow cells={4} />
        </div>
      ) : (
        <ul className="space-y-2">
          {team.map((m) => (
            <li
              key={m.id}
              className="flex flex-wrap items-start gap-3 rounded-xl border border-border bg-background/40 p-3"
            >
              <div className="relative flex-none">
                <span
                  aria-hidden
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground/[0.08] font-mono text-[12px] font-semibold"
                >
                  {m.initials}
                </span>
                {m.online && (
                  <span
                    aria-hidden
                    className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-card"
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="truncate text-[14px] font-medium leading-tight">
                    {m.name}
                  </h4>
                  <span
                    className={cn(
                      'inline-flex rounded-full px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider',
                      ROLE_TONE[m.role] ?? 'bg-foreground/[0.06] text-foreground/80',
                    )}
                  >
                    {m.role}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10.5px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {m.email}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {m.phone}
                  </span>
                </div>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  {m.activeDeals} aktif fırsat ·{' '}
                  {new Date(m.joinedAt).toLocaleDateString('tr-TR', {
                    month: 'short',
                    year: 'numeric',
                  })}{' '}
                  katıldı
                </p>
              </div>
              <div className="flex flex-none flex-wrap gap-1.5 sm:flex-col">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-lg border border-border bg-background/60 px-2 py-1 text-[11px] font-medium transition hover:bg-foreground/[0.05]"
                >
                  <ShieldCheck className="h-3 w-3" />
                  Yetki düzenle
                </button>
                <button
                  type="button"
                  disabled={m.role === 'Patron'}
                  className="inline-flex items-center gap-1 rounded-lg border border-border bg-background/60 px-2 py-1 text-[11px] font-medium text-rose-700 transition hover:bg-rose-500/10 disabled:opacity-40 dark:text-rose-300"
                >
                  <UserMinus className="h-3 w-3" />
                  Çıkar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  )
}
