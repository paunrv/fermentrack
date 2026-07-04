import { buildWinemakerAgentContext } from '@/lib/proof/winemaker-agent-context'
import { formatEtiquetasForMcp } from '@/lib/mcp/finished-goods-mcp'
import { loadWinemakerPipelineMcpContext } from '@/lib/mcp/winemaker-pipeline-context'
import {
  fetchFinishedGoodsInventory,
  filterFinishedGoodsInventory,
} from '@/lib/proof/finished-goods-inventory'
import { fetchTeamChatMessages } from '@/lib/proof/team-chat'
import { fetchOrgFeatureSource, orgHasFeature } from '@/lib/proof/org-features'
import { formatMensajesForMcp } from '@/lib/mcp/team-chat-mcp'
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
    const { lotes, pipeline } = await loadWinemakerPipelineMcpContext(sb, orgId)
    const limit = clampLimit(input?.limit)
    const sliced = lotes.slice(0, limit)

    return {
      organization_id: orgId,
      count: sliced.length,
      salud: pipeline.salud,
      lotes: sliced,
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
    const [summary, pipelineCtx, wmLots, documents, costs, suppliers] = await Promise.all([
      fetchWinemakerSummary(sb, orgId),
      loadWinemakerPipelineMcpContext(sb, orgId),
      fetchWineLots(sb, orgId, { limit: 500 }),
      fetchDocuments(sb, orgId, { limit: 500 }),
      fetchProductionCosts(sb, orgId, { limit: 500 }),
      fetchSuppliers(sb, orgId, { limit: 500 }),
    ])

    const agentCtx = buildWinemakerAgentContext(
      wmLots,
      documents,
      costs,
      suppliers,
      summary
    )

    return {
      organization_id: orgId,
      resumen: agentCtx.resumen,
      summary,
      pipeline: pipelineCtx.pipeline,
      conteo_por_etapa: pipelineCtx.pipeline.conteo_por_etapa,
      salud: pipelineCtx.pipeline.salud,
      lotes_requieren_atencion: pipelineCtx.pipeline.lotes_requieren_atencion,
    }
  })
}

export async function listEtiquetasTool(
  input?: McpScopeInput & {
    anada?: number
    formato?: string
    etiqueta_id?: string
  }
) {
  return withMcpScope(input, 'winemaker', async ({ sb, scope }) => {
    const orgId = scope.organizationId!
    const raw = await fetchFinishedGoodsInventory(sb, orgId)
    const filtered = filterFinishedGoodsInventory(raw, {
      anada: input?.anada,
      formato: input?.formato,
      etiquetaId: input?.etiqueta_id,
    })

    return {
      organization_id: orgId,
      ...formatEtiquetasForMcp(filtered),
    }
  })
}

export async function listMensajesTool(
  input?: McpScopeInput & {
    lote_id?: string
    desde?: string
    limit?: number
  }
) {
  return withMcpScope(input, 'winemaker', async ({ sb, scope }) => {
    const orgId = scope.organizationId!
    const org = await fetchOrgFeatureSource(sb, orgId)
    if (!orgHasFeature(org, 'chat')) {
      throw new Error('chat_not_allowed')
    }

    const filter = input?.lote_id ? { loteId: input.lote_id } : 'channel'
    const messages = await fetchTeamChatMessages(sb, orgId, {
      filter,
      limit: clampLimit(input?.limit, 50),
      since: input?.desde,
    })

    return {
      organization_id: orgId,
      count: messages.length,
      mensajes: formatMensajesForMcp(messages),
    }
  })
}
