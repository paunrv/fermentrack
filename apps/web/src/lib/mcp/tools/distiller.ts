import { fetchLotesForAgent } from '@/lib/proof/agent-context-server'
import { fetchCorridas, fetchProductosViaje, fetchViajes } from '@/lib/supabase/destilador'
import type { McpScopeInput } from '@/lib/mcp/resolve-scope'
import { withMcpScope } from '@/lib/mcp/tool-helpers'

function clampLimit(limit: number | undefined, fallback = 50): number {
  return Math.max(1, Math.min(limit ?? fallback, 200))
}

export async function listCorridasTool(
  input?: McpScopeInput & { limit?: number; estado?: 'activa' | 'completada' }
) {
  return withMcpScope(input, 'distiller', async ({ sb, ctx }) => {
    const rows = await fetchCorridas(sb, ctx.userId, {
      limit: clampLimit(input?.limit),
      estado: input?.estado,
    })
    return {
      count: rows.length,
      corridas: rows.map(c => ({
        id: c.id,
        lote_id: c.lote_id,
        estado: c.estado,
        litros_asignados: c.litros_asignados,
        botellas_producidas: c.botellas_producidas,
        created_at: c.created_at,
      })),
    }
  })
}

export async function listViajesTool(input?: McpScopeInput & { limit?: number }) {
  return withMcpScope(input, 'distiller', async ({ sb, ctx }) => {
    const viajes = await fetchViajes(sb, ctx.userId, { limit: clampLimit(input?.limit) })
    const viajeIds = viajes.map(v => v.id)
    const productos = await fetchProductosViaje(sb, viajeIds)
    return {
      count: viajes.length,
      viajes: viajes.map(v => ({
        id: v.id,
        fecha: v.fecha,
        estado: v.estado,
        palenquero: v.palenquero_nombre,
        productos: productos.filter(p => p.viaje_id === v.id).length,
      })),
    }
  })
}

export async function listLotesDistillerTool(input?: McpScopeInput & { limit?: number }) {
  return withMcpScope(input, 'distiller', async ({ sb, ctx }) => {
    const rows = await fetchLotesForAgent(sb, ctx.userId, {
      limit: clampLimit(input?.limit),
    })
    return {
      count: rows.length,
      lotes: rows.map(l => ({
        id: l.id,
        numero_lote: l.numero_lote,
        tipo_agave: l.tipo_agave,
        litros_disponibles_granel: l.litros_disponibles_granel,
        estado: l.estado,
        fecha_recepcion: l.fecha_recepcion,
      })),
    }
  })
}
