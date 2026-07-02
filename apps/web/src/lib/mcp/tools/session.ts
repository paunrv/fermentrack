import type { McpScopeInput } from '@/lib/mcp/resolve-scope'
import { resolveMcpScope } from '@/lib/mcp/resolve-scope'
import { createMcpSupabase, mcpJsonResult, requireMcpContext } from '@/lib/mcp/tool-helpers'

/** Org/profile snapshot for MCP clients (replaces static resource in Phase 1). */
export async function getSessionSnapshotTool(input?: McpScopeInput) {
  const ctx = requireMcpContext()
  const sb = createMcpSupabase(ctx.accessToken)
  const scope = await resolveMcpScope(sb, ctx.userId, input)

  return mcpJsonResult({
    user_id: ctx.userId,
    profile_type: scope.profileType,
    organization_id: scope.organizationId,
    available_profiles: scope.availableProfiles,
    winemaker_organizations: scope.winemakerOrganizations,
    schemas: {
      pedido: {
        id: 'uuid',
        numero: 'string',
        estado: 'borrador | confirmado | preparando | en_ruta | entregado | cancelado',
        total: 'number',
        fecha_entrega: 'date | null',
      },
      recepcion: {
        orden_compra_id: 'uuid',
        items: [{ sku_id: 'uuid', cantidad_recibida: 'number' }],
      },
      ticket: {
        document_type: 'invoice | receipt | expense',
        vendor: 'string',
        document_date: 'date',
        total_amount: 'number',
        currency: 'MXN',
      },
    },
  })
}
