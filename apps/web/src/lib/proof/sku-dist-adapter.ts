import type {
  DistInventoryRow,
  DistMovementWithRefs,
  DistProduct,
  ProductCategory,
} from '@/lib/supabase'
import type { CategoriaSku, SkuRow } from '@/lib/supabase/distribuidor'

export type MovimientoSkuRow = {
  id: string
  sku_id: string
  tipo: 'entrada' | 'venta' | 'donacion' | 'merma' | 'muestra'
  cantidad: number
  fecha: string
  notas: string | null
  client_id: string | null
  recipient: string | null
  reason: string | null
  event: string | null
  precio_unitario: number | null
  total: number | null
  moneda: string | null
  created_at: string
  skus?: { nombre: string; botellas_por_caja: number; categoria: CategoriaSku } | null
  clients?: { name: string } | null
}

function skuCategoryToProductCategory(categoria: CategoriaSku): ProductCategory {
  if (categoria === 'cerveza' || categoria === 'vino') return categoria
  return 'destilado'
}

export function productCategoryToCategoriaSku(category: ProductCategory): CategoriaSku {
  if (category === 'cerveza' || category === 'vino') return category
  return 'destilado'
}

export function skuRowToDistProduct(sku: SkuRow): DistProduct {
  return {
    id: sku.id,
    name: sku.nombre,
    category: skuCategoryToProductCategory(sku.categoria),
    producer: sku.productor || null,
    origin: (sku.origen as DistProduct['origin']) ?? 'local',
    unit_type: (sku.tipo_unidad as DistProduct['unit_type']) ?? 'botella',
    bottles_per_case: sku.botellas_por_caja || 12,
    cost_per_unit: Number(sku.costo_unitario),
    price_regular: Number(sku.precio_venta),
    price_mayoreo: Number(sku.precio_mayoreo ?? 0),
    price_especial: Number(sku.precio_especial ?? 0),
    currency: sku.moneda ?? 'MXN',
    notes: sku.notas,
    created_at: sku.created_at,
    image_url: sku.imagen_url,
    user_id: sku.user_id,
    profile_type_v2: sku.profile_type_v2 as DistProduct['profile_type_v2'],
  }
}

/** Convierte stock en botellas a cases + loose para UI legacy de movimientos. */
export function botellasToCasesLoose(
  botellas: number,
  bottlesPerCase: number
): { cases: number; loose_units: number } {
  const bpc = Math.max(1, bottlesPerCase)
  return {
    cases: Math.floor(botellas / bpc),
    loose_units: botellas % bpc,
  }
}

export function skuRowToInventoryRow(sku: SkuRow): DistInventoryRow {
  const bpc = sku.botellas_por_caja || 12
  const disponible = sku.stock_disponible ?? Math.max(0, sku.stock_total - sku.stock_reservado)
  const { cases, loose_units } = botellasToCasesLoose(disponible, bpc)

  return {
    id: sku.id,
    name: sku.nombre,
    category: skuCategoryToProductCategory(sku.categoria),
    producer: sku.productor || null,
    origin: (sku.origen as 'local' | 'importado') ?? 'local',
    unit_type: (sku.tipo_unidad as 'botella' | 'lata') ?? 'botella',
    bottles_per_case: bpc,
    cost_per_unit: Number(sku.costo_unitario),
    price_regular: Number(sku.precio_venta),
    price_mayoreo: Number(sku.precio_mayoreo ?? 0),
    price_especial: Number(sku.precio_especial ?? 0),
    currency: sku.moneda ?? 'MXN',
    notes: sku.notas,
    created_at: sku.created_at,
    image_url: sku.imagen_url,
    user_id: sku.user_id,
    profile_type_v2: sku.profile_type_v2 as DistInventoryRow['profile_type_v2'],
    inventory: {
      product_id: sku.id,
      cases,
      loose_units,
      max_units: sku.stock_total,
      updated_at: sku.updated_at,
    },
  }
}

export function skuRowsToInventoryRows(skus: SkuRow[]): DistInventoryRow[] {
  return skus.map(skuRowToInventoryRow)
}

export function movimientoSkuToDistMovement(row: MovimientoSkuRow): DistMovementWithRefs {
  const bpc = row.skus?.botellas_por_caja ?? 12
  const { cases, loose_units } = botellasToCasesLoose(row.cantidad, bpc)

  return {
    id: row.id,
    product_id: row.sku_id,
    movement_type: row.tipo,
    cases,
    loose_units,
    movement_date: row.fecha,
    notes: row.notas,
    created_at: row.created_at,
    client_id: row.client_id,
    recipient: row.recipient,
    reason: row.reason,
    event: row.event,
    unit_price: row.precio_unitario,
    total_amount: row.total,
    currency: row.moneda,
    dist_products: row.skus
      ? {
          name: row.skus.nombre,
          category: skuCategoryToProductCategory(row.skus.categoria),
          bottles_per_case: bpc,
          currency: row.moneda ?? 'MXN',
        }
      : null,
    clients: row.clients ?? null,
  }
}
