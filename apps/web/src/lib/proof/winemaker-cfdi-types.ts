import type { WmSupplyKind } from '@/lib/proof/wm-supply-taxonomy'

/** Línea de factura CFDI extraída por visión PROOF. */
export type WmCfdiLineVision = {
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
}

/** Factura / ticket CFDI completo para persistir en wm_documents + líneas. */
export type WmCfdiVisionResult = {
  supplier_name: string
  supplier_rfc: string
  supplier_address: string
  supplier_email: string
  folio: string
  document_date: string
  payment_method: string
  payment_form: string
  concept_title: string
  subtotal: number | null
  tax_iva: number
  tax_iva_rate: string
  tax_iesps: number
  tax_isr_ret: number
  tax_iva_ret: number
  total: number | null
  currency: string
  description: string
  lines: WmCfdiLineVision[]
}

export function formatCfdiFolioLabel(folio: string, vendor: string): string {
  const f = folio.trim()
  const v = vendor.trim()
  if (f && v) return `${v} · Folio ${f}`
  return v || (f ? `Folio ${f}` : 'Factura')
}
