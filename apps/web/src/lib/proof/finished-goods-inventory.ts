import type { SupabaseClient } from '@supabase/supabase-js'
import {
  computeExistenciaStock,
  type ExistenciaStockCounts,
  type WmBotellasPorCaja,
} from '@/lib/proof/finished-goods-types'

/** Default low-stock threshold: 3 full cases (matches distributor quiebre pattern). */
export const WM_LOW_STOCK_CASES = 3

export type ExistenciaInventoryRow = {
  id: string
  etiquetaId: string
  anada: number
  formato: string
  loteOrigen: string
  loteId: string
  botellasPorCaja: WmBotellasPorCaja
  stock: ExistenciaStockCounts
  lowStock: boolean
}

export type EtiquetaInventoryGroup = {
  id: string
  nombre: string
  existencias: ExistenciaInventoryRow[]
  totalDisponibles: number
}

export type FinishedGoodsInventoryView = {
  groups: EtiquetaInventoryGroup[]
  filterOptions: {
    anadas: number[]
    formatos: string[]
  }
}

export type FinishedGoodsInventoryFilters = {
  anada?: number | null
  formato?: string | null
  etiquetaId?: string | null
}

type ExistenciaQueryRow = {
  id: string
  anada: number
  formato: string
  botellas_por_caja: WmBotellasPorCaja
  botellas_producidas: number
  lote_id: string
  etiqueta_id: string
  wm_etiquetas: { id: string; nombre: string } | { id: string; nombre: string }[] | null
  lots: { code: string } | { code: string }[] | null
}

export function lowStockThresholdBotellas(botellasPorCaja: WmBotellasPorCaja): number {
  return Math.max(WM_LOW_STOCK_CASES * botellasPorCaja, 1)
}

export function isLowStock(disponibles: number, botellasPorCaja: WmBotellasPorCaja): boolean {
  return disponibles <= lowStockThresholdBotellas(botellasPorCaja)
}

export function sumSalidasByExistencia(
  salidas: Array<{ existencia_id: string; botellas: number }>
): Map<string, number> {
  const totals = new Map<string, number>()
  for (const row of salidas) {
    totals.set(row.existencia_id, (totals.get(row.existencia_id) ?? 0) + row.botellas)
  }
  return totals
}

function unwrapRelation<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

export function buildExistenciaInventoryRow(
  row: ExistenciaQueryRow,
  consumidas: number
): ExistenciaInventoryRow | null {
  const etiqueta = unwrapRelation(row.wm_etiquetas)
  const lot = unwrapRelation(row.lots)
  if (!etiqueta) return null

  const stock = computeExistenciaStock(row.botellas_producidas, consumidas, row.botellas_por_caja)

  return {
    id: row.id,
    etiquetaId: etiqueta.id,
    anada: row.anada,
    formato: row.formato,
    loteOrigen: lot?.code ?? row.lote_id,
    loteId: row.lote_id,
    botellasPorCaja: row.botellas_por_caja,
    stock,
    lowStock: isLowStock(stock.disponibles, row.botellas_por_caja),
  }
}

export function buildFinishedGoodsInventoryView(
  existenciaRows: ExistenciaInventoryRow[],
  etiquetaNames: Map<string, string>
): FinishedGoodsInventoryView {
  const byEtiqueta = new Map<string, ExistenciaInventoryRow[]>()

  for (const row of existenciaRows) {
    const list = byEtiqueta.get(row.etiquetaId) ?? []
    list.push(row)
    byEtiqueta.set(row.etiquetaId, list)
  }

  const anadas = new Set<number>()
  const formatos = new Set<string>()

  for (const row of existenciaRows) {
    anadas.add(row.anada)
    formatos.add(row.formato)
  }

  const groups: EtiquetaInventoryGroup[] = [...byEtiqueta.entries()]
    .map(([etiquetaId, existencias]) => {
      const sorted = [...existencias].sort((a, b) => {
        if (b.anada !== a.anada) return b.anada - a.anada
        return a.formato.localeCompare(b.formato)
      })
      const totalDisponibles = sorted.reduce((sum, row) => sum + row.stock.disponibles, 0)
      return {
        id: etiquetaId,
        nombre: etiquetaNames.get(etiquetaId) ?? etiquetaId,
        existencias: sorted,
        totalDisponibles,
      }
    })
    .sort((a, b) => a.nombre.localeCompare(b.nombre))

  return {
    groups,
    filterOptions: {
      anadas: [...anadas].sort((a, b) => b - a),
      formatos: [...formatos].sort((a, b) => a.localeCompare(b)),
    },
  }
}

export function filterFinishedGoodsInventory(
  view: FinishedGoodsInventoryView,
  filters: FinishedGoodsInventoryFilters
): FinishedGoodsInventoryView {
  const { anada, formato, etiquetaId } = filters

  let groups = view.groups

  if (etiquetaId) {
    groups = groups.filter(g => g.id === etiquetaId)
  }

  groups = groups
    .map(group => ({
      ...group,
      existencias: group.existencias.filter(row => {
        if (anada != null && row.anada !== anada) return false
        if (formato && row.formato !== formato) return false
        return true
      }),
    }))
    .filter(group => group.existencias.length > 0)
    .map(group => ({
      ...group,
      totalDisponibles: group.existencias.reduce((sum, row) => sum + row.stock.disponibles, 0),
    }))

  return { ...view, groups }
}

export async function fetchFinishedGoodsInventory(
  sb: SupabaseClient,
  organizationId: string
): Promise<FinishedGoodsInventoryView> {
  const { data: existencias, error: existenciasError } = await sb
    .from('wm_existencias')
    .select(
      `
      id,
      anada,
      formato,
      botellas_por_caja,
      botellas_producidas,
      lote_id,
      etiqueta_id,
      wm_etiquetas ( id, nombre ),
      lots: lote_id ( code )
    `
    )
    .eq('organization_id', organizationId)

  if (existenciasError) {
    const message = existenciasError.message?.toLowerCase() ?? ''
    if (existenciasError.code === '42P01' || message.includes('wm_existencias')) {
      return { groups: [], filterOptions: { anadas: [], formatos: [] } }
    }
    throw existenciasError
  }

  const existenciaIds = (existencias ?? []).map(row => String(row.id))
  let salidaTotals = new Map<string, number>()

  if (existenciaIds.length > 0) {
    const { data: salidas, error: salidasError } = await sb
      .from('wm_salidas')
      .select('existencia_id, botellas')
      .eq('organization_id', organizationId)
      .in('existencia_id', existenciaIds)

    if (salidasError) {
      const message = salidasError.message?.toLowerCase() ?? ''
      if (salidasError.code !== '42P01' && !message.includes('wm_salidas')) {
        throw salidasError
      }
    } else {
      salidaTotals = sumSalidasByExistencia(
        (salidas ?? []).map(row => ({
          existencia_id: String(row.existencia_id),
          botellas: Number(row.botellas),
        }))
      )
    }
  }

  const inventoryRows: ExistenciaInventoryRow[] = []
  const etiquetaNames = new Map<string, string>()

  for (const raw of existencias ?? []) {
    const row = raw as ExistenciaQueryRow
    const etiqueta = unwrapRelation(row.wm_etiquetas)
    if (etiqueta) etiquetaNames.set(etiqueta.id, etiqueta.nombre)

    const built = buildExistenciaInventoryRow(row, salidaTotals.get(String(row.id)) ?? 0)
    if (built) inventoryRows.push(built)
  }

  return buildFinishedGoodsInventoryView(inventoryRows, etiquetaNames)
}
