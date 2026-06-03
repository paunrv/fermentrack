'use client'

export type ProfileType = 'distiller' | 'distributor'

export type DistillerMetric =
  | 'litros_crudo'
  | 'litros_totales'
  | 'costo_litro'
  | 'deuda_palenquero'
  | 'merma_pct'
  | 'botellas_inventario'
  | 'botellas_vendidas'
  | 'costo_botella'
  | 'valor_bodega'
  | 'dias_bodega'
  | 'margen_botella'
  | 'total_cobrado'
  | 'por_cobrar'
  | 'proxima_entrega'

export type DistributorMetric =
  | 'stock_disponible'
  | 'stock_reservado'
  | 'stock_total'
  | 'pedidos_activos'
  | 'costo_unidad'
  | 'precio_venta'
  | 'margen'
  | 'ultima_venta'
  | 'por_cobrar'
  | 'dias_sin_movimiento'
  | 'unidades_vendidas_mes'

export type KpiMetric = DistillerMetric | DistributorMetric

export const DISTILLER_METRICS: { key: DistillerMetric; label: string }[] = [
  { key: 'litros_crudo', label: 'Litros en crudo' },
  { key: 'litros_totales', label: 'Litros totales' },
  { key: 'costo_litro', label: 'Costo/litro' },
  { key: 'deuda_palenquero', label: 'Deuda palenquero' },
  { key: 'merma_pct', label: 'Merma %' },
  { key: 'botellas_inventario', label: 'Botellas en inventario' },
  { key: 'botellas_vendidas', label: 'Botellas vendidas' },
  { key: 'costo_botella', label: 'Costo/botella' },
  { key: 'valor_bodega', label: 'Valor en bodega' },
  { key: 'dias_bodega', label: 'Días en bodega' },
  { key: 'margen_botella', label: 'Margen/botella' },
  { key: 'total_cobrado', label: 'Total cobrado' },
  { key: 'por_cobrar', label: 'Por cobrar' },
  { key: 'proxima_entrega', label: 'Próxima entrega' },
]

export const DISTRIBUTOR_METRICS: { key: DistributorMetric; label: string }[] = [
  { key: 'stock_disponible', label: 'Stock disponible' },
  { key: 'stock_reservado', label: 'Stock reservado' },
  { key: 'stock_total', label: 'Stock total' },
  { key: 'pedidos_activos', label: 'Pedidos activos' },
  { key: 'costo_unidad', label: 'Costo/unidad' },
  { key: 'precio_venta', label: 'Precio venta' },
  { key: 'margen', label: 'Margen' },
  { key: 'ultima_venta', label: 'Última venta' },
  { key: 'por_cobrar', label: 'Por cobrar' },
  { key: 'dias_sin_movimiento', label: 'Días sin movimiento' },
  { key: 'unidades_vendidas_mes', label: 'Unidades vendidas mes' },
]

export const DEFAULT_METRICS: Record<ProfileType, [KpiMetric, KpiMetric, KpiMetric]> = {
  distiller: ['litros_crudo', 'botellas_inventario', 'botellas_vendidas'],
  distributor: ['stock_disponible', 'pedidos_activos', 'por_cobrar'],
}

export function metricLabel(profileType: ProfileType, metric: KpiMetric): string {
  const list = profileType === 'distiller' ? DISTILLER_METRICS : DISTRIBUTOR_METRICS
  return list.find(m => m.key === metric)?.label ?? metric
}

export function metricsForProfile(profileType: ProfileType) {
  return profileType === 'distiller' ? DISTILLER_METRICS : DISTRIBUTOR_METRICS
}
