import type { AlertaOperativa } from '@/lib/proof/types'
import { relativeDayTiming } from '@/lib/proof/format'
import type { OwnerLotRow } from '@/lib/supabase/winemaker-owner-home'

const TEMP_MIN = 15
const TEMP_MAX = 17
const STALE_DAYS = 3
const EVENT_WINDOW_DAYS = 7

export type OwnerLotEventRow = {
  id: string
  lot_id: string | null
  event_type: string
  payload: unknown
  occurred_at: string
}

export type OwnerAlertDescriptor =
  | {
      kind: 'temp'
      id: string
      lotId: string
      lotCode: string
      temp: number
    }
  | {
      kind: 'stale'
      id: string
      lotId: string
      lotCode: string
      daysSince: number
      hasLastEvent: boolean
    }

function parseTemp(payload: unknown): number | null {
  if (!payload || typeof payload !== 'object') return null
  const temp = (payload as Record<string, unknown>).temp_c
  if (typeof temp === 'number' && Number.isFinite(temp)) return temp
  if (typeof temp === 'string') {
    const n = parseFloat(temp)
    return Number.isFinite(n) ? n : null
  }
  return null
}

/** Alertas operativas del owner home — datos puros, sin copy de UI. */
export function buildOwnerAlertDescriptors(
  lots: OwnerLotRow[],
  events: OwnerLotEventRow[]
): OwnerAlertDescriptor[] {
  const alerts: OwnerAlertDescriptor[] = []
  const lotById = new Map(lots.map(l => [l.id, l]))
  const now = Date.now()
  const windowStart = now - EVENT_WINDOW_DAYS * 24 * 60 * 60 * 1000

  for (const ev of events) {
    if (ev.event_type !== 'FERMENTATION_MONITORING' || !ev.lot_id) continue
    if (new Date(ev.occurred_at).getTime() < windowStart) continue
    const temp = parseTemp(ev.payload)
    if (temp == null || (temp >= TEMP_MIN && temp <= TEMP_MAX)) continue
    const lot = lotById.get(ev.lot_id)
    if (!lot) continue
    alerts.push({
      kind: 'temp',
      id: `temp-${ev.id}`,
      lotId: lot.id,
      lotCode: lot.code,
      temp,
    })
  }

  const lastEventByLot = new Map<string, string>()
  for (const ev of events) {
    if (!ev.lot_id) continue
    const prev = lastEventByLot.get(ev.lot_id)
    if (!prev || ev.occurred_at > prev) lastEventByLot.set(ev.lot_id, ev.occurred_at)
  }

  for (const lot of lots) {
    const last = lastEventByLot.get(lot.id)
    const reference = last ? new Date(last).getTime() : new Date(lot.created_at).getTime()
    const timing = relativeDayTiming(reference, now)
    if (timing.kind !== 'past' || timing.days <= STALE_DAYS) continue
    alerts.push({
      kind: 'stale',
      id: `stale-${lot.id}`,
      lotId: lot.id,
      lotCode: lot.code,
      daysSince: timing.days,
      hasLastEvent: Boolean(last),
    })
  }

  return alerts
}

export type WinemakerAlertCopy = {
  tempTitle: (p: { code: string }) => string
  tempSubtext: (p: { temp: number; min: number; max: number }) => string
  staleTitle: (p: { code: string; days: number }) => string
  staleSubtextWithEvent: (p: { days: number }) => string
  staleSubtextNoEvent: () => string
  viewLot: () => string
}

export function mapOwnerAlertsToOperativas(
  descriptors: OwnerAlertDescriptor[],
  copy: WinemakerAlertCopy
): AlertaOperativa[] {
  return descriptors.map(desc => {
    if (desc.kind === 'temp') {
      return {
        id: desc.id,
        nivel: 'P1',
        condicion: 'quiebre_inminente',
        titulo: copy.tempTitle({ code: desc.lotCode }),
        subtexto: copy.tempSubtext({ temp: desc.temp, min: TEMP_MIN, max: TEMP_MAX }),
        color: 'rojo',
        acciones: [{ label: copy.viewLot(), href: `/dashboard/winemaker/lotes/${desc.lotId}` }],
      }
    }

    return {
      id: desc.id,
      nivel: 'P2',
      condicion: 'sku_sin_rotar',
      titulo: copy.staleTitle({ code: desc.lotCode, days: desc.daysSince }),
      subtexto: desc.hasLastEvent
        ? copy.staleSubtextWithEvent({ days: desc.daysSince })
        : copy.staleSubtextNoEvent(),
      color: 'amarillo',
      acciones: [{ label: copy.viewLot(), href: `/dashboard/winemaker/lotes/${desc.lotId}` }],
    }
  })
}
