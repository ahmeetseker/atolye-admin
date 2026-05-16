/**
 * Wave F19.0 — Deterministic lead scoring for the CRM views.
 *
 * Computes a 0-100 score from explicit signals on the Customer record:
 * segment, stage, recency of last contact, deal value, and presence of
 * contact channels. Three reason strings explain the score to the user
 * (shown in the timeline panel + on hover).
 *
 * No backend signals (page-view tracking, email opens) — those land when
 * the real CRM backend ships.
 */

import type { Customer } from '@landx/data'

export type LeadTier = 'hot' | 'warm' | 'cold'

export interface LeadScore {
  score: number
  tier: LeadTier
  reasons: string[]
}

const HOT_THRESHOLD = 60
const WARM_THRESHOLD = 35

const SEGMENT_WEIGHT: Record<Customer['segment'], number> = {
  Sıcak: 40,
  Ilık: 25,
  Soğuk: 10,
}

const STAGE_WEIGHT: Record<Customer['stage'], number> = {
  'İlk temas': 5,
  Görüşme: 15,
  Teklif: 22,
  Kaparo: 25,
  Tapu: 18,
}

const RECENCY_BUCKETS: ReadonlyArray<{ days: number; weight: number; label: string }> = [
  { days: 7, weight: 20, label: 'son 7 gün içinde temas' },
  { days: 30, weight: 12, label: 'son 30 gün içinde temas' },
  { days: 90, weight: 4, label: 'son 90 gün içinde temas' },
]

const VALUE_BUCKETS: ReadonlyArray<{ min: number; weight: number; label: string }> = [
  { min: 5_000_000, weight: 20, label: '5M TL üzeri deal değeri' },
  { min: 2_000_000, weight: 12, label: '2M TL üzeri deal değeri' },
  { min: 500_000, weight: 5, label: '500K TL üzeri deal değeri' },
]

function daysSince(iso: string, now = Date.now()): number {
  const ts = Date.parse(iso)
  if (Number.isNaN(ts)) return Number.POSITIVE_INFINITY
  return Math.max(0, Math.floor((now - ts) / 86_400_000))
}

export function calculateLeadScore(customer: Customer, now = Date.now()): LeadScore {
  const reasons: string[] = []
  let score = 0

  const segWeight = SEGMENT_WEIGHT[customer.segment] ?? 0
  if (segWeight > 0) {
    score += segWeight
    reasons.push(`${customer.segment} segment (+${segWeight})`)
  }

  const stageWeight = STAGE_WEIGHT[customer.stage]
  if (stageWeight > 0) {
    score += stageWeight
    reasons.push(`${customer.stage} aşama (+${stageWeight})`)
  }

  const days = daysSince(customer.lastContact, now)
  for (const bucket of RECENCY_BUCKETS) {
    if (days <= bucket.days) {
      score += bucket.weight
      reasons.push(`${bucket.label} (+${bucket.weight})`)
      break
    }
  }

  for (const bucket of VALUE_BUCKETS) {
    if (customer.value >= bucket.min) {
      score += bucket.weight
      reasons.push(`${bucket.label} (+${bucket.weight})`)
      break
    }
  }

  if (customer.phone && customer.email) {
    score += 5
    reasons.push('Telefon + e-posta mevcut (+5)')
  } else if (customer.phone || customer.email) {
    score += 2
    reasons.push('Tek iletişim kanalı mevcut (+2)')
  }

  score = Math.max(0, Math.min(100, score))

  const tier: LeadTier =
    score >= HOT_THRESHOLD ? 'hot' : score >= WARM_THRESHOLD ? 'warm' : 'cold'

  return { score, tier, reasons }
}

export function tierLabel(tier: LeadTier): string {
  return tier === 'hot' ? 'Sıcak' : tier === 'warm' ? 'Ilık' : 'Soğuk'
}

/**
 * Token-aligned visual hint per tier. Used by the badge component; consumers
 * can override but the recommendation is to stick to these for consistency.
 */
export function tierBadgeClass(tier: LeadTier): string {
  if (tier === 'hot') return 'bg-rose-500/10 text-rose-700 border-rose-500/20'
  if (tier === 'warm') return 'bg-amber-500/10 text-amber-700 border-amber-500/20'
  return 'bg-stone-500/10 text-muted-foreground border-border'
}
