import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  WmDocumentLineRow,
  WmDocumentRow,
  WmProductionCostRow,
  WmSupplierRow,
  WmWineLotRow,
  WmWineLotStatus,
} from '@/lib/proof/winemaker-types'
import type { WmSupplyKind } from '@/lib/proof/wm-supply-taxonomy'
import {
  formatSupplyLineLabel,
  normalizeSupplierName,
  supplyKindToCostCategory,
} from '@/lib/proof/wm-supply-taxonomy'

export function isWinemakerSchemaMissingError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return (
    msg.includes('does not exist') ||
    msg.includes('PGRST204') ||
    msg.includes('PGRST205') ||
    msg.includes('schema cache') ||
    msg.includes('relation')
  )
}

function num(v: unknown): number {
  return Number(v ?? 0)
}

export async function fetchWineLots(
  sb: SupabaseClient,
  userId: string,
  opts?: { status?: WmWineLotStatus; limit?: number }
): Promise<WmWineLotRow[]> {
  let q = sb
    .from('wm_wine_lots')
    .select('*')
    .eq('clerk_id', userId)
    .order('created_at', { ascending: false })

  if (opts?.status) q = q.eq('status', opts.status)
  if (opts?.limit) q = q.limit(opts.limit)

  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as WmWineLotRow[]
}

export async function countWineLotsByStatus(
  sb: SupabaseClient,
  userId: string
): Promise<Record<WmWineLotStatus, number>> {
  const base: Record<WmWineLotStatus, number> = {
    fermentation: 0,
    aging: 0,
    ready: 0,
    bottling: 0,
    bottled: 0,
    sold_out: 0,
    archived: 0,
  }
  const { data, error } = await sb
    .from('wm_wine_lots')
    .select('status')
    .eq('clerk_id', userId)

  if (error) {
    if (isWinemakerSchemaMissingError(error)) return base
    throw error
  }

  for (const row of data ?? []) {
    const s = row.status as WmWineLotStatus
    if (s in base) base[s] += 1
  }
  return base
}

export async function fetchDocuments(
  sb: SupabaseClient,
  userId: string,
  opts?: { limit?: number; withLines?: boolean }
): Promise<WmDocumentRow[]> {
  const select = opts?.withLines
    ? '*, wm_document_lines(*)'
    : '*'

  let q = sb
    .from('wm_documents')
    .select(select)
    .eq('clerk_id', userId)
    .order('document_date', { ascending: false })

  if (opts?.limit) q = q.limit(opts.limit)

  const { data, error } = await q
  if (error) {
    if (isWinemakerSchemaMissingError(error)) return []
    throw error
  }
  return (data ?? []) as unknown as WmDocumentRow[]
}

export async function fetchSuppliers(
  sb: SupabaseClient,
  userId: string,
  opts?: { limit?: number }
): Promise<WmSupplierRow[]> {
  let q = sb
    .from('wm_suppliers')
    .select('*')
    .eq('clerk_id', userId)
    .order('name', { ascending: true })

  if (opts?.limit) q = q.limit(opts.limit)

  const { data, error } = await q
  if (error) {
    if (isWinemakerSchemaMissingError(error)) return []
    throw error
  }
  return (data ?? []) as WmSupplierRow[]
}

export async function findOrCreateWmSupplier(
  sb: SupabaseClient,
  userId: string,
  name: string,
  meta?: { rfc?: string; email?: string; address?: string }
): Promise<WmSupplierRow> {
  const trimmed = name.trim()
  if (!trimmed) {
    throw new Error('Nombre de proveedor requerido')
  }
  const name_normalized = normalizeSupplierName(trimmed)
  if (!name_normalized) {
    throw new Error('Nombre de proveedor inválido')
  }

  const { data: existing, error: findErr } = await sb
    .from('wm_suppliers')
    .select('*')
    .eq('clerk_id', userId)
    .eq('name_normalized', name_normalized)
    .maybeSingle()

  if (findErr) throw findErr
  if (existing) {
    const patch: Record<string, string> = {}
    if (meta?.rfc?.trim() && !existing.rfc) patch.rfc = meta.rfc.trim()
    if (meta?.email?.trim() && !existing.email) patch.email = meta.email.trim()
    if (meta?.address?.trim() && !existing.address) patch.address = meta.address.trim()
    if (Object.keys(patch).length === 0) return existing as WmSupplierRow
    const { data: updated, error: updErr } = await sb
      .from('wm_suppliers')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select('*')
      .single()
    if (updErr) throw updErr
    return updated as WmSupplierRow
  }

  const { data, error } = await sb
    .from('wm_suppliers')
    .insert({
      clerk_id: userId,
      name: trimmed,
      name_normalized,
      rfc: meta?.rfc?.trim() ?? '',
      email: meta?.email?.trim() ?? '',
      address: meta?.address?.trim() ?? '',
    })
    .select('*')
    .single()

  if (error) throw error
  return data as WmSupplierRow
}

export type InsertWmDocumentLineInput = {
  supplier_id?: string | null
  supply_kind: WmSupplyKind
  varietal?: string
  product_service_code?: string
  product_service_label?: string
  description?: string
  quantity?: number | null
  unit?: string
  unit_price?: number | null
  discount?: number
  tax_note?: string
  amount?: number
  line_index: number
}

export async function insertWmDocumentLines(
  sb: SupabaseClient,
  userId: string,
  documentId: string,
  lines: InsertWmDocumentLineInput[]
): Promise<WmDocumentLineRow[]> {
  if (lines.length === 0) return []

  const rows = lines.map(line => ({
    clerk_id: userId,
    document_id: documentId,
    supplier_id: line.supplier_id ?? null,
    supply_kind: line.supply_kind,
    varietal: line.varietal ?? '',
    product_service_code: line.product_service_code ?? '',
    product_service_label: line.product_service_label ?? '',
    description: line.description ?? '',
    quantity: line.quantity ?? null,
    unit: line.unit ?? '',
    unit_price: line.unit_price ?? null,
    discount: line.discount ?? 0,
    tax_note: line.tax_note ?? '',
    amount: line.amount ?? 0,
    line_index: line.line_index,
  }))

  const { data, error } = await sb.from('wm_document_lines').insert(rows).select('*')
  if (error) throw error
  return (data ?? []) as WmDocumentLineRow[]
}

export async function fetchDocumentLines(
  sb: SupabaseClient,
  userId: string,
  documentId: string
): Promise<WmDocumentLineRow[]> {
  const { data, error } = await sb
    .from('wm_document_lines')
    .select('*')
    .eq('clerk_id', userId)
    .eq('document_id', documentId)
    .order('line_index', { ascending: true })

  if (error) {
    if (isWinemakerSchemaMissingError(error)) return []
    throw error
  }
  return (data ?? []) as WmDocumentLineRow[]
}

export async function fetchProductionCosts(
  sb: SupabaseClient,
  userId: string,
  opts?: { lotId?: string; overheadOnly?: boolean; limit?: number }
): Promise<WmProductionCostRow[]> {
  let q = sb
    .from('wm_production_costs')
    .select('*')
    .eq('clerk_id', userId)
    .order('cost_date', { ascending: false })

  if (opts?.lotId) q = q.eq('lot_id', opts.lotId)
  if (opts?.overheadOnly) q = q.is('lot_id', null)
  if (opts?.limit) q = q.limit(opts.limit)

  const { data, error } = await q
  if (error) {
    if (isWinemakerSchemaMissingError(error)) return []
    throw error
  }
  return (data ?? []) as WmProductionCostRow[]
}

export type CreateWmDocumentInput = {
  id?: string
  document_type: WmDocumentRow['document_type']
  storage_path: string | null
  original_filename: string
  vendor?: string
  supplier_id?: string | null
  folio?: string
  issuer_address?: string
  payment_method?: string
  payment_form?: string
  concept_title?: string
  subtotal?: number | null
  tax_iva?: number
  tax_iva_rate?: string
  tax_iesps?: number
  tax_isr_ret?: number
  tax_iva_ret?: number
  total_amount?: number | null
  currency?: string
  ocr_text?: string
  parsed_json?: Record<string, unknown>
  document_date?: string
}

export async function createWmDocument(
  sb: SupabaseClient,
  userId: string,
  input: CreateWmDocumentInput
): Promise<WmDocumentRow> {
  const row = {
    ...(input.id ? { id: input.id } : {}),
    clerk_id: userId,
    document_type: input.document_type,
    storage_path: input.storage_path,
    original_filename: input.original_filename,
    vendor: input.vendor ?? '',
    supplier_id: input.supplier_id ?? null,
    folio: input.folio ?? '',
    issuer_address: input.issuer_address ?? '',
    payment_method: input.payment_method ?? '',
    payment_form: input.payment_form ?? '',
    concept_title: input.concept_title ?? '',
    subtotal: input.subtotal ?? null,
    tax_iva: input.tax_iva ?? 0,
    tax_iva_rate: input.tax_iva_rate ?? '',
    tax_iesps: input.tax_iesps ?? 0,
    tax_isr_ret: input.tax_isr_ret ?? 0,
    tax_iva_ret: input.tax_iva_ret ?? 0,
    total_amount: input.total_amount ?? null,
    currency: input.currency ?? 'MXN',
    ocr_text: input.ocr_text ?? '',
    parsed_json: input.parsed_json ?? {},
    document_date: input.document_date ?? new Date().toISOString().slice(0, 10),
  }

  const { data, error } = await sb.from('wm_documents').insert(row).select('*').single()
  if (error) throw error
  return data as WmDocumentRow
}

export async function recordWmEvent(
  sb: SupabaseClient,
  userId: string,
  input: {
    event_type: 'document_uploaded' | 'cost_recorded' | 'note'
    document_id?: string | null
    lot_id?: string | null
    payload?: Record<string, unknown>
    occurred_at?: string
  }
): Promise<void> {
  const { error } = await sb.from('wm_events').insert({
    clerk_id: userId,
    event_type: input.event_type,
    document_id: input.document_id ?? null,
    lot_id: input.lot_id ?? null,
    payload: input.payload ?? {},
    occurred_at: input.occurred_at ?? new Date().toISOString(),
  })
  if (error) throw error
}

export type WinemakerSummary = {
  lotesTotal: number
  lotesActivos: number
  documentosTotal: number
  gastosMesMxn: number
  gastosBodegaMxn: number
  litrosEnProceso: number
}

export async function registerDocumentOverheadCosts(
  sb: SupabaseClient,
  userId: string,
  documentId: string
): Promise<{ costs: WmProductionCostRow[]; total: number; vendor: string }> {
  const { data: existing, error: existErr } = await sb
    .from('wm_production_costs')
    .select('id')
    .eq('clerk_id', userId)
    .eq('document_id', documentId)
    .limit(1)

  if (existErr) throw existErr
  if (existing && existing.length > 0) {
    throw new Error('Esta factura ya está registrada como gasto')
  }

  const doc = await fetchDocuments(sb, userId, { withLines: true, limit: 500 }).then(docs =>
    docs.find(x => x.id === documentId)
  )
  if (!doc) throw new Error('Documento no encontrado')

  const lines = doc.wm_document_lines ?? []
  const currency = doc.currency || 'MXN'
  const costDate = doc.document_date

  const rows =
    lines.length > 0
      ? lines
          .filter(l => Number(l.amount) > 0)
          .map(line => ({
            clerk_id: userId,
            lot_id: null,
            document_id: documentId,
            supplier_id: line.supplier_id ?? doc.supplier_id,
            supply_kind: line.supply_kind,
            varietal: line.varietal ?? '',
            category: supplyKindToCostCategory(line.supply_kind) as WmProductionCostRow['category'],
            allocation_method: 'overhead' as const,
            description:
              line.description ||
              line.product_service_label ||
              formatSupplyLineLabel(line.supply_kind, line.varietal),
            amount: Number(line.amount),
            currency,
            cost_date: costDate,
          }))
      : [
          {
            clerk_id: userId,
            lot_id: null,
            document_id: documentId,
            supplier_id: doc.supplier_id,
            supply_kind: 'otro' as WmSupplyKind,
            varietal: '',
            category: 'insumo' as const,
            allocation_method: 'overhead' as const,
            description: doc.vendor || doc.original_filename || 'Gasto de bodega',
            amount: Number(doc.total_amount ?? 0),
            currency,
            cost_date: costDate,
          },
        ]

  if (rows.length === 0 || rows.every(r => r.amount <= 0)) {
    throw new Error('La factura no tiene montos para registrar')
  }

  const { data, error } = await sb.from('wm_production_costs').insert(rows).select('*')
  if (error) throw error

  const costs = (data ?? []) as WmProductionCostRow[]
  const total = costs.reduce((s, c) => s + Number(c.amount), 0)

  await recordWmEvent(sb, userId, {
    event_type: 'cost_recorded',
    document_id: documentId,
    payload: {
      allocation: 'overhead',
      total,
      line_count: costs.length,
      vendor: doc.vendor,
    },
  })

  return { costs, total, vendor: doc.vendor || doc.original_filename }
}

export async function fetchWinemakerSummary(
  sb: SupabaseClient,
  userId: string
): Promise<WinemakerSummary> {
  const empty: WinemakerSummary = {
    lotesTotal: 0,
    lotesActivos: 0,
    documentosTotal: 0,
    gastosMesMxn: 0,
    gastosBodegaMxn: 0,
    litrosEnProceso: 0,
  }

  try {
    const [lotes, documents, costs] = await Promise.all([
      fetchWineLots(sb, userId, { limit: 500 }),
      fetchDocuments(sb, userId, { limit: 500 }),
      fetchProductionCosts(sb, userId, { limit: 500 }),
    ])

    const activos = lotes.filter(
      l => l.status !== 'bottled' && l.status !== 'sold_out' && l.status !== 'archived'
    )
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    let gastosMes = 0
    let gastosBodega = 0
    for (const c of costs) {
      const amt = num(c.amount)
      if (c.lot_id == null) gastosBodega += amt
      const d = new Date(c.cost_date)
      if (d >= monthStart) gastosMes += amt
    }

    const litrosEnProceso = activos.reduce((s, l) => s + num(l.liters_initial), 0)

    return {
      lotesTotal: lotes.length,
      lotesActivos: activos.length,
      documentosTotal: documents.length,
      gastosMesMxn: gastosMes,
      gastosBodegaMxn: gastosBodega,
      litrosEnProceso,
    }
  } catch (err) {
    if (isWinemakerSchemaMissingError(err)) return empty
    throw err
  }
}
