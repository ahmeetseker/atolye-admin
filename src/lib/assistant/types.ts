export type IntentName =
  | 'listing.search'
  | 'customer.search'
  | 'transaction.summary'
  | 'event.list'
  | 'team.performance'
  | 'region.overview'
  | 'greeting'
  | 'unknown'

export type CustomerSegment = 'Sıcak' | 'Ilık' | 'Soğuk'

export interface ExtractedParams {
  location?: string
  priceMax?: number
  priceMin?: number
  areaMin?: number
  type?: string
  segment?: CustomerSegment
  stage?: string
  ids?: string[]
}

export type AssistantBlock =
  | { kind: 'text'; text: string }
  | { kind: 'listings'; ids: string[]; title?: string }
  | { kind: 'customers'; ids: string[]; title?: string }
  | { kind: 'transactions'; ids: string[]; title?: string }
  | { kind: 'stat'; label: string; value: string; delta?: { tone: 'positive' | 'neutral' | 'negative'; text: string } }
  | { kind: 'chart'; title: string; data: Array<{ label: string; value: number; suffix?: string }> }
  | { kind: 'suggest'; chips: string[] }
  | { kind: 'command'; commands: Array<{ label: string; href: string }> }

export interface AssistantResponse {
  intent: IntentName
  text: string
  blocks: AssistantBlock[]
}

export interface ChatTurn {
  id: string
  role: 'user' | 'assistant'
  text: string
  response?: AssistantResponse
  thinking?: boolean
  createdAt: string
}

// Legacy — header'daki nav-içi mini AI search hala bunu kullanıyor.
// Yeni kod AssistantResponse + AssistantBlock kullanır.
export interface AiChartData {
  title: string
  data: Array<{ label: string; value: number; suffix?: string }>
}

export interface AiAnswer {
  text: string
  chart?: AiChartData
}

// ─────────────────────────────────────────────
// Cross-entity command palette search (Faz 8.12)
// ─────────────────────────────────────────────

export type EntityType = 'listing' | 'customer' | 'deal' | 'event'

export interface SearchResult {
  type: EntityType
  id: string
  label: string
  sublabel: string
  href: string
  score: number
}

export interface SearchDoc {
  type: EntityType
  id: string
  label: string
  sublabel: string
  href: string
  /** Lower-cased TR-locale tokens of label/name (3x boost). */
  titleTokens: string[]
  /** Lower-cased tokens of secondary fields (tags, city, district, owner) — 1.5x boost. */
  tagTokens: string[]
  /** All searchable text lower-cased + joined (fallback substring match, 1x). */
  haystack: string
  /** Original id, lower-cased (for prefix boost 5x). */
  idLower: string
}

export interface SearchIndex {
  docs: SearchDoc[]
  builtAt: number
}

export interface SearchOptions {
  entities?: EntityType[]
  limit?: number
}
