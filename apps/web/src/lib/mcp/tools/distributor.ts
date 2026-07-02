import { buildDistributorAgentContext } from '@/lib/proof/distributor-agent-context'
import {
  fetchCreditoCxCResumen,
  fetchCuentasPorCobrarActivas,
  fetchOrdenesCompraDistribuidorPendientes,
  fetchPedidos,
  fetchSkus,
} from '@/lib/supabase/distribuidor'
import type { McpScopeInput } from '@/lib/mcp/resolve-scope'
import { withMcpScope } from '@/lib/mcp/tool-helpers'

function clampLimit(limit: number | undefined, fallback = 50): number {
  return Math.max(1, Math.min(limit ?? fallback, 200))
}

export async function listSkusTool(
  input?: McpScopeInput & { limit?: number }
): Promise<{ content: { type: 'text'; text: string }[] }> {
  return withMcpScope(input, 'distributor', async ({ sb, scope }) => {
    const rows = await fetchSkus(sb, scope.distributorScope!)
    const limit = clampLimit(input?.limit)
    const slice = rows.slice(0, limit)
    return {
      count: slice.length,
      skus: slice.map(row => ({
        id: row.id,
        nombre: row.nombre,
        stock_disponible: row.stock_disponible,
        estado: row.estado,
        precio_venta: row.precio_venta,
        categoria_liquido: row.categoria_liquido,
      })),
    }
  })
}

export async function getInventorySummaryTool(input?: McpScopeInput) {
  return withMcpScope(input, 'distributor', async ({ sb, scope }) => {
    const distributorScope = scope.distributorScope!
    const [skus, pedidos, cuentas] = await Promise.all([
      fetchSkus(sb, distributorScope),
      fetchPedidos(sb, distributorScope, { limit: 100 }),
      fetchCuentasPorCobrarActivas(sb, distributorScope),
    ])
    const ctx = buildDistributorAgentContext(skus, pedidos, cuentas)
    return {
      resumen: ctx.resumen,
      skus_stock_critico: ctx.skus_stock_critico.slice(0, 20),
    }
  })
}

export async function listPedidosTool(
  input?: McpScopeInput & { limit?: number; estado?: string }
) {
  return withMcpScope(input, 'distributor', async ({ sb, scope }) => {
    const rows = await fetchPedidos(sb, scope.distributorScope!, {
      limit: clampLimit(input?.limit),
      estado: input?.estado as never,
    })
    return {
      count: rows.length,
      pedidos: rows.map(p => ({
        id: p.id,
        numero: p.numero,
        estado: p.estado,
        total: p.total,
        fecha_entrega: p.fecha_entrega,
        cliente: (p as { clients?: { name: string } | null }).clients?.name ?? null,
      })),
    }
  })
}

export async function getCreditoResumenTool(input?: McpScopeInput) {
  return withMcpScope(input, 'distributor', async ({ sb, scope }) => {
    const resumen = await fetchCreditoCxCResumen(sb, scope.distributorScope!)
    return resumen
  })
}

export async function listOrdenesCompraTool(input?: McpScopeInput) {
  return withMcpScope(input, 'distributor', async ({ sb, scope }) => {
    const rows = await fetchOrdenesCompraDistribuidorPendientes(sb, scope.distributorScope!)
    return {
      count: rows.length,
      ordenes: rows.map(o => ({
        id: o.id,
        numero: o.numero_orden,
        estado: o.estado,
        proveedor: o.proveedor_nombre,
        fecha_estimada: o.fecha_estimada,
        total: o.total_acordado,
        items: (o.items_orden_compra_distribuidor ?? []).length,
      })),
    }
  })
}