import type { WmSupplyKind } from '@/lib/proof/wm-supply-taxonomy'

export type WmWineLotStatus =
  | 'fermentation'
  | 'aging'
  | 'ready'
  | 'bottling'
  | 'bottled'
  | 'sold_out'
  | 'archived'

export type WmDocumentType =
  | 'invoice'
  | 'ticket'
  | 'xml'
  | 'lab_result'
  | 'photo'
  | 'remision'
  | 'other'

export type WmCostCategory =
  | 'uva'
  | 'mano_obra'
  | 'energia'
  | 'insumo'
  | 'barrica'
  | 'analisis'
  | 'equipo'
  | 'limpieza'
  | 'flete'
  | 'otro'

export type WmAllocationMethod = 'direct' | 'overhead' | 'inventory_purchase'

export type WmEventType =
  | 'harvest_received'
  | 'fermentation_started'
  | 'fermentation_ended'
  | 'lab_sample_taken'
  | 'sulfite_added'
  | 'transfer'
  | 'aging_started'
  | 'aging_ended'
  | 'blending'
  | 'bottling_completed'
  | 'insumo_received'
  | 'insumo_consumed'
  | 'cost_recorded'
  | 'document_uploaded'
  | 'note'

export type WmWineLotRow = {
  id: string
  organization_id: string
  lot_code: string
  name: string
  varietal: string
  status: WmWineLotStatus
  vintage: number | null
  liters_initial: number | null
  notes: string
  created_at: string
  updated_at: string
}

export type WmSupplierRow = {
  id: string
  organization_id: string
  name: string
  name_normalized: string
  rfc: string
  address: string
  contact_name: string
  phone: string
  email: string
  notes: string
  created_at: string
  updated_at: string
}

export type WmDocumentLineRow = {
  id: string
  organization_id: string
  document_id: string
  supplier_id: string | null
  supply_kind: WmSupplyKind
  varietal: string
  product_service_code: string
  product_service_label: string
  description: string
  quantity: number | null
  unit: string
  unit_price: number | null
  discount: number
  tax_note: string
  amount: number
  line_index: number
  created_at: string
}

export type WmDocumentRow = {
  id: string
  organization_id: string
  document_type: WmDocumentType
  storage_path: string | null
  original_filename: string
  vendor: string
  supplier_id: string | null
  folio: string
  issuer_address: string
  payment_method: string
  payment_form: string
  concept_title: string
  subtotal: number | null
  tax_iva: number
  tax_iva_rate: string
  tax_iesps: number
  tax_isr_ret: number
  tax_iva_ret: number
  total_amount: number | null
  currency: string
  ocr_text: string
  parsed_json: Record<string, unknown>
  document_date: string
  created_at: string
  wm_document_lines?: WmDocumentLineRow[]
}

export type WmProductionCostRow = {
  id: string
  organization_id: string
  lot_id: string | null
  document_id: string | null
  supplier_id: string | null
  supply_kind: WmSupplyKind | null
  varietal: string
  category: WmCostCategory
  allocation_method: WmAllocationMethod
  description: string
  amount: number
  currency: string
  cost_date: string
  created_at: string
}

export const WM_LOT_STATUS_LABEL: Record<WmWineLotStatus, string> = {
  fermentation: 'Fermentación',
  aging: 'Envejecimiento',
  ready: 'Listo',
  bottling: 'Embotellado',
  bottled: 'Embotellado',
  sold_out: 'Agotado',
  archived: 'Archivado',
}
