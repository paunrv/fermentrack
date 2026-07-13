import type { SupabaseClient } from '@supabase/supabase-js'
import type { WinemakerEtapaKey } from '@/lib/proof/winemaker-etapa'
import type { WmDocumentRow } from '@/lib/proof/winemaker-types'
import { createWmDocument, recordWmEvent } from '@/lib/supabase/winemaker'

export type WinemakerCaptureKind = 'whiteboard' | 'lab' | 'bodega'

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/** Prefer an explicit calendar day; fall back to today (UTC date slice). */
export function resolveCaptureDocumentDate(documentDate?: string | null): string {
  const trimmed = documentDate?.trim()
  if (trimmed && ISO_DATE_RE.test(trimmed)) return trimmed
  return new Date().toISOString().slice(0, 10)
}

export async function processWinemakerCaptureUpload(
  sb: SupabaseClient,
  input: {
    organizationId: string
    documentId: string
    captureKind: WinemakerCaptureKind
    etapa: WinemakerEtapaKey
    storagePath: string
    filename: string
    contentType: string
    /** Calendar day `YYYY-MM-DD` (agenda selected date). Defaults to today. */
    documentDate?: string | null
  }
): Promise<WmDocumentRow> {
  const documentType =
    input.captureKind === 'lab' ? ('lab_result' as const) : ('photo' as const)
  const documentDate = resolveCaptureDocumentDate(input.documentDate)

  const doc = await createWmDocument(sb, input.organizationId, {
    id: input.documentId,
    document_type: documentType,
    storage_path: input.storagePath,
    original_filename: input.filename,
    concept_title:
      input.captureKind === 'whiteboard'
        ? `Pizarrón · ${input.etapa}`
        : input.captureKind === 'lab'
          ? 'Análisis de laboratorio'
          : `Bodega · ${input.etapa}`,
    ocr_text: '',
    parsed_json: {
      source: input.captureKind,
      etapa: input.etapa,
      content_type: input.contentType,
      uploaded_at: new Date().toISOString(),
    },
    document_date: documentDate,
  })

  await recordWmEvent(sb, input.organizationId, {
    event_type: 'document_uploaded',
    document_id: doc.id,
    payload: {
      capture_kind: input.captureKind,
      etapa: input.etapa,
      filename: input.filename,
    },
  })

  return doc
}
