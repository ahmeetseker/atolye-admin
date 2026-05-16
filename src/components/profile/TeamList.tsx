import { useState, useSyncExternalStore } from 'react'
import {
  Mail,
  Plus,
  Trash2,
  UserCheck,
  UserMinus,
} from '@landx/icons'
import { cn } from '@landx/ui'
import {
  getTeamMembers,
  removeMember,
  setMemberStatus,
  updateMemberRole,
  SELF_ID,
  type TeamMember,
  type TeamRole,
  type TeamStatus,
} from '@/lib/admin-team'
import { useToast } from '@/lib/use-toast'
import { InviteMemberDialog } from './InviteMemberDialog'

/**
 * Cross-tab + intra-tab team store subscription so InviteMemberDialog and
 * row actions trigger re-render without lifting state up to the page.
 *
 * We cache the snapshot here because `getTeamMembers()` reads the storage
 * (allocating a fresh array each call). `useSyncExternalStore` requires a
 * stable reference between notifications or React will infinite-loop on
 * mismatch detection (`getSnapshot should be cached`).
 */
const teamListeners = new Set<() => void>()
let teamCache: TeamMember[] | null = null
function notifyTeamChange() {
  teamCache = getTeamMembers()
  for (const l of teamListeners) l()
}
function subscribeTeam(cb: () => void) {
  teamListeners.add(cb)
  return () => teamListeners.delete(cb)
}
function getTeamSnapshot(): TeamMember[] {
  if (teamCache === null) teamCache = getTeamMembers()
  return teamCache
}
export function broadcastTeamChange() {
  notifyTeamChange()
}

function useTeamMembers(): TeamMember[] {
  return useSyncExternalStore(subscribeTeam, getTeamSnapshot, getTeamSnapshot)
}

const ROLE_LABEL: Record<TeamRole, string> = {
  admin: 'Yönetici',
  agent: 'Danışman',
  finance: 'Muhasebe',
  viewer: 'İzleyici',
}

const ROLE_TONE: Record<TeamRole, string> = {
  admin: 'bg-foreground/10 text-foreground',
  agent: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  finance: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  viewer: 'bg-foreground/[0.06] text-foreground/80',
}

const STATUS_LABEL: Record<TeamStatus, string> = {
  active: 'Aktif',
  pending: 'Davet bekliyor',
  suspended: 'Askıda',
}

const STATUS_TONE: Record<TeamStatus, string> = {
  active: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  pending: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  suspended: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
}

const ROLES: TeamRole[] = ['admin', 'agent', 'finance', 'viewer']

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function fmtDate(ts?: number): string {
  if (!ts) return '—'
  return new Date(ts).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function TeamList() {
  const members = useTeamMembers()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const { toast } = useToast()

  const handleRoleChange = (id: string, role: TeamRole) => {
    updateMemberRole(id, role)
    notifyTeamChange()
    toast('Rol güncellendi', { variant: 'success' })
  }

  const handleSuspendToggle = (m: TeamMember) => {
    const next: TeamStatus = m.status === 'suspended' ? 'active' : 'suspended'
    setMemberStatus(m.id, next)
    notifyTeamChange()
    toast(
      next === 'suspended' ? 'Üye askıya alındı' : 'Üye yeniden etkin',
      { variant: next === 'suspended' ? 'warning' : 'success' },
    )
  }

  const handleRemove = (id: string) => {
    removeMember(id)
    notifyTeamChange()
    setConfirmId(null)
    toast('Üye silindi', { variant: 'success' })
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4 md:p-5">
      <header className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h3
            className="font-serif text-lg font-medium tracking-tight"
            id="profile-team-heading"
          >
            Ekip
          </h3>
          <p className="text-[12.5px] text-muted-foreground">
            {members.length} üye · davet et, rolü değiştir, askıya al.
          </p>
        </div>
        <button
          type="button"
          data-testid="team-invite-trigger"
          onClick={() => setInviteOpen(true)}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-foreground px-3 py-2 text-[12.5px] font-medium text-background transition hover:opacity-90 md:min-h-0"
        >
          <Plus className="h-3.5 w-3.5" />
          Üye davet et
        </button>
      </header>

      <div className="overflow-x-auto">
        <table
          className="w-full min-w-[680px] border-collapse text-left text-[13px]"
          data-testid="team-list-table"
        >
          <thead>
            <tr className="border-b border-border font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              <th className="py-2 pr-3 font-medium">Üye</th>
              <th className="py-2 pr-3 font-medium">Rol</th>
              <th className="py-2 pr-3 font-medium">Durum</th>
              <th className="py-2 pr-3 font-medium">Davet</th>
              <th className="py-2 pr-3 font-medium">Katıldı</th>
              <th className="py-2 pr-3 text-right font-medium">Aksiyon</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => {
              const disabled = m.id === SELF_ID
              return (
                <tr
                  key={m.id}
                  data-testid={`team-row-${m.id}`}
                  className="border-b border-border/70 last:border-0"
                >
                  <td className="py-2.5 pr-3">
                    <div className="flex items-center gap-2.5">
                      <span
                        aria-hidden
                        className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-foreground/[0.08] font-mono text-[11px] font-semibold"
                      >
                        {initials(m.name)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-medium leading-tight">
                          {m.name}
                          {disabled && (
                            <span className="ml-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                              Sen
                            </span>
                          )}
                        </p>
                        <p className="mt-0.5 inline-flex items-center gap-1 font-mono text-[10.5px] text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          {m.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 pr-3">
                    {disabled ? (
                      <span
                        className={cn(
                          'inline-flex rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider',
                          ROLE_TONE[m.role],
                        )}
                      >
                        {ROLE_LABEL[m.role]}
                      </span>
                    ) : (
                      <select
                        aria-label={`${m.name} rol`}
                        data-testid={`team-role-${m.id}`}
                        value={m.role}
                        onChange={(e) =>
                          handleRoleChange(m.id, e.target.value as TeamRole)
                        }
                        className="rounded-lg border border-border bg-background/40 px-2 py-1 font-mono text-[11px] uppercase tracking-wider"
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABEL[r]}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="py-2.5 pr-3">
                    <span
                      data-testid={`team-status-${m.id}`}
                      className={cn(
                        'inline-flex rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider',
                        STATUS_TONE[m.status],
                      )}
                    >
                      {STATUS_LABEL[m.status]}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3 font-mono text-[11px] text-muted-foreground">
                    {fmtDate(m.invitedAt)}
                  </td>
                  <td className="py-2.5 pr-3 font-mono text-[11px] text-muted-foreground">
                    {fmtDate(m.joinedAt)}
                  </td>
                  <td className="py-2.5 pr-3">
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        data-testid={`team-suspend-${m.id}`}
                        onClick={() => handleSuspendToggle(m)}
                        disabled={disabled}
                        className="inline-flex items-center gap-1 rounded-lg border border-border bg-background/60 px-2 py-1 text-[11px] font-medium transition hover:bg-foreground/[0.05] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {m.status === 'suspended' ? (
                          <>
                            <UserCheck className="h-3 w-3" />
                            Etkinleştir
                          </>
                        ) : (
                          <>
                            <UserMinus className="h-3 w-3" />
                            Askıya al
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        data-testid={`team-remove-${m.id}`}
                        onClick={() => setConfirmId(m.id)}
                        disabled={disabled}
                        className="inline-flex items-center gap-1 rounded-lg border border-border bg-background/60 px-2 py-1 text-[11px] font-medium text-rose-700 transition hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-40 dark:text-rose-300"
                      >
                        <Trash2 className="h-3 w-3" />
                        Çıkar
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <InviteMemberDialog
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInvited={() => notifyTeamChange()}
      />

      {confirmId && (
        <RemoveMemberConfirm
          member={members.find((m) => m.id === confirmId) ?? null}
          onCancel={() => setConfirmId(null)}
          onConfirm={() => handleRemove(confirmId)}
        />
      )}
    </div>
  )
}

function RemoveMemberConfirm({
  member,
  onCancel,
  onConfirm,
}: {
  member: TeamMember | null
  onCancel: () => void
  onConfirm: () => void
}) {
  if (!member) return null
  return (
    <div
      data-testid="team-remove-dialog"
      className="fixed inset-0 z-[80] grid place-items-center p-4"
    >
      <button
        type="button"
        aria-label="Kapat"
        onClick={onCancel}
        className="absolute inset-0 cursor-default bg-foreground/40 backdrop-blur-sm"
      />
      <div
        role="alertdialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-xl"
      >
        <div className="p-5">
          <h2 className="font-serif text-lg font-light leading-tight">
            <em className="font-serif italic font-light">{member.name}</em>{' '}
            silinsin mi?
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
            Üyelik kaldırılır ve panelinize erişimi sonlanır. Bu işlem geri
            alınamaz.
          </p>
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-border bg-muted/30 px-5 py-3 md:flex-row md:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-[13px] font-medium transition hover:bg-foreground/5"
          >
            İptal
          </button>
          <button
            type="button"
            data-testid="team-remove-confirm"
            onClick={onConfirm}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-foreground px-4 py-2 text-[13px] font-medium text-background transition hover:opacity-90"
          >
            Sil
          </button>
        </div>
      </div>
    </div>
  )
}
