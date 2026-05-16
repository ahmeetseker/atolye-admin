import { LISTINGS } from '@landx/data'
import { CUSTOMERS } from '@landx/data'
import { TRANSACTIONS } from '@landx/data'
import { EVENTS } from '@landx/data'
import { TEAM_PERFORMANCE, REGION_RANKING } from '@landx/data'
import type {
  AssistantBlock,
  AssistantResponse,
  CustomerSegment,
  ExtractedParams,
  IntentName,
} from './types'
import { extractNavCommands } from './commands'

const DIACRITICS_MAP: Record<string, string> = {
  ı: 'i',
  İ: 'i',
  ş: 's',
  Ş: 's',
  ğ: 'g',
  Ğ: 'g',
  ü: 'u',
  Ü: 'u',
  ö: 'o',
  Ö: 'o',
  ç: 'c',
  Ç: 'c',
}

export function normalize(input: string): string {
  return input
    .split('')
    .map((c) => DIACRITICS_MAP[c] ?? c)
    .join('')
    .toLowerCase()
    .trim()
}

const LOCATIONS = [
  'ayvalik',
  'cunda',
  'datca',
  'urla',
  'cesme',
  'alacati',
  'marmaris',
  'bozburun',
  'akcay',
  'soke',
  'fethiye',
  'havran',
  'kucukkoy',
  'sarimsakli',
  'canakkale',
] as const

const TYPES = ['imarli', 'tarla', 'zeytinlik', 'villa'] as const

function pick<T extends string>(text: string, list: readonly T[]): T | undefined {
  for (const k of list) if (text.includes(k)) return k
}

function extractPriceMax(text: string): number | undefined {
  const m = text.match(/(\d+(?:[.,]\d+)?)\s*m\s*alt[ıi]/i)
  if (!m) return undefined
  const v = parseFloat(m[1].replace(',', '.'))
  return v * 1_000_000
}

function extractAreaMin(text: string): number | undefined {
  const m = text.match(/(\d+(?:[.,]?\d+)?)\s*(?:m2|m²|metre)\s*(?:ust[uü]|[uü]zeri|fazla)/i)
  if (!m) return undefined
  return parseFloat(m[1].replace('.', '').replace(',', '.'))
}

function extractSegment(text: string): CustomerSegment | undefined {
  if (/\bsicak\b|\bhot\b/.test(text)) return 'Sıcak'
  if (/\bilik\b|\bilk\b/.test(text)) return 'Ilık'
  if (/\bsoguk\b/.test(text)) return 'Soğuk'
}

function extractStage(text: string): string | undefined {
  if (/\bkaparo\b/.test(text)) return 'Kaparo'
  if (/\btapu\b/.test(text)) return 'Tapu'
  if (/\bteklif\b/.test(text)) return 'Teklif'
  if (/\bgorusme\b|\bg[oö]r[uü][sş]me\b/.test(text)) return 'Görüşme'
}

function extractParams(norm: string): ExtractedParams {
  return {
    location: pick(norm, LOCATIONS),
    type: pick(norm, TYPES),
    priceMax: extractPriceMax(norm),
    areaMin: extractAreaMin(norm),
    segment: extractSegment(norm),
    stage: extractStage(norm),
  }
}

interface IntentDef {
  name: IntentName
  keywords: string[]
  handle: (params: ExtractedParams, query: string) => AssistantResponse
}

const INTENTS: IntentDef[] = [
  {
    name: 'greeting',
    keywords: ['merhaba', 'selam', 'hello', 'hey'],
    handle: () => ({
      intent: 'greeting',
      text: 'Merhaba! Ne aramamı istersin?',
      blocks: [
        suggestBlock([
          'Sıcak müşteriler',
          'Ayvalık zeytinlik 6.1M altı',
          'Bekleyen tahsilat',
          'Ekip karnesi',
        ]),
      ],
    }),
  },
  {
    name: 'listing.search',
    keywords: ['ilan', 'arsa', 'parsel', 'tarla', 'zeytinlik', 'villa', 'imarli'],
    handle: (params, _query) => {
      const matched = LISTINGS.filter((l) => {
        const norm = normalize(`${l.title} ${l.district} ${l.tags.join(' ')} ${l.type}`)
        if (params.location && !norm.includes(params.location)) return false
        if (params.type && !norm.includes(params.type)) return false
        if (params.priceMax !== undefined && l.price > params.priceMax) return false
        if (params.areaMin !== undefined && l.size < params.areaMin) return false
        return true
      })
      const top = matched.slice(0, 4)
      const summary = matched.length === 0
        ? `${params.location ?? 'belirtilen bölge'} için kriterlerine uyan ilan bulamadım. Filtreyi gevşetmeyi dener misin?`
        : `${matched.length} ilan eşleşti. En öne çıkan ${top.length} tanesi:`
      const blocks: AssistantBlock[] = [{ kind: 'text', text: summary }]
      if (top.length > 0) {
        blocks.push({
          kind: 'listings',
          ids: top.map((l) => l.id),
          title: 'Eşleşen ilanlar',
        })
        const totalValue = matched.reduce((s, l) => s + l.price, 0)
        const totalArea = matched.reduce((s, l) => s + l.size, 0)
        const avgPrice = totalArea > 0 ? totalValue / totalArea : 0
        blocks.push({
          kind: 'stat',
          label: 'Ortalama m² fiyatı',
          value: `₺ ${Math.round(avgPrice).toLocaleString('tr-TR')}`,
        })
      } else {
        blocks.push(
          suggestBlock([
            'Ayvalık zeytinlik',
            'Datça villa imarlı',
            'Çeşme · Alaçatı',
            'Marmaris koy önü',
          ]),
        )
      }
      return { intent: 'listing.search', text: summary, blocks }
    },
  },
  {
    name: 'customer.search',
    keywords: ['musteri', 'aday', 'sicak', 'ilik', 'soguk', 'gorusme'],
    handle: (params) => {
      const matched = CUSTOMERS.filter((c) => {
        if (params.segment && c.segment !== params.segment) return false
        if (params.stage && c.stage !== params.stage) return false
        return true
      })
      const top = matched.slice(0, 5)
      const segLabel = params.segment ?? 'tüm segmentlerde'
      const stageLabel = params.stage ? ` · ${params.stage} aşamasında` : ''
      const summary =
        matched.length === 0
          ? `${segLabel}${stageLabel} müşteri yok.`
          : `${matched.length} müşteri (${segLabel}${stageLabel}). En öncelikli ${top.length}:`
      const blocks: AssistantBlock[] = [{ kind: 'text', text: summary }]
      if (top.length > 0) {
        blocks.push({
          kind: 'customers',
          ids: top.map((c) => c.id),
          title: 'Müşteri listesi',
        })
        const totalValue = matched.reduce((s, c) => s + c.value, 0)
        if (totalValue > 0) {
          blocks.push({
            kind: 'stat',
            label: 'Potansiyel ciro',
            value: `₺ ${(totalValue / 1_000_000).toFixed(1)}M`,
          })
        }
      }
      return { intent: 'customer.search', text: summary, blocks }
    },
  },
  {
    name: 'transaction.summary',
    keywords: ['tahsilat', 'odeme', 'finans', 'komisyon', 'fatura', 'gider', 'bekleyen', 'gecikmis'],
    handle: (_params, query) => {
      const norm = normalize(query)
      const focusPending = /\bbeklen|\bgecik/.test(norm)
      const txns = focusPending
        ? TRANSACTIONS.filter((t) => t.type === 'Tahsilat' && t.status !== 'Tamamlandı')
        : TRANSACTIONS
      const total = txns.reduce((s, t) => s + t.amount, 0)
      const summary = focusPending
        ? `Bekleyen tahsilat: ${txns.length} işlem, toplam ₺ ${(total / 1_000_000).toFixed(1)}M.`
        : `Son ${txns.length} işlem listede.`
      const blocks: AssistantBlock[] = [
        { kind: 'text', text: summary },
        {
          kind: 'transactions',
          ids: txns.slice(0, 6).map((t) => t.id),
          title: focusPending ? 'Bekleyen ödemeler' : 'Son işlemler',
        },
      ]
      if (focusPending && txns.length > 0) {
        const buckets = {
          fresh: txns.filter((t) => (t.daysOverdue ?? 0) < 7).length,
          mid: txns.filter((t) => {
            const d = t.daysOverdue ?? 0
            return d >= 7 && d < 30
          }).length,
          aged: txns.filter((t) => (t.daysOverdue ?? 0) >= 30).length,
        }
        blocks.push({
          kind: 'chart',
          title: 'Yaşa göre bekleyen tahsilat',
          data: [
            { label: '< 7 gün', value: buckets.fresh },
            { label: '7-30', value: buckets.mid },
            { label: '30+', value: buckets.aged },
          ],
        })
      }
      return { intent: 'transaction.summary', text: summary, blocks }
    },
  },
  {
    name: 'event.list',
    keywords: ['takvim', 'randevu', 'ziyaret', 'gosterim', 'tapu', 'gorev'],
    handle: () => {
      const now = Date.now()
      const upcoming = EVENTS.filter((e) => new Date(e.date).getTime() >= now)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 5)
      const summary = `Önümüzdeki ${upcoming.length} etkinlik var.`
      const blocks: AssistantBlock[] = [
        { kind: 'text', text: summary },
        ...upcoming.slice(0, 3).map((e) => ({
          kind: 'stat' as const,
          label: e.time ? `${new Date(e.date).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })} · ${e.time}` : new Date(e.date).toLocaleDateString('tr-TR'),
          value: e.title,
          delta: { tone: 'neutral' as const, text: e.owner },
        })),
      ]
      return { intent: 'event.list', text: summary, blocks }
    },
  },
  {
    name: 'team.performance',
    keywords: ['ekip', 'performans', 'karne', 'satis', 'ciro'],
    handle: () => {
      const top = [...TEAM_PERFORMANCE].sort((a, b) => b.revenue - a.revenue)[0]
      const totalRevenue = TEAM_PERFORMANCE.reduce((s, r) => s + r.revenue, 0)
      const totalClosed = TEAM_PERFORMANCE.reduce((s, r) => s + r.closed, 0)
      const summary = `Ekip bu ay ₺ ${(totalRevenue / 1_000_000).toFixed(1)}M ciro yaptı, ${totalClosed} satış kapandı. En yüksek ${top.owner} (${top.closed} satış).`
      return {
        intent: 'team.performance',
        text: summary,
        blocks: [
          { kind: 'text', text: summary },
          {
            kind: 'chart',
            title: 'Ekip ciro karşılaştırması',
            data: TEAM_PERFORMANCE.map((r) => ({
              label: r.owner,
              value: Math.round(r.revenue / 100_000) / 10,
              suffix: 'M',
            })),
          },
        ],
      }
    },
  },
  {
    name: 'region.overview',
    keywords: ['bolge', 'sehir', 'ilce', 'sahip'],
    handle: (params) => {
      const sorted = [...REGION_RANKING].sort((a, b) => b.listings - a.listings)
      const focused = params.location
        ? sorted.find((r) => normalize(r.district).includes(params.location!))
        : undefined
      if (focused) {
        return {
          intent: 'region.overview',
          text: `${focused.district} bölgesinde ${focused.listings} ilan, ${focused.activeBuyers} aktif alıcı.`,
          blocks: [
            {
              kind: 'text',
              text: `${focused.district} (${focused.city}): ${focused.listings} ilan, ${focused.activeBuyers} aktif alıcı. m² fiyatı ortalama ₺ ${focused.avgPricePerSqm.toLocaleString('tr-TR')}.`,
            },
            {
              kind: 'chart',
              title: 'Haftalık trend',
              data: focused.weeklyTrend.map((v, i) => ({
                label: ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'][i],
                value: v,
              })),
            },
          ],
        }
      }
      const top3 = sorted.slice(0, 3)
      return {
        intent: 'region.overview',
        text: `En yoğun 3 bölge: ${top3.map((r) => r.district).join(', ')}.`,
        blocks: [
          {
            kind: 'text',
            text: `En yoğun bölgeler ${top3.map((r) => r.district).join(', ')} — toplam ${top3.reduce((s, r) => s + r.listings, 0)} ilan.`,
          },
          {
            kind: 'chart',
            title: 'Bölgesel ilan yoğunluğu',
            data: sorted.map((r) => ({ label: r.district.split('·')[1]?.trim() ?? r.district, value: r.listings })),
          },
        ],
      }
    },
  },
  {
    name: 'unknown',
    keywords: [],
    handle: () => ({
      intent: 'unknown',
      text: 'Bu soruyu nasıl yanıtlayacağımı tam anlamadım. Aşağıdaki örneklerden birini deneyebilir misin?',
      blocks: [
        { kind: 'text', text: 'Bu soruyu nasıl yanıtlayacağımı tam anlamadım. Aşağıdaki örneklerden birini deneyebilir misin?' },
        suggestBlock([
          'Sıcak müşteriler kim?',
          'Ayvalık zeytinlik 6M altı',
          'Bekleyen tahsilat 30 gün üstü',
          'Bu hafta tapu randevuları',
        ]),
      ],
    }),
  },
]

function suggestBlock(chips: string[]): AssistantBlock {
  return { kind: 'suggest', chips }
}

export function classify(input: string): AssistantResponse {
  const norm = normalize(input)
  if (!norm) return INTENTS[INTENTS.length - 1].handle({}, input)

  const params = extractParams(norm)

  const scored = INTENTS.map((intent) => {
    let score = 0
    for (const kw of intent.keywords) if (norm.includes(kw)) score += 1
    if (intent.name === 'listing.search' && (params.location || params.type || params.priceMax || params.areaMin)) score += 2
    if (intent.name === 'customer.search' && (params.segment || params.stage)) score += 2
    if (intent.name === 'region.overview' && params.location && !params.type) score += 1
    return { intent, score }
  })
  scored.sort((a, b) => b.score - a.score)
  const best = scored[0]
  const response =
    best.score < 1
      ? INTENTS[INTENTS.length - 1].handle(params, input)
      : best.intent.handle(params, input)

  const navCommands = extractNavCommands(input)
  if (navCommands.length > 0) {
    const commandBlock: AssistantBlock = { kind: 'command', commands: navCommands }
    return { ...response, blocks: [commandBlock, ...response.blocks] }
  }
  return response
}

export const STAGES = [
  'Sorgun anlaşılıyor…',
  'Portföy verisi taranıyor…',
  'Sonuç hazırlanıyor…',
] as const
