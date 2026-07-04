/** Finished goods inventory (Epic D) — canonical unit = botella. */

export const WM_BOTELLAS_POR_CAJA_VALUES = [6, 9, 12] as const
export type WmBotellasPorCaja = (typeof WM_BOTELLAS_POR_CAJA_VALUES)[number]

export const WM_SALIDA_TIPO_VALUES = [
  'venta',
  'degustacion',
  'autoconsumo',
  'merma',
  'ajuste',
] as const
export type WmSalidaTipo = (typeof WM_SALIDA_TIPO_VALUES)[number]

export const WM_SALIDA_ORIGEN_VALUES = ['web', 'mcp'] as const
export type WmSalidaOrigen = (typeof WM_SALIDA_ORIGEN_VALUES)[number]

export type WmEtiquetaRow = {
  id: string
  organization_id: string
  nombre: string
  varietal: string | null
  region: string | null
  tipo: string | null
  created_at: string
}

export type WmExistenciaRow = {
  id: string
  organization_id: string
  etiqueta_id: string
  lote_id: string
  anada: number
  formato: string
  botellas_por_caja: WmBotellasPorCaja
  botellas_producidas: number
  created_at: string
}

export type WmSalidaRow = {
  id: string
  organization_id: string
  existencia_id: string
  tipo: WmSalidaTipo
  botellas: number
  rango_inicio: number | null
  rango_fin: number | null
  registrado_por: string
  origen: WmSalidaOrigen
  created_at: string
}

export type ExistenciaStockCounts = {
  producidas: number
  consumidas: number
  disponibles: number
  cajas_disponibles: number
  sueltas: number
}

export function computeExistenciaStock(
  producidas: number,
  consumidas: number,
  botellasPorCaja: WmBotellasPorCaja
): ExistenciaStockCounts {
  const safeConsumidas = Math.min(Math.max(0, consumidas), producidas)
  const disponibles = producidas - safeConsumidas
  const cajas_disponibles = Math.floor(disponibles / botellasPorCaja)
  const sueltas = disponibles % botellasPorCaja

  return {
    producidas,
    consumidas: safeConsumidas,
    disponibles,
    cajas_disponibles,
    sueltas,
  }
}

export function botellasFromSalidaInput(
  cantidad: number,
  unidad: 'botellas' | 'cajas',
  botellasPorCaja: WmBotellasPorCaja
): number {
  if (!Number.isFinite(cantidad) || cantidad <= 0) return 0
  return unidad === 'cajas' ? Math.round(cantidad * botellasPorCaja) : Math.round(cantidad)
}
