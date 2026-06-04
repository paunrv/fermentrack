import type { PedidoRow, SkuRow } from '@/lib/supabase/distribuidor'

export type DistributorAgentContext = {
  perfil: 'distribuidor'
  query?: string
  selectedSkuId?: string | null
  resumen: {
    skusTotal: number
    stockDisponibleTotal: number
    bajoStock: number
    quiebre: number
    pedidosActivos: number
  }
  skus: {
    id: string
    codigo: string
    nombre: string
    productor: string
    stock_disponible: number
    stock_total: number
    estado: string
  }[]
  pedidos: {
    id: string
    numero: string
    estado: string
    total: number
    fecha_entrega: string | null
  }[]
}

export function buildDistributorAgentContext(
  skus: SkuRow[],
  pedidos: PedidoRow[],
  opts?: { selectedId?: string | null; query?: string | null }
): DistributorAgentContext {
  const activos = pedidos.filter(p =>
    ['confirmado', 'preparando', 'en_ruta', 'borrador'].includes(p.estado)
  )

  return {
    perfil: 'distribuidor',
    query: opts?.query ?? undefined,
    selectedSkuId: opts?.selectedId ?? null,
    resumen: {
      skusTotal: skus.length,
      stockDisponibleTotal: skus.reduce((s, x) => s + x.stock_disponible, 0),
      bajoStock: skus.filter(s => s.estado === 'bajo').length,
      quiebre: skus.filter(s => s.estado === 'quiebre').length,
      pedidosActivos: activos.length,
    },
    skus: skus.map(s => ({
      id: s.id,
      codigo: s.codigo,
      nombre: s.nombre,
      productor: s.productor,
      stock_disponible: s.stock_disponible,
      stock_total: s.stock_total,
      estado: s.estado,
    })),
    pedidos: pedidos.slice(0, 30).map(p => ({
      id: p.id,
      numero: p.numero,
      estado: p.estado,
      total: Number(p.total),
      fecha_entrega: p.fecha_entrega,
    })),
  }
}
