import type { SkuRow } from '@/lib/supabase/distribuidor'
import type { EstadoSKU, Rotacion30d, SKU } from './types'

/** Mapeo desde tabla `skus` (fuente PROOF) */
export function mapSkuRowToSKU(row: SkuRow): SKU {
  const estadoDb = row.estado as EstadoSKU
  return {
    id: row.id,
    nombre: row.nombre,
    productor: row.productor || '—',
    categoria: row.categoria,
    categoriaLiquido: row.categoria_liquido ?? 'otro',
    bodega: row.bodega || 'Principal',
    stockTotal: row.stock_total,
    stockReservado: row.stock_reservado,
    stockDisponible: row.stock_disponible,
    stockMinimo: row.stock_minimo,
    costoUnitario: Number(row.costo_unitario) || 0,
    precioVenta: Number(row.precio_venta) || 0,
    margenPorcentaje: Number(row.margen_porcentaje) || 0,
    lote: row.lote || '—',
    diasSinMovimiento: row.dias_sin_movimiento,
    rotacion30d: row.rotacion_30d as Rotacion30d,
    deudaAsociada: Number(row.deuda_asociada) || 0,
    estado: estadoDb,
    ultimoMovimiento: row.ultimo_movimiento ? new Date(row.ultimo_movimiento) : null,
    pedidosReservados: row.stock_reservado > 0 ? 1 : 0,
    distProductId: row.dist_product_id,
  }
}
