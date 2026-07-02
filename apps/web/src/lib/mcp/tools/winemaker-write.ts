import { randomUUID } from 'crypto'
import { processTicketUpload } from '@/lib/proof/winemaker-ticket-process'
import type { WmTicketVisionResult } from '@/lib/proof/winemaker-ticket-vision'
import type { WmDocumentType } from '@/lib/proof/winemaker-types'
import { winemakerTicketImportSchema } from '@/lib/mcp/schemas/winemaker-ticket'
import type { McpWriteInput } from '@/lib/mcp/write-helpers'
import { withMcpWriteScope } from '@/lib/mcp/write-helpers'

export async function importWinemakerTicketTool(
  input: McpWriteInput & { ticket: unknown; winery_name?: string | null }
) {
  const parsed = winemakerTicketImportSchema.safeParse(input.ticket)
  if (!parsed.success) {
    throw new Error(
      `Invalid ticket extraction JSON: ${parsed.error.issues.map(i => i.message).join('; ')}`
    )
  }
  const ticket = parsed.data

  return withMcpWriteScope('import_winemaker_ticket', input, 'winemaker', async ({ sb, scope }) => {
    const organizationId = scope.organizationId!
    const documentId = randomUUID()
    const vision = ticket.extraction as WmTicketVisionResult

    const result = await processTicketUpload(sb, {
      organizationId,
      documentId,
      documentType: ticket.document_type as WmDocumentType,
      storagePath: `mcp-import/${organizationId}/${documentId}.json`,
      filename: ticket.filename,
      vision,
      visionStatus: 'ok',
      wineryName: input.winery_name ?? null,
      documentDate: vision.document_date,
      ocrText: vision.description,
    })

    return {
      ok: true,
      document_id: result.document.id,
      vendor: result.document.vendor,
      folio: result.document.folio,
      total_amount: result.document.total_amount,
      lines: result.lines.length,
      summary: result.summaryLabel,
    }
  })
}
