import type { CorridaRow, LoteRow } from '@/lib/proof/destilador-types'
import { fmtLitros, fmtMoney } from '@/lib/proof/format'
import type { KpiMetric, ProfileType } from '@/lib/proof/kpi-metrics'
import type { SkuRow } from '@/lib/supabase/distribuidor'
import { FORMATO_LITROS } from '@/lib/supabase/destilador'

export function resolveDistillerKpi(
  metric: KpiMetric,
  lote: LoteRow | null,
  lotes: LoteRow[],
  corridas: CorridaRow[]
): string {
  const all = lote ? [lote] : lotes
  const pv = lote?.productos_viaje

  switch (metric) {
    case 'litros_crudo': {
      const v = all.reduce((a, l) => a + Number(l.litros_disponibles_granel), 0)
      return fmtLitros(v)
    }
    case 'litros_totales': {
      const v = all.reduce((a, l) => a + Number(l.litros_recibidos), 0)
      return fmtLitros(v)
    }
    case 'costo_litro': {
      if (!pv || Number(pv.litros_acordados) <= 0) return '—'
      const c =
        Number(pv.precio_por_litro) +
        Number(pv.flete_proporcional ?? 0) / Number(pv.litros_acordados)
      return fmtMoney(c)
    }
    case 'deuda_palenquero':
      return '—'
    case 'merma_pct': {
      const rec = lote ? Number(lote.litros_recibidos) : 0
      let merma = 0
      for (const c of corridas) merma += Number(c.merma_litros ?? 0)
      if (rec <= 0) return '—'
      return `${((100 * merma) / rec).toFixed(1)}%`
    }
    case 'botellas_inventario': {
      let n = 0
      for (const c of corridas) {
        if (c.estado === 'completada') n += c.botellas_producidas
      }
      return String(n)
    }
    case 'botellas_vendidas':
      return '0'
    case 'costo_botella': {
      const c = corridas.find(x => x.costo_real_por_botella != null)
      return c?.costo_real_por_botella != null
        ? fmtMoney(Number(c.costo_real_por_botella))
        : '—'
    }
    case 'valor_bodega':
      return '—'
    case 'dias_bodega': {
      const ref = lote ?? all[0]
      if (!ref) return '—'
      const d = Math.max(
        0,
        Math.floor((Date.now() - new Date(ref.fecha_recepcion).getTime()) / 86400000)
      )
      return String(d)
    }
    case 'margen_botella':
    case 'total_cobrado':
    case 'por_cobrar':
    case 'proxima_entrega':
      return '—'
    default:
      return '—'
  }
}

export function resolveDistributorKpi(
  metric: KpiMetric,
  sku: SkuRow | null,
  skus: SkuRow[]
): string {
  const all = sku ? [sku] : skus

  switch (metric) {
    case 'stock_disponible':
      return String(all.reduce((a, s) => a + s.stock_disponible, 0))
    case 'stock_reservado':
      return String(all.reduce((a, s) => a + s.stock_reservado, 0))
    case 'stock_total':
      return String(all.reduce((a, s) => a + s.stock_total, 0))
    case 'pedidos_activos':
      return '—'
    case 'costo_unidad':
      return sku ? fmtMoney(sku.costo_unitario) : '—'
    case 'precio_venta':
      return sku ? fmtMoney(sku.precio_venta) : '—'
    case 'margen':
      return sku ? `${Number(sku.margen_porcentaje).toFixed(0)}%` : '—'
    case 'ultima_venta':
      return sku?.ultimo_movimiento
        ? new Date(sku.ultimo_movimiento).toLocaleDateString('es-MX')
        : '—'
    case 'por_cobrar':
      return '—'
    case 'dias_sin_movimiento':
      return sku ? String(sku.dias_sin_movimiento) : '—'
    case 'unidades_vendidas_mes':
      return '—'
    default:
      return '—'
  }
}

export function loteEstadoLabel(estado: LoteRow['estado']): string {
  return estado.replace(/_/g, ' ')
}

export function loteEstadoColor(estado: LoteRow['estado']): string {
  const map: Record<LoteRow['estado'], string> = {
    en_bodega_crudo: 'var(--proof-accent)',
    en_produccion: '#378ADD',
    terminado: '#4CAF7D',
    vendido_parcial: '#9B8FE0',
  }
  return map[estado]
}

export function corridaStats(lote: LoteRow, corridas: CorridaRow[]) {
  const recibidos = Number(lote.litros_recibidos)
  const granel = Number(lote.litros_disponibles_granel)
  let embotellado = 0
  let merma = 0
  for (const c of corridas) {
    if (c.estado === 'completada') {
      embotellado += c.botellas_producidas * FORMATO_LITROS[c.formato_botella]
      merma += Number(c.merma_litros ?? 0)
    } else if (c.estado === 'activa') {
      embotellado += Number(c.litros_asignados)
    }
  }
  const mermaPct = recibidos > 0 ? (100 * merma) / recibidos : 0
  return { recibidos, granel, embotellado, merma, mermaPct }
}

export function skuEstadoLabel(estado: SkuRow['estado']): string {
  const map: Record<string, string> = {
    sano: 'Con stock',
    bajo: 'Stock bajo',
    quiebre: 'Sin stock',
    sobrevendido: 'Sobrevendido',
    muerto: 'Sin rotación',
    en_transito: 'En tránsito',
    consignacion: 'Consignación',
  }
  return map[estado] ?? estado
}

export function distributorMetricTone(metric: KpiMetric, sku: SkuRow): string {
  switch (metric) {
    case 'stock_disponible':
    case 'stock_total':
      if (sku.estado === 'sobrevendido' || sku.estado === 'quiebre') return '#E24B4A'
      if (sku.estado === 'bajo' || sku.estado === 'muerto') return '#EF9F27'
      return 'var(--fg-0)'
    case 'stock_reservado':
      return sku.stock_reservado > 0 ? '#378ADD' : 'var(--fg-0)'
    case 'margen': {
      const n = Number(sku.margen_porcentaje)
      if (n < 15) return '#E24B4A'
      if (n < 30) return '#EF9F27'
      return '#4CAF7D'
    }
    case 'dias_sin_movimiento': {
      const d = sku.dias_sin_movimiento
      if (d >= 60) return '#E24B4A'
      if (d >= 30) return '#EF9F27'
      return 'var(--fg-0)'
    }
    case 'costo_unidad':
    case 'precio_venta':
    case 'ultima_venta':
    case 'pedidos_activos':
    case 'por_cobrar':
    case 'unidades_vendidas_mes':
    default:
      return 'var(--fg-0)'
  }
}

export function skuEstadoColor(estado: SkuRow['estado'], accent: string): string {
  switch (estado) {
    case 'sano':
    case 'en_transito':
    case 'consignacion':
      return '#4CAF7D'
    case 'bajo':
    case 'muerto':
      return '#EF9F27'
    case 'quiebre':
    case 'sobrevendido':
      return '#E24B4A'
    default:
      return accent
  }
}

export function profileTypeFromV2(v2: string | undefined): ProfileType | null {
  if (v2 === 'distiller') return 'distiller'
  if (v2 === 'distributor') return 'distributor'
  if (v2 === 'winemaker' || v2 === 'bodega') return 'winemaker'
  return null
}
