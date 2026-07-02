import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { listSkusTool } from '@/lib/mcp/tools/list-skus'

export function registerProofMcpTools(server: McpServer): void {
  server.registerTool(
    'list_skus',
    {
      title: 'List SKUs',
      description:
        'Read-only list of distributor SKUs for the authenticated user (stock, status, price).',
      inputSchema: {
        limit: z.number().int().min(1).max(200).optional(),
      },
    },
    async ({ limit }) => listSkusTool(limit ?? 50)
  )
}
