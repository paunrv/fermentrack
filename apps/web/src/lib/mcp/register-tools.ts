import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import {
  getCreditoResumenTool,
  getInventorySummaryTool,
  listOrdenesCompraTool,
  listPedidosTool,
  listSkusTool,
} from '@/lib/mcp/tools/distributor'
import {
  listCorridasTool,
  listLotesDistillerTool,
  listViajesTool,
} from '@/lib/mcp/tools/distiller'
import { getSessionSnapshotTool } from '@/lib/mcp/tools/session'
import {
  getResumenBodegaTool,
  listDocumentosTool,
  listEtiquetasTool,
  listLotesTool,
  listMensajesTool,
} from '@/lib/mcp/tools/winemaker'

const profileTypeSchema = z.enum(['distributor', 'winemaker', 'distiller']).optional()
const organizationIdSchema = z.string().uuid().optional()

const scopeFields = {
  profile_type: profileTypeSchema,
  organization_id: organizationIdSchema,
}

import { registerProofMcpWriteTools } from '@/lib/mcp/register-write-tools'

export function registerProofMcpTools(server: McpServer): void {
  server.registerTool(
    'get_session_snapshot',
    {
      title: 'Session snapshot',
      description:
        'Active profile, winemaker org memberships, and JSON schemas for pedidos/recepciones/tickets.',
      inputSchema: scopeFields,
    },
    async input => getSessionSnapshotTool(input)
  )

  server.registerTool(
    'list_skus',
    {
      title: 'List SKUs',
      description:
        'Read-only distributor SKUs (stock, status, price). Requires distributor profile.',
      inputSchema: {
        ...scopeFields,
        limit: z.number().int().min(1).max(200).optional(),
      },
    },
    async ({ limit, ...scope }) => listSkusTool({ ...scope, limit })
  )

  server.registerTool(
    'get_inventory_summary',
    {
      title: 'Inventory summary',
      description: 'Distributor inventory KPIs and critical-stock SKUs.',
      inputSchema: scopeFields,
    },
    async input => getInventorySummaryTool(input)
  )

  server.registerTool(
    'list_pedidos',
    {
      title: 'List sales orders',
      description: 'Distributor pedidos with client name.',
      inputSchema: {
        ...scopeFields,
        limit: z.number().int().min(1).max(200).optional(),
        estado: z.string().optional(),
      },
    },
    async input => listPedidosTool(input)
  )

  server.registerTool(
    'get_credito_resumen',
    {
      title: 'Accounts receivable summary',
      description: 'Distributor CxC totals (por cobrar, vencidos, cobrado este mes).',
      inputSchema: scopeFields,
    },
    async input => getCreditoResumenTool(input)
  )

  server.registerTool(
    'list_ordenes_compra',
    {
      title: 'List purchase orders',
      description: 'Pending distributor purchase orders (OC).',
      inputSchema: scopeFields,
    },
    async input => listOrdenesCompraTool(input)
  )

  server.registerTool(
    'list_lotes',
    {
      title: 'List wine lots',
      description:
        'Active winery lots with pipeline etapa, dias_sin_registro, and attention flags (public.lots).',
      inputSchema: {
        ...scopeFields,
        limit: z.number().int().min(1).max(200).optional(),
      },
    },
    async input => listLotesTool(input)
  )

  server.registerTool(
    'list_documentos',
    {
      title: 'List documents',
      description: 'Winemaker tickets/invoices for the active organization.',
      inputSchema: {
        ...scopeFields,
        limit: z.number().int().min(1).max(200).optional(),
        with_lines: z.boolean().optional(),
      },
    },
    async input => listDocumentosTool(input)
  )

  server.registerTool(
    'get_resumen_bodega',
    {
      title: 'Winery summary',
      description:
        'Winemaker bodega KPIs plus pipeline salud, conteo_por_etapa, and lotes_requieren_atencion.',
      inputSchema: scopeFields,
    },
    async input => getResumenBodegaTool(input)
  )

  server.registerTool(
    'list_etiquetas',
    {
      title: 'List finished-goods labels',
      description:
        'Winemaker cellar inventory grouped by etiqueta with producidas/consumidas/disponibles per existencia.',
      inputSchema: {
        ...scopeFields,
        anada: z.number().int().min(1900).max(2100).optional(),
        formato: z.string().min(1).optional(),
        etiqueta_id: z.string().uuid().optional(),
      },
    },
    async input => listEtiquetasTool(input)
  )

  server.registerTool(
    'list_mensajes',
    {
      title: 'List team chat messages',
      description:
        'Winemaker org chat messages. Filter by lote_id or since timestamp. Requires Pro+ chat feature.',
      inputSchema: {
        ...scopeFields,
        lote_id: z.string().uuid().optional(),
        desde: z.string().datetime().optional(),
        limit: z.number().int().min(1).max(200).optional(),
      },
    },
    async input => listMensajesTool(input)
  )

  server.registerTool(
    'list_corridas',
    {
      title: 'List bottling runs',
      description: 'Distiller bottling corridas.',
      inputSchema: {
        ...scopeFields,
        limit: z.number().int().min(1).max(200).optional(),
        estado: z.enum(['activa', 'completada']).optional(),
      },
    },
    async input => listCorridasTool(input)
  )

  server.registerTool(
    'list_viajes',
    {
      title: 'List agave trips',
      description: 'Distiller viajes (compras de agave).',
      inputSchema: {
        ...scopeFields,
        limit: z.number().int().min(1).max(200).optional(),
      },
    },
    async input => listViajesTool(input)
  )

  server.registerTool(
    'list_lotes_distiller',
    {
      title: 'List distiller lots',
      description: 'Distiller production lots (mezcal).',
      inputSchema: {
        ...scopeFields,
        limit: z.number().int().min(1).max(200).optional(),
      },
    },
    async input => listLotesDistillerTool(input)
  )

  registerProofMcpWriteTools(server)
}
