import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Inbox,
  Paperclip,
  Phone,
  Pin,
  Plus,
  Search,
  Send,
  Sparkles,
} from '@landx/icons'
import { PageShell, ErrorState, SkeletonRow } from '@landx/ui'
import { SegmentChip } from '@landx/ui'
import {
  CHANNEL_LABELS,
  CONVERSATIONS,
  useConversations,
  type Conversation,
  type Message,
  type MessageChannel,
} from '@landx/data'
import { timeAgo } from '@landx/ui'
import { cn } from '@landx/ui'
import { useMockStream } from '@landx/ui/lib'
import { LiveStatusBadge } from '@/components/messages/LiveStatusBadge'

interface IncomingEvent {
  id: string
  conversationId: string
  customerName: string
  body: string
  timestamp: string
  channel: MessageChannel
}

const MOCK_BODIES = [
  'Tapu fotoğrafını az önce paylaştım, bakabilir misiniz?',
  'Yarın saat 14:00 müsait misiniz?',
  'Fiyatta ufak bir esneklik mümkün mü?',
  'Krokiyi WhatsApp\'tan gönderebilir misiniz?',
  'Konum için yol tarifi alabilir miyim?',
]

const MOCK_NEW_CUSTOMERS = [
  { name: 'Emre Akman', initials: 'EA', channel: 'whatsapp' as MessageChannel },
  { name: 'Selin Doğan', initials: 'SD', channel: 'sahibinden' as MessageChannel },
  { name: 'Halil Tunç', initials: 'HT', channel: 'email' as MessageChannel },
]

const CHANNEL_COLORS: Record<MessageChannel, string> = {
  whatsapp: 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/10',
  sahibinden: 'text-amber-700 dark:text-amber-300 bg-amber-500/10',
  phone: 'text-sky-700 dark:text-sky-300 bg-sky-500/10',
  email: 'text-violet-700 dark:text-violet-300 bg-violet-500/10',
  internal: 'text-slate-700 dark:text-slate-300 bg-slate-500/10',
}

export function Messages() {
  const {
    data: conversations = [],
    isLoading,
    error,
    refetch,
  } = useConversations()

  const [activeId, setActiveId] = useState<string>(CONVERSATIONS[0].id)
  const [search, setSearch] = useState('')
  const [draft, setDraft] = useState('')
  const [messages, setMessages] = useState<Record<string, Message[]>>(() => {
    const m: Record<string, Message[]> = {}
    for (const c of CONVERSATIONS) m[c.id] = [...c.messages]
    return m
  })
  const [liveExtras, setLiveExtras] = useState<Conversation[]>([])
  const [liveOverrides, setLiveOverrides] = useState<
    Record<string, { lastPreview: string; lastAt: string; unread: number }>
  >({})
  const threadRef = useRef<HTMLDivElement>(null)

  const { events } = useMockStream<IncomingEvent>({
    intervalMs: 8000,
    maxBuffer: 12,
    generator: (cursor) => {
      // Drop ~40% of ticks to feel realistic.
      if (cursor % 5 === 0 || cursor % 7 === 0) return null
      const existing = CONVERSATIONS[cursor % CONVERSATIONS.length]
      const useExisting = cursor % 3 !== 0
      const body = MOCK_BODIES[cursor % MOCK_BODIES.length]
      const timestamp = new Date().toISOString()
      if (useExisting) {
        return {
          id: `live-${cursor}`,
          conversationId: existing.id,
          customerName: existing.customerName,
          body,
          timestamp,
          channel: existing.channel,
        }
      }
      const fresh = MOCK_NEW_CUSTOMERS[cursor % MOCK_NEW_CUSTOMERS.length]
      return {
        id: `live-${cursor}`,
        conversationId: `C-LIVE-${cursor}`,
        customerName: fresh.name,
        body,
        timestamp,
        channel: fresh.channel,
      }
    },
  })

  const lastSeenCursorRef = useRef<string | null>(null)
  useEffect(() => {
    if (events.length === 0) return
    const head = events[0]
    if (lastSeenCursorRef.current === head.id) return
    lastSeenCursorRef.current = head.id

    const fresh = MOCK_NEW_CUSTOMERS.find((c) => c.name === head.customerName)
    const isNewConv = head.conversationId.startsWith('C-LIVE-')
    if (isNewConv && fresh) {
      setLiveExtras((prev) => {
        if (prev.some((c) => c.id === head.conversationId)) return prev
        const conv: Conversation = {
          id: head.conversationId,
          customerId: `M-LIVE-${head.conversationId.slice(7)}`,
          customerName: head.customerName,
          customerAvatarInitials: fresh.initials,
          channel: head.channel,
          lastPreview: head.body,
          lastAt: head.timestamp,
          unreadCount: 1,
          segment: 'Sıcak',
          messages: [
            {
              id: head.id,
              sender: 'them',
              content: head.body,
              time: head.timestamp,
              channel: head.channel,
            },
          ],
        }
        return [conv, ...prev]
      })
      setMessages((prev) => ({
        ...prev,
        [head.conversationId]: [
          {
            id: head.id,
            sender: 'them',
            content: head.body,
            time: head.timestamp,
            channel: head.channel,
          },
        ],
      }))
    } else {
      setLiveOverrides((prev) => {
        const cur = prev[head.conversationId]
        return {
          ...prev,
          [head.conversationId]: {
            lastPreview: head.body,
            lastAt: head.timestamp,
            unread: (cur?.unread ?? 0) + (head.conversationId === activeId ? 0 : 1),
          },
        }
      })
      setMessages((prev) => ({
        ...prev,
        [head.conversationId]: [
          ...(prev[head.conversationId] ?? []),
          {
            id: head.id,
            sender: 'them',
            content: head.body,
            time: head.timestamp,
            channel: head.channel,
          },
        ],
      }))
    }
  }, [events, activeId])

  const mergedConversations = useMemo<Conversation[]>(() => {
    const base = conversations.map((c) => {
      const ovr = liveOverrides[c.id]
      if (!ovr) return c
      return {
        ...c,
        lastPreview: ovr.lastPreview,
        lastAt: ovr.lastAt,
        unreadCount: c.unreadCount + ovr.unread,
      }
    })
    return [...liveExtras, ...base]
  }, [conversations, liveOverrides, liveExtras])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = q
      ? mergedConversations.filter((c) =>
          `${c.customerName} ${c.lastPreview}`.toLowerCase().includes(q),
        )
      : mergedConversations
    return [...list].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1
      if (!a.pinned && b.pinned) return 1
      return new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime()
    })
  }, [search, mergedConversations])

  const active = useMemo(
    () => mergedConversations.find((c) => c.id === activeId),
    [activeId, mergedConversations],
  )

  const activeMessages = active ? messages[active.id] ?? [] : []

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' })
  }, [activeMessages.length])

  const send = () => {
    const text = draft.trim()
    if (!text || !active) return
    const m: Message = {
      id: `msg-${Date.now()}`,
      sender: 'me',
      content: text,
      time: new Date().toISOString(),
      channel: active.channel,
    }
    setMessages((prev) => ({ ...prev, [active.id]: [...(prev[active.id] ?? []), m] }))
    setDraft('')
  }

  const unreadTotal = mergedConversations.reduce((s, c) => s + c.unreadCount, 0)

  return (
    <PageShell
      eyebrow="MOD · MESAJLAR"
      title={
        <>
          Müşteri <em className="font-serif italic font-light">sohbetleri</em>
        </>
      }
      description={`${mergedConversations.length} aktif sohbet · ${unreadTotal} okunmamış mesaj.`}
      actions={
        <div className="flex items-center gap-2">
          <LiveStatusBadge events={events.length} />
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90"
          >
            <Plus className="h-3.5 w-3.5" />
            Yeni sohbet
          </button>
        </div>
      }
    >
      {error ? (
        <ErrorState
          title="Sohbetler yüklenemedi"
          error={error}
          onRetry={() => refetch()}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:h-[calc(100dvh-220px)] lg:min-h-[520px] lg:grid-cols-[360px_1fr]">
          <ThreadList
            conversations={filtered}
            activeId={activeId}
            onSelect={setActiveId}
            search={search}
            onSearchChange={setSearch}
            isLoading={isLoading}
          />
          <div className="flex min-h-[420px] min-w-0 flex-col rounded-2xl border border-border bg-card lg:min-h-0">
            {active ? (
              <ActivePanel
                conversation={active}
                messages={activeMessages}
                threadRef={threadRef}
                draft={draft}
                onDraftChange={setDraft}
                onSend={send}
              />
            ) : (
              <EmptyPanel />
            )}
          </div>
        </div>
      )}
    </PageShell>
  )
}

function ThreadList({
  conversations,
  activeId,
  onSelect,
  search,
  onSearchChange,
  isLoading,
}: {
  conversations: Conversation[]
  activeId: string
  onSelect: (id: string) => void
  search: string
  onSearchChange: (v: string) => void
  isLoading?: boolean
}) {
  return (
    <aside className="flex max-h-[360px] min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-card lg:max-h-none">
      <div className="border-b border-border p-3">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-background/50 px-3 py-2">
          <Search className="h-4 w-4 flex-none text-muted-foreground" />
          <label htmlFor="search-input-messages" className="sr-only">
            Konuşma ara
          </label>
          <input
            id="search-input-messages"
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="İsim veya içerik ara…"
            className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>
      <ul className="flex-1 overflow-y-auto p-2">
        {isLoading && conversations.length === 0 ? (
          <li className="space-y-2 p-2" data-testid="messages-skeleton">
            <SkeletonRow cells={2} />
            <SkeletonRow cells={2} />
            <SkeletonRow cells={2} />
            <SkeletonRow cells={2} />
            <SkeletonRow cells={2} />
            <SkeletonRow cells={2} />
            <SkeletonRow cells={2} />
            <SkeletonRow cells={2} />
          </li>
        ) : conversations.length === 0 ? (
          <li className="px-4 py-12 text-center font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            Sonuç yok
          </li>
        ) : (
          conversations.map((c) => {
            const active = c.id === activeId
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => onSelect(c.id)}
                  className={cn(
                    'flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition',
                    active ? 'bg-foreground/[0.06]' : 'hover:bg-foreground/[0.03]',
                  )}
                >
                  <Avatar initials={c.customerAvatarInitials} channel={c.channel} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {c.pinned && (
                          <Pin className="h-3 w-3 flex-none text-muted-foreground" />
                        )}
                        <h3 className="truncate text-[13px] font-semibold leading-tight">
                          {c.customerName}
                        </h3>
                      </div>
                      <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                        {timeAgo(c.lastAt)}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
                      {c.lastPreview}
                    </p>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider',
                          CHANNEL_COLORS[c.channel],
                        )}
                      >
                        {CHANNEL_LABELS[c.channel]}
                      </span>
                      {c.unreadCount > 0 && (
                        <span className="inline-flex h-4 min-w-[18px] items-center justify-center rounded-full bg-accent px-1 font-mono text-[10px] font-semibold text-accent-foreground">
                          {c.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              </li>
            )
          })
        )}
      </ul>
    </aside>
  )
}

function ActivePanel({
  conversation,
  messages,
  threadRef,
  draft,
  onDraftChange,
  onSend,
}: {
  conversation: Conversation
  messages: Message[]
  threadRef: React.RefObject<HTMLDivElement | null>
  draft: string
  onDraftChange: (v: string) => void
  onSend: () => void
}) {
  return (
    <>
      <header className="flex items-center justify-between gap-3 border-b border-border p-4">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar
            initials={conversation.customerAvatarInitials}
            channel={conversation.channel}
            size="lg"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate font-serif text-lg font-medium tracking-tight">
                {conversation.customerName}
              </h2>
              <SegmentChip segment={conversation.segment} />
            </div>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              {CHANNEL_LABELS[conversation.channel]} · {conversation.customerId}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <IconBtn label="Ara">
            <Phone className="h-3.5 w-3.5" />
          </IconBtn>
          <IconBtn label="AI özet">
            <Sparkles className="h-3.5 w-3.5" />
          </IconBtn>
        </div>
      </header>

      <div ref={threadRef} className="flex-1 overflow-y-auto p-5">
        <ul className="space-y-3">
          {messages.map((m) => (
            <li key={m.id}>
              <Bubble message={m} customerName={conversation.customerName} />
            </li>
          ))}
        </ul>
      </div>

      <footer className="border-t border-border bg-background/40 p-3">
        <div className="flex items-end gap-2 rounded-xl border border-border bg-card px-3 py-2">
          <button
            type="button"
            aria-label="Ek dosya"
            className="flex h-7 w-7 flex-none items-center justify-center rounded-lg text-muted-foreground transition hover:bg-foreground/5 hover:text-foreground"
          >
            <Paperclip className="h-3.5 w-3.5" />
          </button>
          <textarea
            aria-label={`${CHANNEL_LABELS[conversation.channel]} ile yanıt yaz`}
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                onSend()
              }
            }}
            placeholder={`${CHANNEL_LABELS[conversation.channel]} ile yanıt yaz…`}
            rows={1}
            className="max-h-32 min-h-[28px] flex-1 resize-none border-0 bg-transparent text-sm leading-relaxed outline-none placeholder:text-muted-foreground"
          />
          <button
            type="button"
            onClick={onSend}
            disabled={!draft.trim()}
            aria-label="Gönder"
            className="flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-accent text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
        <p className="mt-1.5 px-2 font-mono text-[10px] text-muted-foreground">
          Enter → Gönder · Shift+Enter → Yeni satır
        </p>
      </footer>
    </>
  )
}

function Bubble({ message, customerName }: { message: Message; customerName: string }) {
  if (message.sender === 'system') {
    return (
      <div className="my-2 flex items-center justify-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        <span className="h-px flex-1 bg-border/60" />
        {message.content}
        <span className="h-px flex-1 bg-border/60" />
      </div>
    )
  }
  const isMine = message.sender === 'me'
  return (
    <div className={cn('flex flex-col gap-1', isMine ? 'items-end' : 'items-start')}>
      <div
        className={cn(
          'max-w-[78%] rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-snug',
          isMine
            ? 'bg-foreground text-background rounded-br-md'
            : 'border border-border bg-background/60 rounded-bl-md',
        )}
      >
        {message.content}
      </div>
      <div className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
        <span>{isMine ? 'Sen' : customerName}</span>
        <span aria-hidden>·</span>
        <span>
          {new Date(message.time).toLocaleTimeString('tr-TR', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
        {message.channel && (
          <>
            <span aria-hidden>·</span>
            <span>{CHANNEL_LABELS[message.channel]}</span>
          </>
        )}
      </div>
    </div>
  )
}

function Avatar({
  initials,
  channel,
  size = 'md',
}: {
  initials: string
  channel: MessageChannel
  size?: 'md' | 'lg'
}) {
  const dim = size === 'lg' ? 'h-10 w-10 text-[13px]' : 'h-9 w-9 text-[12px]'
  return (
    <div className="relative flex-none">
      <span
        aria-hidden
        className={cn(
          'inline-flex items-center justify-center rounded-full bg-foreground/[0.08] font-mono font-semibold text-foreground/85',
          dim,
        )}
      >
        {initials}
      </span>
      <span
        aria-hidden
        className={cn(
          'absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full ring-2 ring-card',
          CHANNEL_COLORS[channel],
        )}
        title={CHANNEL_LABELS[channel]}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
      </span>
    </div>
  )
}

function IconBtn({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background/40 text-muted-foreground transition hover:bg-foreground/10 hover:text-foreground"
    >
      {children}
    </button>
  )
}

function EmptyPanel() {
  return (
    <div className="grid flex-1 place-items-center">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-foreground/[0.06] text-foreground/80">
          <Inbox className="h-5 w-5" />
        </span>
        <h3 className="font-serif text-lg font-medium tracking-tight">
          Bir sohbet seç
        </h3>
        <p className="max-w-xs text-sm text-muted-foreground">
          Sol panelden bir müşteri seçtiğinde detay burada açılır.
        </p>
      </div>
    </div>
  )
}

