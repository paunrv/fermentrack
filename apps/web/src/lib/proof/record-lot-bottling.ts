import type { SupabaseClient } from '@supabase/supabase-js'
import {
  WM_BOTELLAS_POR_CAJA_VALUES,
  type WmBotellasPorCaja,
  type WmExistenciaRow,
} from '@/lib/proof/finished-goods-types'
import { LOT_ETAPA_RANK, type LotEtapa } from '@/lib/proof/lot-etapa'
import { assertPlanLimit, PlanLimitError } from '@/lib/proof/plan-limits'

export const WM_FORMATO_PRESETS = ['750ml', '375ml', 'magnum', '1.5L'] as const

export type LotBottlingInput = {
  lotId: string
  etiquetaId?: string | null
  newEtiqueta?: {
    nombre: string
    varietal?: string | null
    region?: string | null
    tipo?: string | null
  } | null
  anada: number
  formato: string
  botellasPorCaja: WmBotellasPorCaja
  botellasProducidas: number
  occurredAt?: string
}

export type LotBottlingValidationCode =
  | 'missing_lot_id'
  | 'missing_etiqueta'
  | 'invalid_anada'
  | 'invalid_formato'
  | 'invalid_botellas_por_caja'
  | 'invalid_botellas_producidas'

export type RecordLotBottlingParams = LotBottlingInput & {
  organizationId: string
  actorUserId?: string | null
}

export type RecordLotBottlingResult = {
  existenciaId: string
  etiquetaId: string
  eventId: string
}

export type RecordLotBottlingErrorCode =
  | LotBottlingValidationCode
  | 'lot_not_found'
  | 'lot_not_active'
  | 'lot_stage_too_early'
  | 'lot_already_bottled'
  | 'invalid_etiqueta'
  | 'etiqueta_create_failed'
  | 'existencia_create_failed'
  | 'event_create_failed'
  | 'limit_reached_etiquetas'
  | 'limit_reached_memoria'

export class RecordLotBottlingError extends Error {
  constructor(public readonly code: RecordLotBottlingErrorCode) {
    super(code)
    this.name = 'RecordLotBottlingError'
  }
}

type LotBottlingRow = {
  id: string
  code: string
  status: string
  etapa: LotEtapa
  vintage: { year: number } | { year: number }[] | null
}

export function validateLotBottlingInput(
  input: Partial<LotBottlingInput>
):
  | { ok: true; value: LotBottlingInput }
  | { ok: false; code: LotBottlingValidationCode } {
  const lotId = input.lotId?.trim()
  if (!lotId) return { ok: false, code: 'missing_lot_id' }

  const hasEtiquetaId = Boolean(input.etiquetaId?.trim())
  const newNombre = input.newEtiqueta?.nombre?.trim()
  if (!hasEtiquetaId && !newNombre) return { ok: false, code: 'missing_etiqueta' }

  const anada = input.anada
  if (!Number.isInteger(anada) || anada < 1900 || anada > 2100) {
    return { ok: false, code: 'invalid_anada' }
  }

  const formato = input.formato?.trim()
  if (!formato) return { ok: false, code: 'invalid_formato' }

  if (
    input.botellasPorCaja == null ||
    !(WM_BOTELLAS_POR_CAJA_VALUES as readonly number[]).includes(input.botellasPorCaja)
  ) {
    return { ok: false, code: 'invalid_botellas_por_caja' }
  }

  const botellasProducidas = input.botellasProducidas
  if (!Number.isInteger(botellasProducidas) || botellasProducidas <= 0) {
    return { ok: false, code: 'invalid_botellas_producidas' }
  }

  return {
    ok: true,
    value: {
      lotId,
      etiquetaId: hasEtiquetaId ? input.etiquetaId!.trim() : null,
      newEtiqueta: newNombre
        ? {
            nombre: newNombre,
            varietal: input.newEtiqueta?.varietal?.trim() || null,
            region: input.newEtiqueta?.region?.trim() || null,
            tipo: input.newEtiqueta?.tipo?.trim() || null,
          }
        : null,
      anada,
      formato,
      botellasPorCaja: input.botellasPorCaja,
      botellasProducidas,
      occurredAt: input.occurredAt,
    },
  }
}

export function lotEligibleForBottling(etapa: LotEtapa): boolean {
  return LOT_ETAPA_RANK[etapa] >= LOT_ETAPA_RANK.crianza
}

export async function fetchExistenciaLotIds(
  sb: SupabaseClient,
  organizationId: string,
  lotIds: string[]
): Promise<Set<string>> {
  if (lotIds.length === 0) return new Set()

  const { data, error } = await sb
    .from('wm_existencias')
    .select('lote_id')
    .eq('organization_id', organizationId)
    .in('lote_id', lotIds)

  if (error) {
    const message = error.message?.toLowerCase() ?? ''
    if (error.code === '42P01' || message.includes('wm_existencias')) {
      return new Set()
    }
    throw error
  }

  return new Set((data ?? []).map(row => String(row.lote_id)))
}

export async function fetchLotBottlingContext(
  sb: SupabaseClient,
  organizationId: string,
  lotId: string
): Promise<{
  lot: {
    id: string
    code: string
    etapa: LotEtapa
    status: string
    defaultAnada: number | null
  }
  etiquetas: Array<{ id: string; nombre: string }>
  hasExistencia: boolean
  canRegister: boolean
}> {
  const { data: lot, error: lotError } = await sb
    .from('lots')
    .select('id, code, status, etapa, vintage:vintages(year)')
    .eq('id', lotId)
    .eq('organization_id', organizationId)
    .maybeSingle()

  if (lotError) throw lotError
  if (!lot) throw new RecordLotBottlingError('lot_not_found')

  const lotRow = lot as LotBottlingRow
  const vintageRaw = lotRow.vintage
  const vintage = Array.isArray(vintageRaw) ? vintageRaw[0] : vintageRaw
  const defaultAnada = vintage?.year ?? null

  const existenciaIds = await fetchExistenciaLotIds(sb, organizationId, [lotId])
  const hasExistencia = existenciaIds.has(lotId)

  const { data: etiquetas, error: etiquetasError } = await sb
    .from('wm_etiquetas')
    .select('id, nombre')
    .eq('organization_id', organizationId)
    .order('nombre')

  if (etiquetasError) {
    const message = etiquetasError.message?.toLowerCase() ?? ''
    if (etiquetasError.code === '42P01' || message.includes('wm_etiquetas')) {
      return {
        lot: {
          id: lotRow.id,
          code: lotRow.code,
          etapa: lotRow.etapa,
          status: lotRow.status,
          defaultAnada,
        },
        etiquetas: [],
        hasExistencia,
        canRegister:
          lotRow.status === 'active' &&
          !hasExistencia &&
          lotEligibleForBottling(lotRow.etapa),
      }
    }
    throw etiquetasError
  }

  return {
    lot: {
      id: lotRow.id,
      code: lotRow.code,
      etapa: lotRow.etapa,
      status: lotRow.status,
      defaultAnada,
    },
    etiquetas: (etiquetas ?? []).map(row => ({
      id: String(row.id),
      nombre: String(row.nombre),
    })),
    hasExistencia,
    canRegister:
      lotRow.status === 'active' &&
      !hasExistencia &&
      lotEligibleForBottling(lotRow.etapa),
  }
}

async function resolveEtiquetaId(
  sb: SupabaseClient,
  organizationId: string,
  input: LotBottlingInput
): Promise<string> {
  if (input.etiquetaId) {
    const { data, error } = await sb
      .from('wm_etiquetas')
      .select('id')
      .eq('id', input.etiquetaId)
      .eq('organization_id', organizationId)
      .maybeSingle()

    if (error) throw error
    if (!data) throw new RecordLotBottlingError('invalid_etiqueta')
    return String(data.id)
  }

  const nombre = input.newEtiqueta!.nombre
  const { data: existing, error: findError } = await sb
    .from('wm_etiquetas')
    .select('id')
    .eq('organization_id', organizationId)
    .ilike('nombre', nombre)
    .limit(1)
    .maybeSingle()

  if (findError) throw findError
  if (existing) return String(existing.id)

  try {
    await assertPlanLimit(sb, organizationId, 'etiquetas')
  } catch (err) {
    if (err instanceof PlanLimitError) throw new RecordLotBottlingError('limit_reached_etiquetas')
    throw err
  }

  const { data: created, error: insertError } = await sb
    .from('wm_etiquetas')
    .insert({
      organization_id: organizationId,
      nombre,
      varietal: input.newEtiqueta?.varietal ?? null,
      region: input.newEtiqueta?.region ?? null,
      tipo: input.newEtiqueta?.tipo ?? null,
    })
    .select('id')
    .single()

  if (insertError) throw new RecordLotBottlingError('etiqueta_create_failed')
  return String(created.id)
}

/** Bottling close: creates wm_existencias + BOTTLING_COMPLETED event (Epic D2). */
export async function recordLotBottling(
  sb: SupabaseClient,
  params: RecordLotBottlingParams
): Promise<RecordLotBottlingResult> {
  const validated = validateLotBottlingInput(params)
  if (!validated.ok) throw new RecordLotBottlingError(validated.code)
  const input = validated.value

  const { data: lot, error: lotError } = await sb
    .from('lots')
    .select('id, code, status, etapa')
    .eq('id', input.lotId)
    .eq('organization_id', params.organizationId)
    .maybeSingle()

  if (lotError) throw lotError
  if (!lot) throw new RecordLotBottlingError('lot_not_found')
  if (lot.status !== 'active') throw new RecordLotBottlingError('lot_not_active')
  if (!lotEligibleForBottling(lot.etapa as LotEtapa)) {
    throw new RecordLotBottlingError('lot_stage_too_early')
  }

  const existenciaIds = await fetchExistenciaLotIds(sb, params.organizationId, [input.lotId])
  if (existenciaIds.has(input.lotId)) {
    throw new RecordLotBottlingError('lot_already_bottled')
  }

  const etiquetaId = await resolveEtiquetaId(sb, params.organizationId, input)

  const { data: existencia, error: existenciaError } = await sb
    .from('wm_existencias')
    .insert({
      organization_id: params.organizationId,
      etiqueta_id: etiquetaId,
      lote_id: input.lotId,
      anada: input.anada,
      formato: input.formato,
      botellas_por_caja: input.botellasPorCaja,
      botellas_producidas: input.botellasProducidas,
    })
    .select('id')
    .single()

  if (existenciaError || !existencia) {
    throw new RecordLotBottlingError('existencia_create_failed')
  }

  const eventPayload = {
    existencia_id: existencia.id,
    etiqueta_id: etiquetaId,
    anada: input.anada,
    formato: input.formato,
    botellas_por_caja: input.botellasPorCaja,
    botellas_producidas: input.botellasProducidas,
  }

  try {
    await assertPlanLimit(sb, params.organizationId, 'memoria')
  } catch (err) {
    if (err instanceof PlanLimitError) throw new RecordLotBottlingError('limit_reached_memoria')
    throw err
  }

  const { data: event, error: eventError } = await sb
    .from('events')
    .insert({
      organization_id: params.organizationId,
      lot_id: input.lotId,
      event_type: 'BOTTLING_COMPLETED',
      payload: eventPayload,
      occurred_at: input.occurredAt ?? new Date().toISOString(),
      actor_id: params.actorUserId ?? null,
    })
    .select('id')
    .single()

  if (eventError || !event) {
    throw new RecordLotBottlingError('event_create_failed')
  }

  return {
    existenciaId: String((existencia as WmExistenciaRow).id ?? existencia.id),
    etiquetaId,
    eventId: String(event.id),
  }
}
