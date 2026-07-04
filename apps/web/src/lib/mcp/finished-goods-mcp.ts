import type { FinishedGoodsInventoryView } from '@/lib/proof/finished-goods-inventory'

export type McpEtiquetaExistencia = {
  existencia_id: string
  anada: number
  formato: string
  lote_origen: string
  botellas_por_caja: number
  producidas: number
  consumidas: number
  disponibles: number
  cajas_disponibles: number
  sueltas: number
}

export type McpEtiquetaGroup = {
  etiqueta_id: string
  nombre: string
  total_disponibles: number
  existencias: McpEtiquetaExistencia[]
}

export function formatEtiquetasForMcp(view: FinishedGoodsInventoryView): {
  etiquetas: McpEtiquetaGroup[]
} {
  return {
    etiquetas: view.groups.map(group => ({
      etiqueta_id: group.id,
      nombre: group.nombre,
      total_disponibles: group.totalDisponibles,
      existencias: group.existencias.map(row => ({
        existencia_id: row.id,
        anada: row.anada,
        formato: row.formato,
        lote_origen: row.loteOrigen,
        botellas_por_caja: row.botellasPorCaja,
        producidas: row.stock.producidas,
        consumidas: row.stock.consumidas,
        disponibles: row.stock.disponibles,
        cajas_disponibles: row.stock.cajas_disponibles,
        sueltas: row.stock.sueltas,
      })),
    })),
  }
}
