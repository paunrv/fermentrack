import type { SupabaseClient } from '@supabase/supabase-js'
import {
  botellasFromSalidaInput,
  computeExistenciaStock,
  WM_SALIDA_TIPO_VALUES,
  type ExistenciaStockCounts,
  type WmBotellasPorCaja,
  type WmSalidaOrigen,
  type WmSalidaTipo,
} from '@/lib/proof/finished-goods-types'
import { orgHasFeature } from '@/lib/proof/org-features'
import type { OrgFeatureSource } from '@/lib/proof/org-features'

export type RegistrarSalidaInput = {
  existenciaId: string
  tipo: WmSalidaTipo
  cantidad: number
  unidad: 'botellas' | 'cajas'
  rangoInicio?: number | null
  rangoFin?: number | null
}

export type RecordWmSalidaParams = RegistrarSalidaInput & {
  organizationId: string
  registradoPor: string
  origen?: WmSalidaOrigen
  org: OrgFeatureSource
}

export type RecordWmSalidaResult = {
  salidaId: string
  botellas: number
  stock: ExistenciaStockCounts
  conversion: {
    cantidad: number
    unidad: 'botellas' | 'cajas'
    botellas: number
    botellasPorCaja: WmBotellasPorCaja
    quedan: number
  }
  rango: { inicio: number | null; fin: number | null }
}

export type RecordWmSalidaValidationCode =
  | 'missing_existencia_id'
  | 'invalid_tipo'
  | 'invalid_cantidad'
  | 'invalid_unidad'
  | 'invalid_rango'

export type RecordWmSalidaErrorCode =
  | RecordWmSalidaValidationCode
  | 'existencia_not_found'
  | 'insufficient_stock'
  | 'rango_not_allowed'
  | 'rango_overlap'
  | 'rango_required'
  | 'salida_create_failed'

export class RecordWmSalidaError extends Error {
  constructor(public readonly code: RecordWmSalidaErrorCode) {
    super(code)
    this.name = 'RecordWmSalidaError'
  }
}

type SalidaRangoRow = {
  rango_inicio: number | null
  rango_fin: number | null
}

export function computeDefaultRango(
  consumidas: number,
  botellas: number
): { inicio: number; fin: number } {
  const inicio = consumidas + 1
  return { inicio, fin: inicio + botellas - 1 }
}

export function rangesOverlap(
  aInicio: number,
  aFin: number,
  bInicio: number,
  bFin: number
): boolean {
  return aInicio <= bFin && bInicio <= aFin
}

export function validateRangoNoOverlap(
  inicio: number,
  fin: number,
  existing: SalidaRangoRow[]
): boolean {
  for (const row of existing) {
    if (row.rango_inicio == null || row.rango_fin == null) continue
    if (rangesOverlap(inicio, fin, row.rango_inicio, row.rango_fin)) return false
  }
  return true
}

export function validateRegistrarSalidaInput(
  input: Partial<RegistrarSalidaInput>
):
  | { ok: true; value: RegistrarSalidaInput }
  | { ok: false; code: RecordWmSalidaValidationCode } {
  const existenciaId = input.existenciaId?.trim()
  if (!existenciaId) return { ok: false, code: 'missing_existencia_id' }

  const tipo = input.tipo
  if (!tipo || !(WM_SALIDA_TIPO_VALUES as readonly string[]).includes(tipo)) {
    return { ok: false, code: 'invalid_tipo' }
  }

  const cantidad = input.cantidad
  if (!Number.isFinite(cantidad) || cantidad <= 0) {
    return { ok: false, code: 'invalid_cantidad' }
  }

  if (input.unidad !== 'botellas' && input.unidad !== 'cajas') {
    return { ok: false, code: 'invalid_unidad' }
  }

  const rangoInicio = input.rangoInicio
  const rangoFin = input.rangoFin
  if (
    (rangoInicio != null &&
      (!Number.isInteger(rangoInicio) || rangoInicio <= 0 || rangoFin == null)) ||
    (rangoFin != null &&
      (!Number.isInteger(rangoFin) || rangoFin <= 0 || rangoInicio == null)) ||
    (rangoInicio != null && rangoFin != null && rangoFin < rangoInicio)
  ) {
    return { ok: false, code: 'invalid_rango' }
  }

  return {
    ok: true,
    value: {
      existenciaId,
      tipo,
      cantidad,
      unidad: input.unidad,
      rangoInicio: rangoInicio ?? null,
      rangoFin: rangoFin ?? null,
    },
  }
}

export function buildSalidaConversionPreview(
  cantidad: number,
  unidad: 'botellas' | 'cajas',
  botellasPorCaja: WmBotellasPorCaja,
  disponibles: number
): { botellas: number; quedan: number } {
  const botellas = botellasFromSalidaInput(cantidad, unidad, botellasPorCaja)
  return { botellas, quedan: Math.max(0, disponibles - botellas) }
}

/** Append-only salida — Epic D4. */
export async function recordWmSalida(
  sb: SupabaseClient,
  params: RecordWmSalidaParams
): Promise<RecordWmSalidaResult> {
  const validated = validateRegistrarSalidaInput(params)
  if (!validated.ok) throw new RecordWmSalidaError(validated.code)
  const input = validated.value

  const numeracionEnabled = orgHasFeature(params.org, 'numeracion_botellas')

  const { data: existencia, error: existenciaError } = await sb
    .from('wm_existencias')
    .select('id, botellas_producidas, botellas_por_caja')
    .eq('id', input.existenciaId)
    .eq('organization_id', params.organizationId)
    .maybeSingle()

  if (existenciaError) throw existenciaError
  if (!existencia) throw new RecordWmSalidaError('existencia_not_found')

  const botellasPorCaja = existencia.botellas_por_caja as WmBotellasPorCaja
  const botellas = botellasFromSalidaInput(input.cantidad, input.unidad, botellasPorCaja)
  if (botellas <= 0) throw new RecordWmSalidaError('invalid_cantidad')

  const { data: salidas, error: salidasError } = await sb
    .from('wm_salidas')
    .select('botellas, rango_inicio, rango_fin')
    .eq('existencia_id', input.existenciaId)

  if (salidasError) throw salidasError

  const consumidas = [...(salidas ?? [])].reduce((sum, row) => sum + Number(row.botellas), 0)
  const stockBefore = computeExistenciaStock(
    existencia.botellas_producidas,
    consumidas,
    botellasPorCaja
  )

  if (botellas > stockBefore.disponibles) {
    throw new RecordWmSalidaError('insufficient_stock')
  }

  let rangoInicio: number | null = null
  let rangoFin: number | null = null

  if (numeracionEnabled) {
    const resolved =
      input.rangoInicio != null && input.rangoFin != null
        ? { inicio: input.rangoInicio, fin: input.rangoFin }
        : computeDefaultRango(stockBefore.consumidas, botellas)

    if (resolved.fin - resolved.inicio + 1 !== botellas) {
      throw new RecordWmSalidaError('invalid_rango')
    }

    if (
      !validateRangoNoOverlap(resolved.inicio, resolved.fin, (salidas ?? []) as SalidaRangoRow[])
    ) {
      throw new RecordWmSalidaError('rango_overlap')
    }

    rangoInicio = resolved.inicio
    rangoFin = resolved.fin
  } else if (input.rangoInicio != null || input.rangoFin != null) {
    throw new RecordWmSalidaError('rango_not_allowed')
  }

  const { data: inserted, error: insertError } = await sb
    .from('wm_salidas')
    .insert({
      organization_id: params.organizationId,
      existencia_id: input.existenciaId,
      tipo: input.tipo,
      botellas,
      rango_inicio: rangoInicio,
      rango_fin: rangoFin,
      registrado_por: params.registradoPor,
      origen: params.origen ?? 'web',
    })
    .select('id')
    .single()

  if (insertError || !inserted) {
    if (insertError?.message?.includes('salidas_exceed_produced')) {
      throw new RecordWmSalidaError('insufficient_stock')
    }
    throw new RecordWmSalidaError('salida_create_failed')
  }

  const stockAfter = computeExistenciaStock(
    existencia.botellas_producidas,
    consumidas + botellas,
    botellasPorCaja
  )

  return {
    salidaId: String(inserted.id),
    botellas,
    stock: stockAfter,
    conversion: {
      cantidad: input.cantidad,
      unidad: input.unidad,
      botellas,
      botellasPorCaja,
      quedan: stockAfter.disponibles,
    },
    rango: { inicio: rangoInicio, fin: rangoFin },
  }
}
