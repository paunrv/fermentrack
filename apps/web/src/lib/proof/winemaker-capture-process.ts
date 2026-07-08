import type { SupabaseClient } from '@supabase/supabase-js'
import type { WinemakerEtapaKey } from '@/lib/proof/winemaker-etapa'
import type { WmDocumentRow } from '@/lib/proof/winemaker-types'
import { createWmDocument, recordWmEvent } from '@/lib/supabase/winemaker'

export type WinemakerCaptureKind = 'whiteboard' | 'lab' | 'bodega'

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
  }
): Promise<WmDocumentRow> {
  const documentType =
    input.captureKind === 'lab' ? ('lab_result' as const) : ('photo' as const)

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
    document_date: new Date().toISOString().slice(0, 10),
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
