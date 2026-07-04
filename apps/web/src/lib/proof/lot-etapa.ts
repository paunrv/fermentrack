import type { SupabaseClient } from '@supabase/supabase-js'
import { assertPlanLimit, PlanLimitError } from '@/lib/proof/plan-limits'

/** Pipeline stages for winemaker desktop home (Epic A). */
export const LOT_ETAPA_VALUES = [
  'cosecha',
  'analisis',
  'fermentacion',
  'malolactica',
  'crianza',
  'embotellado',
] as const

export type LotEtapa = (typeof LOT_ETAPA_VALUES)[number]

export const LOT_ETAPA_RANK: Record<LotEtapa, number> = {
  cosecha: 1,
  analisis: 2,
  fermentacion: 3,
  malolactica: 4,
  crianza: 5,
  embotellado: 6,
}

/** Legacy `lots.current_stage` (English) — kept for mobile until pipeline UI ships. */
export const CURRENT_STAGE_TO_ETAPA: Record<string, LotEtapa> = {
  harvest: 'cosecha',
  fermentation: 'fermentacion',
  malolactic: 'malolactica',
  aging: 'crianza',
  bottling: 'embotellado',
  bottled: 'embotellado',
}

export function isLotEtapa(value: string): value is LotEtapa {
  return (LOT_ETAPA_VALUES as readonly string[]).includes(value)
}

export function etapaFromCurrentStage(stage: string | null | undefined): LotEtapa {
  if (!stage) return 'cosecha'
  return CURRENT_STAGE_TO_ETAPA[stage] ?? 'cosecha'
}

export type RecordLotStageChangeParams = {
  organizationId: string
  lotId: string
  fromEtapa: LotEtapa
  toEtapa: LotEtapa
  occurredAt?: string
  actorId?: string | null
  note?: string | null
}

export class RecordLotStageChangeError extends Error {
  constructor(public readonly code: string) {
    super(code)
    this.name = 'RecordLotStageChangeError'
  }
}

/** Append-only stage change — sets `lots.etapa` via STAGE_CHANGED trigger. */
export async function recordLotStageChange(
  sb: SupabaseClient,
  params: RecordLotStageChangeParams
): Promise<void> {
  const { organizationId, lotId, fromEtapa, toEtapa, occurredAt, actorId, note } = params

  try {
    await assertPlanLimit(sb, organizationId, 'memoria')
  } catch (err) {
    if (err instanceof PlanLimitError) throw new RecordLotStageChangeError(err.code)
    throw err
  }

  const payload: Record<string, string> = {
    from_etapa: fromEtapa,
    to_etapa: toEtapa,
  }
  if (note?.trim()) payload.note = note.trim()

  const { error } = await sb.from('events').insert({
    organization_id: organizationId,
    lot_id: lotId,
    event_type: 'STAGE_CHANGED',
    payload,
    occurred_at: occurredAt ?? new Date().toISOString(),
    actor_id: actorId ?? null,
  })

  if (error) throw error
}
