import type {
  WmDocumentRow,
  WmProductionCostRow,
  WmSupplierRow,
  WmWineLotRow,
} from '@/lib/proof/winemaker-types'
import { lineSummaryFromDocumentLines } from '@/lib/proof/winemaker-document-summary'
import { formatSupplyLineLabel } from '@/lib/proof/wm-supply-taxonomy'
import type { WinemakerSummary } from '@/lib/supabase/winemaker'

export type WinemakerAgentContext = {
  perfil: 'winemaker'
  query?: string
  selectedLotId?: string | null
  selectedDocumentId?: string | null
  uploadedDocument?: {
    id: string
    supplier_id: string | null
    vendor: string
    document_type: string
    document_date: string
    original_filename: string
    vision_status: string
    folio: string
    supplier_email: string
    concept_title: string
    payment_method: string
    total: number | null
    subtotal: number | null
    tax_iva: number
    tax_iva_rate: string
    description: string
    lines: {
      supply_kind: string
      supply_label: string
      varietal: string
      description: string
      product_service_code: string
      quantity: number | null
      unit: string
      unit_price: number | null
      amount: number
    }[]
  } | null
  proveedores: {
    id: string
    name: string
    email: string
    insumos: string[]
  }[]
  resumen: WinemakerSummary & {
    porEstado: { status: string; count: number }[]
  }
  lotes: {
    id: string
    lot_code: string
    name: string
    varietal: string
    status: string
    liters_initial: number | null
    vintage: number | null
  }[]
  documentosRecientes: {
    id: string
    document_type: string
    vendor: string
    document_date: string
    original_filename: string
    folio: string
    concept_title: string
    payment_method: string
    total_amount: number | null
    tax_iva: number
    tax_iva_rate: string
    supplier_email: string
    line_summary: string
    first_line_description: string
    line_count: number
    classified: boolean
  }[]
  gastosRecientes: {
    id: string
    category: string
    description: string
    amount: number
    lot_id: string | null
    cost_date: string
    created_at: string
  }[]
}

function docIsClassified(doc: WmDocumentRow): boolean {
  const lines = doc.wm_document_lines ?? []
  if (doc.supplier_id) return true
  return lines.some(l => l.supply_kind !== 'otro' || Boolean(l.varietal?.trim()))
}

function mapDocumentoReciente(doc: WmDocumentRow, suppliers: WmSupplierRow[]) {
  const lines = doc.wm_document_lines ?? []
  const parsed = doc.parsed_json as Record<string, unknown> | undefined
  const supplier = doc.supplier_id
    ? suppliers.find(s => s.id === doc.supplier_id)
    : null
  const firstLine = lines[0]

  return {
    id: doc.id,
    document_type: doc.document_type,
    vendor: doc.vendor,
    document_date: doc.document_date,
    original_filename: doc.original_filename,
    folio: doc.folio || String(parsed?.folio ?? ''),
    concept_title: doc.concept_title || String(parsed?.concept_title ?? ''),
    payment_method: doc.payment_method || String(parsed?.payment_method ?? ''),
    total_amount:
      doc.total_amount != null
        ? Number(doc.total_amount)
        : parsed?.total != null
          ? Number(parsed.total)
          : null,
    tax_iva: doc.tax_iva != null ? Number(doc.tax_iva) : Number(parsed?.tax_iva ?? 0),
    tax_iva_rate: doc.tax_iva_rate || String(parsed?.tax_iva_rate ?? ''),
    supplier_email:
      supplier?.email || String(parsed?.supplier_email ?? ''),
    line_summary: lineSummaryFromDocumentLines(lines),
    first_line_description: firstLine?.description || firstLine?.product_service_label || '',
    line_count: lines.length,
    classified: docIsClassified(doc),
  }
}

function insumosPorProveedor(
  suppliers: WmSupplierRow[],
  documents: WmDocumentRow[]
): WinemakerAgentContext['proveedores'] {
  const kindsBySupplier = new Map<string, Set<string>>()

  for (const doc of documents) {
    for (const line of doc.wm_document_lines ?? []) {
      const sid = line.supplier_id ?? doc.supplier_id
      if (!sid) continue
      const set = kindsBySupplier.get(sid) ?? new Set()
      set.add(formatSupplyLineLabel(line.supply_kind, line.varietal))
      kindsBySupplier.set(sid, set)
    }
  }

  return suppliers.slice(0, 40).map(s => ({
    id: s.id,
    name: s.name,
    email: s.email,
    insumos: [...(kindsBySupplier.get(s.id) ?? [])],
  }))
}

export function buildWinemakerAgentContext(
  lotes: WmWineLotRow[],
  documents: WmDocumentRow[],
  costs: WmProductionCostRow[],
  suppliers: WmSupplierRow[],
  summary: WinemakerSummary,
  opts?: { selectedId?: string | null; selectedDocumentId?: string | null; query?: string | null }
): WinemakerAgentContext {
  const porEstadoMap = new Map<string, number>()
  for (const l of lotes) {
    porEstadoMap.set(l.status, (porEstadoMap.get(l.status) ?? 0) + 1)
  }

  const selectedDoc = opts?.selectedDocumentId
    ? documents.find(d => d.id === opts.selectedDocumentId)
    : null
  const parsed = selectedDoc?.parsed_json as Record<string, unknown> | undefined
  const docLines = selectedDoc?.wm_document_lines ?? []
  const visionStatus = String(parsed?.vision_status ?? '')
  const selectedSupplier = selectedDoc?.supplier_id
    ? suppliers.find(s => s.id === selectedDoc.supplier_id)
    : null

  const uploadedDocument = selectedDoc
    ? {
        id: selectedDoc.id,
        supplier_id: selectedDoc.supplier_id,
        vendor: selectedDoc.vendor,
        document_type: selectedDoc.document_type,
        document_date: selectedDoc.document_date,
        original_filename: selectedDoc.original_filename,
        vision_status: visionStatus,
        folio: selectedDoc.folio || String(parsed?.folio ?? ''),
        supplier_email:
          selectedSupplier?.email || String(parsed?.supplier_email ?? ''),
        concept_title: selectedDoc.concept_title || String(parsed?.concept_title ?? ''),
        payment_method: selectedDoc.payment_method || String(parsed?.payment_method ?? ''),
        total:
          selectedDoc.total_amount != null
            ? Number(selectedDoc.total_amount)
            : parsed?.total != null
              ? Number(parsed.total)
              : null,
        subtotal:
          selectedDoc.subtotal != null
            ? Number(selectedDoc.subtotal)
            : parsed?.subtotal != null
              ? Number(parsed.subtotal)
              : null,
        tax_iva: selectedDoc.tax_iva != null ? Number(selectedDoc.tax_iva) : 0,
        tax_iva_rate: selectedDoc.tax_iva_rate || String(parsed?.tax_iva_rate ?? ''),
        description: selectedDoc.ocr_text || String(parsed?.description ?? ''),
        lines: docLines.map(l => ({
          supply_kind: l.supply_kind,
          supply_label: formatSupplyLineLabel(l.supply_kind, l.varietal),
          varietal: l.varietal,
          description: l.description,
          product_service_code: l.product_service_code,
          quantity: l.quantity != null ? Number(l.quantity) : null,
          unit: l.unit,
          unit_price: l.unit_price != null ? Number(l.unit_price) : null,
          amount: Number(l.amount),
        })),
      }
    : null

  return {
    perfil: 'winemaker',
    query: opts?.query ?? undefined,
    selectedLotId: opts?.selectedId ?? null,
    selectedDocumentId: opts?.selectedDocumentId ?? null,
    uploadedDocument,
    proveedores: insumosPorProveedor(suppliers, documents),
    resumen: {
      ...summary,
      porEstado: [...porEstadoMap.entries()].map(([status, count]) => ({ status, count })),
    },
    lotes: lotes.slice(0, 40).map(l => ({
      id: l.id,
      lot_code: l.lot_code,
      name: l.name,
      varietal: l.varietal,
      status: l.status,
      liters_initial: l.liters_initial != null ? Number(l.liters_initial) : null,
      vintage: l.vintage,
    })),
    documentosRecientes: documents.slice(0, 20).map(d => mapDocumentoReciente(d, suppliers)),
    gastosRecientes: costs.slice(0, 20).map(c => ({
      id: c.id,
      category: c.category,
      description: c.description,
      amount: Number(c.amount),
      lot_id: c.lot_id,
      cost_date: c.cost_date,
      created_at: c.created_at,
    })),
  }
}
