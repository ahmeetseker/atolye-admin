import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react'
import { useNavigate } from 'react-router'
import { AnimatePresence, motion, type Transition } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Calendar,
  Coins,
  Layers,
  MapPin,
  Receipt,
  Sparkles,
  User,
  Users,
  Wallet,
  X,
} from '@landx/icons'
import { Blocks } from './blocks'
import { STAGES, classify } from '@/lib/assistant/engine'
import type {
  AssistantResponse,
  ChatTurn,
  EntityType,
  SearchResult,
} from '@/lib/assistant/types'
import {
  useAssistantSearch,
  useRecentSearches,
} from '@/lib/assistant/use-assistant-search'
import { cn } from '@landx/ui'
import { REDUCED_MOTION_TRANSITION, motionGate } from '@landx/ui/lib'

interface AssistantModalProps {
  open: boolean
  onClose: () => void
}

interface Shortcut {
  icon: typeof Sparkles
  title: string
  description: string
  prompt: string
}

const SHORTCUTS: Shortcut[] = [
  {
    icon: Layers,
    title: 'İlanlar',
    description: 'Lokasyon, tip, fiyat aralığına göre arsa bul.',
    prompt: 'Ayvalık zeytinlik 6M altı',
  },
  {
    icon: Users,
    title: 'Müşteriler',
    description: 'Sıcak adayları ve görüşme aşamasını gör.',
    prompt: 'Sıcak müşteriler kim?',
  },
  {
    icon: Coins,
    title: 'Tahsilat',
    description: 'Bekleyen ödemeler ve yaşına göre dağılım.',
    prompt: 'Bekleyen tahsilat 30 gün üstü',
  },
  {
    icon: BarChart3,
    title: 'Ekip karnesi',
    description: 'Bu ay kim kaç satış kapadı, ciro karşılaştırması.',
    prompt: 'Ekip performansı',
  },
  {
    icon: Wallet,
    title: 'Bölge',
    description: 'En yoğun bölgeler ve haftalık trend.',
    prompt: 'Bölge yoğunluğu',
  },
  {
    icon: Sparkles,
    title: 'Takvim',
    description: 'Yaklaşan tapu randevuları ve yer gösterimleri.',
    prompt: 'Bu hafta tapu randevuları',
  },
]

export function AssistantModal({ open, onClose }: AssistantModalProps) {
  const [mode, setMode] = useState<'modules' | 'chat'>('modules')
  const [draft, setDraft] = useState('')
  const [turns, setTurns] = useState<ChatTurn[]>([])
  const [stage, setStage] = useState(0)
  const [, startTransition] = useTransition()
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const threadRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const stageTimers = useRef<number[]>([])
  // Assistant-specific easing kept local (panel deliberately glides rather than
  // springs); motionGate disables both for reduced-motion users.
  const backdropTransition = motionGate<Transition>(REDUCED_MOTION_TRANSITION, { duration: 0.22 })
  const panelTransition = motionGate<Transition>(REDUCED_MOTION_TRANSITION, {
    duration: 0.32,
    ease: [0.32, 0.72, 0, 1] as const,
  })

  // Cross-entity command palette search — index built once, query deferred.
  const { results } = useAssistantSearch(draft, { limit: 12 })
  const { recent, push: pushRecent } = useRecentSearches()
  const groupedResults = useMemo(() => groupResults(results), [results])
  const showSearch = mode === 'modules' && draft.trim().length > 0

  const reset = useCallback(() => {
    setMode('modules')
    setDraft('')
    setTurns([])
    setStage(0)
    stageTimers.current.forEach((t) => window.clearTimeout(t))
    stageTimers.current = []
  }, [])

  useEffect(() => {
    if (!open) {
      reset()
      return
    }
    const t = window.setTimeout(() => inputRef.current?.focus(), 200)
    const prefill = sessionStorage.getItem('assistant-prefill')
    if (prefill) {
      sessionStorage.removeItem('assistant-prefill')
      setDraft(prefill)
      window.setTimeout(() => submit(prefill), 60)
    }
    return () => window.clearTimeout(t)
  }, [open, reset])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    threadRef.current?.scrollTo({
      top: threadRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [turns.length])

  const submit = useCallback(
    (text: string) => {
      const q = text.trim()
      if (!q) return
      stageTimers.current.forEach((t) => window.clearTimeout(t))
      stageTimers.current = []
      setMode('chat')
      setDraft('')
      const userTurn: ChatTurn = {
        id: `t-${Date.now()}-u`,
        role: 'user',
        text: q,
        createdAt: new Date().toISOString(),
      }
      const placeholderId = `t-${Date.now()}-a`
      const placeholder: ChatTurn = {
        id: placeholderId,
        role: 'assistant',
        text: '',
        thinking: true,
        createdAt: new Date().toISOString(),
      }
      setTurns((prev) => [...prev, userTurn, placeholder])
      setStage(0)
      stageTimers.current.push(window.setTimeout(() => setStage(1), 480))
      stageTimers.current.push(window.setTimeout(() => setStage(2), 960))
      stageTimers.current.push(
        window.setTimeout(() => {
          const response = classify(q)
          startTransition(() => {
            setTurns((prev) =>
              prev.map((t) =>
                t.id === placeholderId
                  ? {
                      ...t,
                      thinking: false,
                      text: response.text,
                      response,
                    }
                  : t,
              ),
            )
          })
        }, 1500),
      )
    },
    [],
  )

  const handleChip = useCallback(
    (text: string) => {
      submit(text)
    },
    [submit],
  )

  // Reset active index whenever the result set shape changes.
  useEffect(() => {
    setActiveIdx(0)
  }, [results.length, draft])

  const pickResult = useCallback(
    (result: SearchResult) => {
      pushRecent(draft)
      onClose()
      navigate(result.href)
    },
    [draft, navigate, onClose, pushRecent],
  )

  // Keyboard navigation while the search panel is visible.
  useEffect(() => {
    if (!open || !showSearch) return
    const onKey = (e: KeyboardEvent) => {
      if (results.length === 0) return
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIdx((i) => (i + 1) % results.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIdx((i) => (i - 1 + results.length) % results.length)
      } else if (e.key === 'Enter' && !e.shiftKey) {
        const target = results[activeIdx] ?? results[0]
        if (target) {
          e.preventDefault()
          e.stopPropagation()
          pickResult(target)
        }
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [open, showSearch, results, activeIdx, pickResult])

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="assistant-backdrop"
            className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={backdropTransition}
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            key="assistant-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Atölye asistanı"
            className="fixed left-1/2 top-1/2 z-50 flex h-[min(720px,calc(100dvh-3rem))] w-[min(1080px,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-border bg-background shadow-[0_60px_120px_-40px_rgba(0,0,0,0.55)]"
            style={{
              translateX: '-50%',
              translateY: '-50%',
              contain: 'layout style paint',
            }}
            initial={{ opacity: 0, scale: 0.92, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 6 }}
            transition={panelTransition}
          >
            <Header mode={mode} onBack={() => setMode('modules')} onClose={onClose} />
            <div className="flex-1 overflow-hidden">
              {mode === 'chat' ? (
                <ChatScreen
                  turns={turns}
                  stage={stage}
                  onChipClick={handleChip}
                  onClose={onClose}
                  onNavigate={navigate}
                  threadRef={threadRef}
                />
              ) : showSearch ? (
                <SearchScreen
                  groups={groupedResults}
                  activeIdx={activeIdx}
                  onHover={setActiveIdx}
                  onPick={pickResult}
                  recent={recent}
                  onRecentClick={(q) => {
                    setDraft(q)
                    inputRef.current?.focus()
                  }}
                />
              ) : (
                <ModulesScreen
                  shortcuts={SHORTCUTS}
                  onPick={submit}
                  recent={recent}
                  onRecentClick={(q) => {
                    setDraft(q)
                    inputRef.current?.focus()
                  }}
                />
              )}
            </div>
            <Composer
              ref={inputRef}
              value={draft}
              onChange={setDraft}
              onSubmit={() => submit(draft)}
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function Header({
  mode,
  onBack,
  onClose,
}: {
  mode: 'modules' | 'chat'
  onBack: () => void
  onClose: () => void
}) {
  return (
    <header className="flex items-center justify-between gap-3 border-b border-border px-6 py-4">
      <div className="flex items-center gap-3">
        {mode === 'chat' && (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/60 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] transition hover:bg-foreground/[0.04]"
          >
            <ArrowLeft className="h-3 w-3" />
            Modüller
          </button>
        )}
        <div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.h1
              key={mode}
              className="font-serif text-2xl font-light tracking-tight"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
            >
              {mode === 'modules' ? (
                <>
                  Atölye <em className="font-serif italic font-light">asistanı</em>
                </>
              ) : (
                <>
                  Sohbet <em className="font-serif italic font-light">akışı</em>
                </>
              )}
            </motion.h1>
          </AnimatePresence>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {mode === 'modules' ? 'Bir konu seç veya doğrudan yaz' : 'Yanıtlar mock motordan gelir'}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Kapat"
        className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-foreground/10 hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </header>
  )
}

function ModulesScreen({
  shortcuts,
  onPick,
  recent,
  onRecentClick,
}: {
  shortcuts: Shortcut[]
  onPick: (prompt: string) => void
  recent: string[]
  onRecentClick: (q: string) => void
}) {
  return (
    <div className="h-full overflow-y-auto px-6 py-5">
      {recent.length > 0 && (
        <div className="mb-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Son aramalar
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {recent.length}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {recent.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => onRecentClick(q)}
                className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/40 px-3 py-1 font-mono text-[11px] text-muted-foreground transition hover:border-foreground/30 hover:text-foreground"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="mb-3 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Hızlı sorgular
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {shortcuts.length} modül
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {shortcuts.map((s) => {
          const Icon = s.icon
          return (
            <button
              key={s.title}
              type="button"
              onClick={() => onPick(s.prompt)}
              className="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 text-left transition hover:-translate-y-0.5 hover:border-foreground/30 hover:bg-foreground/[0.03]"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground/[0.06] text-foreground/80">
                  <Icon className="h-4 w-4" />
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
              </div>
              <div>
                <h3 className="text-[14px] font-semibold tracking-tight">{s.title}</h3>
                <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                  {s.description}
                </p>
              </div>
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-border/70 bg-background/40 px-2.5 py-1 font-mono text-[10px] text-muted-foreground">
                <Sparkles className="h-3 w-3" />
                {s.prompt}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

interface ResultGroup {
  type: EntityType
  label: string
  icon: typeof Sparkles
  items: Array<{ result: SearchResult; flatIndex: number }>
}

const ENTITY_LABELS: Record<EntityType, string> = {
  listing: 'İlanlar',
  customer: 'Müşteriler',
  deal: 'Satışlar',
  event: 'Takvim',
}

const ENTITY_ICONS: Record<EntityType, typeof Sparkles> = {
  listing: MapPin,
  customer: User,
  deal: Receipt,
  event: Calendar,
}

function groupResults(results: SearchResult[]): ResultGroup[] {
  const order: EntityType[] = ['listing', 'customer', 'deal', 'event']
  const map = new Map<EntityType, ResultGroup>()
  for (const t of order) {
    map.set(t, {
      type: t,
      label: ENTITY_LABELS[t],
      icon: ENTITY_ICONS[t],
      items: [],
    })
  }
  results.forEach((r, idx) => {
    map.get(r.type)?.items.push({ result: r, flatIndex: idx })
  })
  return order.map((t) => map.get(t)!).filter((g) => g.items.length > 0)
}

function SearchScreen({
  groups,
  activeIdx,
  onHover,
  onPick,
  recent,
  onRecentClick,
}: {
  groups: ResultGroup[]
  activeIdx: number
  onHover: (i: number) => void
  onPick: (r: SearchResult) => void
  recent: string[]
  onRecentClick: (q: string) => void
}) {
  const totalCount = groups.reduce((s, g) => s + g.items.length, 0)
  return (
    <div className="h-full overflow-y-auto px-6 py-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Arama sonuçları
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {totalCount === 0 ? 'eşleşme yok' : `${totalCount} eşleşme`}
        </span>
      </div>

      {totalCount === 0 && (
        <div className="rounded-2xl border border-border bg-card p-5 text-center">
          <p className="text-[13px] text-muted-foreground">
            Eşleşme bulunamadı. Farklı bir terim veya ID dener misin?
          </p>
          {recent.length > 0 && (
            <div className="mt-3 flex flex-wrap justify-center gap-1.5">
              {recent.slice(0, 5).map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => onRecentClick(q)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/40 px-3 py-1 font-mono text-[11px] text-muted-foreground transition hover:border-foreground/30 hover:text-foreground"
                >
                  {q}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="space-y-5">
        {groups.map((group) => {
          const GIcon = group.icon
          return (
            <section key={group.type}>
              <div className="mb-2 flex items-center gap-2 px-1">
                <GIcon className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {group.label}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  · {group.items.length}
                </span>
              </div>
              <ul role="listbox" className="flex flex-col gap-1.5">
                {group.items.map(({ result, flatIndex }) => {
                  const active = flatIndex === activeIdx
                  return (
                    <li key={`${result.type}-${result.id}`}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={active}
                        onMouseEnter={() => onHover(flatIndex)}
                        onClick={() => onPick(result)}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition',
                          active
                            ? 'border-foreground/40 bg-foreground/[0.06]'
                            : 'border-border bg-card hover:border-foreground/20 hover:bg-foreground/[0.03]',
                        )}
                      >
                        <span
                          aria-hidden
                          className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground"
                        >
                          {result.id}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium text-foreground">
                            {result.label}
                          </span>
                          <span className="block truncate text-[11px] text-muted-foreground">
                            {result.sublabel}
                          </span>
                        </span>
                        <ArrowRight
                          className={cn(
                            'h-3.5 w-3.5 flex-none transition',
                            active ? 'text-foreground translate-x-0.5' : 'text-muted-foreground',
                          )}
                        />
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}
      </div>
    </div>
  )
}

function ChatScreen({
  turns,
  stage,
  onChipClick,
  onClose,
  threadRef,
}: {
  turns: ChatTurn[]
  stage: number
  onChipClick: (text: string) => void
  onClose: () => void
  onNavigate: (to: string) => void
  threadRef: React.RefObject<HTMLDivElement | null>
}) {
  return (
    <div ref={threadRef} className="h-full overflow-y-auto px-6 py-5">
      <ul className="space-y-5">
        {turns.map((t) => (
          <li key={t.id}>
            {t.role === 'user' ? (
              <UserBubble text={t.text} />
            ) : (
              <AssistantBubble
                turn={t}
                stage={stage}
                onChipClick={onChipClick}
                onClose={onClose}
              />
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] rounded-2xl rounded-br-md bg-foreground px-4 py-2.5 text-[14px] text-background">
        {text}
      </div>
    </div>
  )
}

function AssistantBubble({
  turn,
  stage,
  onChipClick,
  onClose,
}: {
  turn: ChatTurn
  stage: number
  onChipClick: (text: string) => void
  onClose: () => void
}) {
  return (
    <div className="flex gap-3">
      <span
        aria-hidden
        className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-foreground/[0.06] text-foreground/80"
      >
        <Sparkles className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        {turn.thinking ? (
          <ThinkingBubble stage={stage} />
        ) : (
          <ResultBubble response={turn.response!} onChipClick={onChipClick} onClose={onClose} />
        )}
      </div>
    </div>
  )
}

function ThinkingBubble({ stage }: { stage: number }) {
  return (
    <div className="max-w-[80%] rounded-2xl rounded-bl-md border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-2.5">
        <span className="relative flex h-5 w-5 flex-none items-center justify-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-indigo-400/40" />
          <span className="relative h-2 w-2 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.9)]" />
        </span>
        <AnimatePresence mode="wait">
          <motion.span
            key={stage}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="text-[13px] font-medium text-foreground/90"
          >
            {STAGES[stage]}
          </motion.span>
        </AnimatePresence>
      </div>
      <div className="relative mb-3 h-1 overflow-hidden rounded-full bg-foreground/[0.06]">
        <motion.div
          className="absolute inset-y-0 w-1/3 rounded-full bg-gradient-to-r from-transparent via-indigo-400 to-transparent"
          animate={{ x: ['-110%', '320%'] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        {[72, 92, 58].map((w, i) => (
          <div
            key={i}
            className="relative h-2 overflow-hidden rounded-full bg-foreground/[0.05]"
            style={{ width: `${w}%` }}
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-foreground/15 to-transparent"
              animate={{ x: ['-100%', '200%'] }}
              transition={{
                duration: 1.6,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: i * 0.18,
              }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

function ResultBubble({
  response,
  onChipClick,
  onClose,
}: {
  response: AssistantResponse
  onChipClick: (text: string) => void
  onClose: () => void
}) {
  return (
    <div className="max-w-full rounded-2xl rounded-bl-md border border-border bg-card p-4">
      <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-foreground/[0.04] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        intent · {response.intent.replace('.', ' · ')}
      </div>
      <Blocks blocks={response.blocks} onChipClick={onChipClick} onClose={onClose} />
    </div>
  )
}

const Composer = function Composer({
  ref,
  value,
  onChange,
  onSubmit,
}: {
  ref: React.RefObject<HTMLTextAreaElement | null>
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
}) {
  return (
    <footer className="border-t border-border bg-background/40 p-4">
      <div className="flex items-end gap-2 rounded-2xl border border-border bg-card px-3 py-2.5">
        <Sparkles className="mt-1 h-4 w-4 flex-none text-foreground/70" />
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              onSubmit()
            }
          }}
          placeholder="Ne arıyorsun? Örn: 'Ayvalık zeytinlik 6M altı' veya 'Sıcak müşteriler kim?'"
          rows={1}
          className="max-h-32 min-h-[24px] flex-1 resize-none border-0 bg-transparent text-[14px] leading-snug outline-none placeholder:text-[hsl(var(--placeholder))]"
        />
        <kbd className="hidden h-6 items-center gap-1 rounded-md border border-border/70 bg-background/60 px-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground sm:inline-flex">
          ⌘K
        </kbd>
        <button
          type="button"
          onClick={onSubmit}
          disabled={!value.trim()}
          aria-label="Gönder"
          className={cn(
            'flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-foreground text-background transition-opacity',
            value.trim() ? 'hover:opacity-90' : 'opacity-40',
          )}
        >
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
      <p className="mt-1.5 px-2 font-mono text-[10px] text-muted-foreground">
        Enter → Sor · Shift+Enter → Yeni satır · Esc → Kapat
      </p>
    </footer>
  )
}
