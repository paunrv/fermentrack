import { LOT_ETAPA_VALUES, type LotEtapa } from '@/lib/proof/lot-etapa'
import { relativeDayTiming, type RelativeDayTiming } from '@/lib/proof/format'
import { lotEligibleForBottling } from '@/lib/proof/record-lot-bottling'
import type { OwnerLotEventRow } from '@/lib/proof/winemaker-owner-alerts'
import type { OwnerLotRow } from '@/lib/supabase/winemaker-owner-home'

/** Pipeline card shows stale state after this many days without a record (Epic A acceptance). */
export const PIPELINE_STALE_DAYS = 5

/** Internal column scroll when a stage has more lots than this. */
export const PIPELINE_LOTS_PER_COLUMN_SCROLL = 6

/** Collapse full cards to chips when total active lots exceed this (QA may tune). */
export const PIPELINE_COLLAPSE_TOTAL_LOTS = 15

const TEMP_MIN = 15
const TEMP_MAX = 17
const TEMP_EVENT_WINDOW_DAYS = 7

export type PipelineAttentionReason = 'stale' | 'temp' | 'bottling'

export type PipelineLot = {
  id: string
  code: string
  etapa: LotEtapa
  varietal: string | null
  container: string | null
  lastMeasurement: string | null
  /** Days since last record (past only); 0 for today or future. */
  daysSinceLastRecord: number
  recordTiming: RelativeDayTiming
  needsAttention: boolean
  attentionReasons: PipelineAttentionReason[]
  bottlingPending: boolean
}

export type PipelineColumnTone = 'neutral' | 'accent' | 'danger'

export type PipelineColumn = {
  etapa: LotEtapa
  lots: PipelineLot[]
  tone: PipelineColumnTone
}

function payloadRecord(payload: unknown): Record<string, unknown> | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null
  return payload as Record<string, unknown>
}

function readString(payload: unknown, key: string): string | null {
  const value = payloadRecord(payload)?.[key]
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function readNumber(payload: unknown, key: string): number | null {
  const value = payloadRecord(payload)?.[key]
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const n = parseFloat(value)
    return Number.isFinite(n) ? n : null
  }
  return null
}

export function formatLastMeasurement(payload: unknown): string | null {
  const parts: string[] = []
  const temp = readNumber(payload, 'temp_c')
  const brix = readNumber(payload, 'brix')

  if (temp != null) parts.push(`${temp}°C`)
  if (brix != null) parts.push(`${brix}°Bx`)

  return parts.length > 0 ? parts.join(' · ') : null
}

function isTempOutOfRange(temp: number, now: number, occurredAt: string): boolean {
  const windowStart = now - TEMP_EVENT_WINDOW_DAYS * 24 * 60 * 60 * 1000
  if (new Date(occurredAt).getTime() < windowStart) return false
  return temp < TEMP_MIN || temp > TEMP_MAX
}

export function buildPipelineLots(
  lots: OwnerLotRow[],
  events: OwnerLotEventRow[],
  now = Date.now(),
  existenciaLotIds: ReadonlySet<string> = new Set()
): PipelineLot[] {
  const eventsByLot = new Map<string, OwnerLotEventRow[]>()

  for (const event of events) {
    if (!event.lot_id) continue
    const list = eventsByLot.get(event.lot_id) ?? []
    list.push(event)
    eventsByLot.set(event.lot_id, list)
  }

  for (const list of eventsByLot.values()) {
    list.sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))
  }

  return lots.map(lot => {
    const lotEvents = eventsByLot.get(lot.id) ?? []
    const lastEvent = lotEvents[0]
    const referenceMs = lastEvent
      ? new Date(lastEvent.occurred_at).getTime()
      : new Date(lot.created_at).getTime()
    const recordTiming = relativeDayTiming(referenceMs, now)
    const daysSinceLastRecord = recordTiming.kind === 'past' ? recordTiming.days : 0

    let container: string | null = null
    let lastMeasurement: string | null = null

    for (const event of lotEvents) {
      if (!container) container = readString(event.payload, 'vessel_note')
      if (!lastMeasurement) {
        const measurement = formatLastMeasurement(event.payload)
        if (measurement) lastMeasurement = measurement
      }
      if (container && lastMeasurement) break
    }

    const attentionReasons: PipelineAttentionReason[] = []

    if (recordTiming.kind === 'past' && daysSinceLastRecord > PIPELINE_STALE_DAYS) {
      attentionReasons.push('stale')
    }

    for (const event of lotEvents) {
      if (event.event_type !== 'FERMENTATION_MONITORING') continue
      const temp = readNumber(event.payload, 'temp_c')
      if (temp == null) continue
      if (isTempOutOfRange(temp, now, event.occurred_at)) {
        attentionReasons.push('temp')
        break
      }
    }

    const bottlingPending =
      lotEligibleForBottling(lot.etapa) && !existenciaLotIds.has(lot.id)

    if (bottlingPending) {
      attentionReasons.push('bottling')
    }

    return {
      id: lot.id,
      code: lot.code,
      etapa: lot.etapa,
      varietal: lot.varietal,
      container,
      lastMeasurement,
      daysSinceLastRecord,
      recordTiming,
      needsAttention: attentionReasons.length > 0,
      attentionReasons,
      bottlingPending,
    }
  })
}

export function columnTone(lots: PipelineLot[]): PipelineColumnTone {
  if (lots.length === 0) return 'neutral'
  if (lots.some(lot => lot.needsAttention)) return 'danger'
  return 'accent'
}

export function groupPipelineByEtapa(lots: PipelineLot[]): PipelineColumn[] {
  const byEtapa = new Map<LotEtapa, PipelineLot[]>()
  for (const etapa of LOT_ETAPA_VALUES) {
    byEtapa.set(etapa, [])
  }
  for (const lot of lots) {
    byEtapa.get(lot.etapa)?.push(lot)
  }

  return LOT_ETAPA_VALUES.map(etapa => {
    const columnLots = byEtapa.get(etapa) ?? []
    columnLots.sort((a, b) => a.code.localeCompare(b.code))
    return {
      etapa,
      lots: columnLots,
      tone: columnTone(columnLots),
    }
  })
}

export function shouldCollapsePipelineCards(totalLots: number): boolean {
  return totalLots > PIPELINE_COLLAPSE_TOTAL_LOTS
}
