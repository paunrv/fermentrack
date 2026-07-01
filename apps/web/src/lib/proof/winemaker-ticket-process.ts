import type { SupabaseClient } from '@supabase/supabase-js'
import type { WmTicketLineVision, WmTicketVisionResult } from '@/lib/proof/winemaker-ticket-vision'
import type { WmTicketVisionStatus } from '@/lib/proof/winemaker-ticket-vision'
import type { WmDocumentLineRow, WmDocumentRow, WmSupplierRow } from '@/lib/proof/winemaker-types'
import { formatSupplyLineLabel } from '@/lib/proof/wm-supply-taxonomy'
import { normalizeSupplierName } from '@/lib/proof/wm-supply-taxonomy'
import {
  createWmDocument,
  findOrCreateWmSupplier,
  insertWmDocumentLines,
  recordWmEvent,
} from '@/lib/supabase/winemaker'

export type ProcessTicketUploadResult = {
  document: WmDocumentRow
  supplier: WmSupplierRow | null
  lines: WmDocumentLineRow[]
  summaryLabel: string
}

export function summarizeTicketLines(lines: WmTicketLineVision[]): string {
  if (lines.length === 0) return 'Insumo sin clasificar'
  const parts = lines.slice(0, 4).map(l => {
    const base = formatSupplyLineLabel(l.supply_kind, l.varietal)
    if (l.quantity != null && l.quantity > 0) {
      const u = l.unit ? ` ${l.unit}` : ''
      return `${base} (${l.quantity.toLocaleString('es-MX')}${u})`
    }
    return base
  })
  const extra = lines.length > 4 ? ` +${lines.length - 4}` : ''
  return parts.join(', ') + extra
}

export async function processTicketUpload(
  sb: SupabaseClient,
  input: {
    organizationId: string
    documentId: string
    documentType: WmDocumentRow['document_type']
    storagePath: string
    filename: string
    vision: WmTicketVisionResult | null
    visionStatus: WmTicketVisionStatus
    visionError?: string
    wineryName?: string | null
    ocrText?: string
    documentDate?: string
  }
): Promise<ProcessTicketUploadResult> {
  const { organizationId } = input
  const vision = input.vision
  let supplierName = vision?.supplier_name?.trim() ?? ''
  if (
    supplierName &&
    input.wineryName?.trim() &&
    normalizeSupplierName(supplierName) === normalizeSupplierName(input.wineryName)
  ) {
    supplierName = ''
  }
  const supplier = supplierName
    ? await findOrCreateWmSupplier(sb, organizationId, supplierName, {
        rfc: vision?.supplier_rfc,
        email: vision?.supplier_email,
        address: vision?.supplier_address,
      })
    : null

  const lines = vision?.lines?.length
    ? vision.lines
    : [
        {
          supply_kind: 'otro' as const,
          varietal: '',
          product_service_code: '',
          product_service_label: '',
          description: input.filename,
          quantity: null,
          unit: '',
          unit_price: null,
          discount: 0,
          tax_note: '',
          amount: vision?.total ?? 0,
        },
      ]

  const documentDate =
    input.documentDate ??
    (vision?.document_date && /^\d{4}-\d{2}-\d{2}$/.test(vision.document_date)
      ? vision.document_date
      : new Date().toISOString().slice(0, 10))

  const doc = await createWmDocument(sb, organizationId, {
    id: input.documentId,
    document_type: input.documentType,
    storage_path: input.storagePath,
    original_filename: input.filename,
    vendor: supplier?.name ?? supplierName,
    supplier_id: supplier?.id ?? null,
    folio: vision?.folio ?? '',
    issuer_address: vision?.supplier_address ?? '',
    payment_method: vision?.payment_method ?? '',
    payment_form: vision?.payment_form ?? '',
    concept_title: vision?.concept_title ?? '',
    subtotal: vision?.subtotal ?? null,
    tax_iva: vision?.tax_iva ?? 0,
    tax_iva_rate: vision?.tax_iva_rate ?? '',
    tax_iesps: vision?.tax_iesps ?? 0,
    tax_isr_ret: vision?.tax_isr_ret ?? 0,
    tax_iva_ret: vision?.tax_iva_ret ?? 0,
    total_amount: vision?.total ?? null,
    currency: vision?.currency ?? 'MXN',
    ocr_text: input.ocrText ?? vision?.description ?? '',
    parsed_json: vision
      ? {
          ...vision,
          source: 'vision_v3_cfdi',
          vision_status: input.visionStatus,
          ...(input.visionError ? { vision_error: input.visionError } : {}),
          supplier_id: supplier?.id ?? null,
        }
      : {
          source: 'upload_only',
          vision_status: input.visionStatus,
          ...(input.visionError ? { vision_error: input.visionError } : {}),
        },
    document_date: documentDate,
  })

  const insertedLines = await insertWmDocumentLines(
    sb,
    organizationId,
    doc.id,
    lines.map((line, index) => ({
      supplier_id: supplier?.id ?? null,
      supply_kind: line.supply_kind,
      varietal: line.varietal,
      product_service_code: line.product_service_code,
      product_service_label: line.product_service_label,
      description: line.description,
      quantity: line.quantity,
      unit: line.unit,
      unit_price: line.unit_price,
      discount: line.discount,
      tax_note: line.tax_note,
      amount: line.amount,
      line_index: index,
    }))
  )

  await recordWmEvent(sb, organizationId, {
    event_type: 'document_uploaded',
    document_id: doc.id,
    payload: {
      filename: input.filename,
      folio: vision?.folio ?? null,
      supplier_id: supplier?.id ?? null,
      supplier_name: supplier?.name ?? supplierName,
      total: vision?.total ?? null,
      lines: insertedLines.map(l => ({
        supply_kind: l.supply_kind,
        varietal: l.varietal,
        product_service_code: l.product_service_code,
        quantity: l.quantity,
        amount: l.amount,
      })),
    },
  })

  return {
    document: { ...doc, supplier_id: supplier?.id ?? null, wm_document_lines: insertedLines },
    supplier,
    lines: insertedLines,
    summaryLabel: summarizeTicketLines(lines),
  }
}
