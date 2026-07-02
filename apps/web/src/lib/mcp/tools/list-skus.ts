import { fetchSkus, resolveDistribuidorScope } from '@/lib/supabase/distribuidor'
import { createSupabaseForMcpToken } from '@/lib/mcp/auth'
import { getMcpRequestContext } from '@/lib/mcp/request-context'

export async function listSkusTool(limit = 50): Promise<{ content: { type: 'text'; text: string }[] }> {
  const ctx = getMcpRequestContext()
  if (!ctx) {
    throw new Error('Unauthorized')
  }

  const sb = createSupabaseForMcpToken(ctx.accessToken)
  const scope = await resolveDistribuidorScope(sb, ctx.userId)
  const rows = await fetchSkus(sb, scope)
  const slice = rows.slice(0, Math.max(1, Math.min(limit, 200)))

  const payload = slice.map(row => ({
    id: row.id,
    nombre: row.nombre,
    stock_disponible: row.stock_disponible,
    estado: row.estado,
    precio_venta: row.precio_venta,
    categoria_liquido: row.categoria_liquido,
  }))

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ count: payload.length, skus: payload }, null, 2),
      },
    ],
  }
}
