import { buildWinemakerAgentContext } from '@/lib/proof/winemaker-agent-context'
import {
  fetchDocuments,
  fetchProductionCosts,
  fetchSuppliers,
  fetchWineLots,
  fetchWinemakerSummary,
} from '@/lib/supabase/winemaker'
import type { McpScopeInput } from '@/lib/mcp/resolve-scope'
import { withMcpScope } from '@/lib/mcp/tool-helpers'

function clampLimit(limit: number | undefined, fallback = 50): number {
  return Math.max(1, Math.min(limit ?? fallback, 200))
}

export async function listLotesTool(input?: McpScopeInput & { limit?: number }) {
  return withMcpScope(input, 'winemaker', async ({ sb, scope }) => {
    const orgId = scope.organizationId!
    const rows = await fetchWineLots(sb, orgId, { limit: clampLimit(input?.limit) })
    return {
      organization_id: orgId,
      count: rows.length,
      lotes: rows.map(l => ({
        id: l.id,
        code: l.lot_code,
        name: l.name,
        varietal: l.varietal,
        status: l.status,
        liters_initial: l.liters_initial,
        vintage: l.vintage,
      })),
    }
  })
}

export async function listDocumentosTool(
  input?: McpScopeInput & { limit?: number; with_lines?: boolean }
) {
  return withMcpScope(input, 'winemaker', async ({ sb, scope }) => {
    const orgId = scope.organizationId!
    const rows = await fetchDocuments(sb, orgId, {
      limit: clampLimit(input?.limit),
      withLines: input?.with_lines ?? false,
    })
    return {
      organization_id: orgId,
      count: rows.length,
      documentos: rows.map(d => ({
        id: d.id,
        document_type: d.document_type,
        vendor: d.vendor,
        document_date: d.document_date,
        total_amount: d.total_amount,
        currency: d.currency,
        folio: d.folio,
      })),
    }
  })
}

export async function getResumenBodegaTool(input?: McpScopeInput) {
  return withMcpScope(input, 'winemaker', async ({ sb, scope }) => {
    const orgId = scope.organizationId!
    const [summary, lots, documents, costs, suppliers] = await Promise.all([
      fetchWinemakerSummary(sb, orgId),
      fetchWineLots(sb, orgId, { limit: 500 }),
      fetchDocuments(sb, orgId, { limit: 500 }),
      fetchProductionCosts(sb, orgId, { limit: 500 }),
      fetchSuppliers(sb, orgId, { limit: 500 }),
    ])
    const agentCtx = buildWinemakerAgentContext(
      lots,
      documents,
      costs,
      suppliers,
      summary
    )
    return {
      organization_id: orgId,
      resumen: agentCtx.resumen,
      summary,
    }
  })
}
