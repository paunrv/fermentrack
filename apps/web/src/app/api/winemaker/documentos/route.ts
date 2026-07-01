import { NextRequest } from 'next/server'
import { randomUUID } from 'crypto'
import { requireClerkUserId } from '@/lib/proof/auth-api'
import {
  inferWmDocumentType,
  uploadWinemakerDocument,
} from '@/lib/proof/storage-winemaker-documents'
import { processTicketUpload } from '@/lib/proof/winemaker-ticket-process'
import { getWinemakerTicketCopy } from '@/lib/i18n/winemaker-ticket-copy-server'
import {
  analyzeWinemakerTicketImage,
  isTicketImageContentType,
  isTicketVisionClassified,
  resolveTicketContentType,
  type WmTicketVisionStatus,
} from '@/lib/proof/winemaker-ticket-vision'
import { buildTicketUploadMessage } from '@/lib/proof/winemaker-ticket-copy'
import { createSupabaseForProofApi } from '@/utils/supabase/server-api'
import { fetchActiveProfile } from '@/lib/supabase'
import { fetchWinemakerOrganizationIdForUser } from '@/lib/supabase/organization'

export const runtime = 'nodejs'
export const maxDuration = 60
export const dynamic = 'force-dynamic'

const MAX_BYTES = 12 * 1024 * 1024

function fileToBase64(buffer: ArrayBuffer): string {
  return Buffer.from(buffer).toString('base64')
}

function isUploadClassified(
  supplierId: string | null,
  lines: { supply_kind: string; varietal?: string }[]
): boolean {
  if (supplierId) return true
  return lines.some(l => l.supply_kind !== 'otro' || Boolean(l.varietal?.trim()))
}

export async function POST(req: NextRequest) {
  const clerkId = await requireClerkUserId()
  if (!clerkId) {
    return Response.json({ error: 'No autenticado' }, { status: 401 })
  }

  const form = await req.formData()
  const file = form.get('file')
  if (!(file instanceof File)) {
    return Response.json({ error: 'Archivo requerido (campo file)' }, { status: 400 })
  }

  if (file.size > MAX_BYTES) {
    return Response.json({ error: 'El archivo supera 12 MB' }, { status: 400 })
  }

  const documentId = randomUUID()
  const contentType = resolveTicketContentType(file.name, file.type)
  const documentType = inferWmDocumentType(contentType, file.name)

  try {
    const { sb } = await createSupabaseForProofApi()
    const preferredOrgId = form.get('organizationId')
    const organizationId = await fetchWinemakerOrganizationIdForUser(
      sb,
      clerkId,
      typeof preferredOrgId === 'string' ? preferredOrgId : null
    )
    if (!organizationId) {
      return Response.json({ error: 'Organización winemaker no encontrada' }, { status: 403 })
    }
    const profile = await fetchActiveProfile(sb, clerkId, 'winemaker').catch(() => null)
    const wineryName = profile?.username?.trim() || null
    const buffer = await file.arrayBuffer()

    const storagePath = await uploadWinemakerDocument(sb, organizationId, documentId, file, {
      contentType,
      filename: file.name,
    })

    let visionStatus: WmTicketVisionStatus
    let visionError: string | undefined
    let vision = null
    let ocrText = ''

    if (isTicketImageContentType(contentType)) {
      const attempt = await analyzeWinemakerTicketImage(
        fileToBase64(buffer),
        contentType,
        wineryName
      )
      visionStatus = attempt.status
      visionError = attempt.error
      vision = attempt.result
      if (vision) ocrText = vision.description || ''
      console.log('[winemaker/documentos] vision', {
        filename: file.name,
        contentType,
        status: visionStatus,
        lines: vision?.lines.length ?? 0,
        supplier: vision?.supplier_name ?? null,
      })
    } else if (contentType === 'application/pdf') {
      visionStatus = 'skipped_pdf'
    } else {
      visionStatus = 'skipped_not_image'
    }

    const result = await processTicketUpload(sb, {
      organizationId,
      documentId,
      documentType,
      storagePath,
      filename: file.name,
      vision,
      visionStatus,
      visionError,
      wineryName,
      ocrText,
      documentDate:
        vision?.document_date && /^\d{4}-\d{2}-\d{2}$/.test(vision.document_date)
          ? vision.document_date
          : undefined,
    })

    const total =
      vision?.total != null && vision.total > 0
        ? ` Total: $${vision.total.toLocaleString('es-MX')} ${vision.currency || 'MXN'}.`
        : ''

    const classified =
      visionStatus === 'ok' &&
      (isTicketVisionClassified(vision, result.supplier?.id ?? null) ||
        isUploadClassified(result.supplier?.id ?? null, result.lines))

    const ticketCopy = await getWinemakerTicketCopy()

    const { mensaje, agentQuery, suggestedReplies } = buildTicketUploadMessage(
      {
        filename: file.name,
        contentType,
        visionStatus,
        classified,
        supplierName: result.supplier?.name ?? vision?.supplier_name ?? null,
        summaryLabel: result.summaryLabel,
        total,
      },
      ticketCopy
    )

    return Response.json({
      documentId: result.document.id,
      document: result.document,
      supplier: result.supplier,
      lines: result.lines,
      parsed: vision,
      visionStatus,
      classified,
      mensaje,
      agentQuery,
      suggestedReplies,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error al guardar documento'
    console.error('[winemaker/documentos]', msg, e)
    return Response.json({ error: msg }, { status: 500 })
  }
}
