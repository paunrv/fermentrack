import type {
  DeudaProductorRow,
  OrdenCompraDistribuidorWithItems,
  OrdenCompraRow,
  SkuRow,
} from '@/lib/supabase/distribuidor'

export interface ProductorResumen {
  nombre: string
  skuCount: number
  deudaTotal: number
  proximoVencimiento: string | null
  ocPendientes: number
}

function normProductor(name: string | null | undefined): string {
  const t = (name || '').trim()
  return t || 'Sin productor'
}

export function buildProductoresResumen(
  skus: SkuRow[],
  deudas: DeudaProductorRow[],
  ordenesLegacy: OrdenCompraRow[] = [],
  ordenesDistribuidor: OrdenCompraDistribuidorWithItems[] = []
): ProductorResumen[] {
  const byName = new Map<string, ProductorResumen>()

  const ensure = (nombre: string) => {
    let row = byName.get(nombre)
    if (!row) {
      row = {
        nombre,
        skuCount: 0,
        deudaTotal: 0,
        proximoVencimiento: null,
        ocPendientes: 0,
      }
      byName.set(nombre, row)
    }
    return row
  }

  for (const s of skus) {
    const nombre = normProductor(s.productor)
    ensure(nombre).skuCount += 1
  }

  for (const d of deudas) {
    if (d.estado === 'pagado') continue
    const nombre = normProductor(d.productor)
    const row = ensure(nombre)
    row.deudaTotal += Number(d.monto) || 0
    if (!row.proximoVencimiento || d.fecha_vencimiento < row.proximoVencimiento) {
      row.proximoVencimiento = d.fecha_vencimiento
    }
  }

  for (const o of ordenesLegacy) {
    ensure(normProductor(o.productor_id))
  }

  for (const o of ordenesDistribuidor) {
    const row = ensure(normProductor(o.proveedor_nombre))
    row.ocPendientes += 1
  }

  return [...byName.values()].sort((a, b) => {
    if (b.deudaTotal !== a.deudaTotal) return b.deudaTotal - a.deudaTotal
    return a.nombre.localeCompare(b.nombre, 'es')
  })
}

export function encodeProductorSlug(nombre: string): string {
  return encodeURIComponent(nombre)
}

export function decodeProductorSlug(slug: string): string {
  return decodeURIComponent(slug)
}
