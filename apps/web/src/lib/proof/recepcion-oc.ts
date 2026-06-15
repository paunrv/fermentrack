import type { ItemOrdenCompraDistribuidorRow } from '@/lib/supabase/distribuidor'
import type { ExpectedOcItem } from '@/lib/proof/recepcion-analysis'

export type OcRecepcionSource = 'distribuidor' | 'legacy'

export function encodeOcRecepcionValue(source: OcRecepcionSource, id: string): string {
  return `${source}:${id}`
}

export function parseOcRecepcionValue(
  value: string
): { source: OcRecepcionSource; id: string } | null {
  const m = value.match(/^(distribuidor|legacy):([0-9a-f-]{36})$/i)
  if (!m?.[1] || !m[2]) return null
  return { source: m[1] as OcRecepcionSource, id: m[2] }
}

export function itemsOrdenDistribuidorToExpected(
  items: ItemOrdenCompraDistribuidorRow[]
): ExpectedOcItem[] {
  return items.map(it => ({
    skuId: it.sku_id ?? undefined,
    nombre: it.producto_nombre,
    cantidadEsperada: Math.max(
      0,
      it.cantidad_ordenada - (it.cantidad_recibida ?? 0)
    ),
  }))
}
