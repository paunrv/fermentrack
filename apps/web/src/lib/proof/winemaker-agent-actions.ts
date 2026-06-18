import type { SupabaseClient } from '@supabase/supabase-js'
import type { WinemakerAgentContext } from '@/lib/proof/winemaker-agent-context'
import { formatCfdiFolioLabel } from '@/lib/proof/winemaker-cfdi-types'
import { fmtMoney } from '@/lib/proof/format'
import { registerDocumentOverheadCosts } from '@/lib/supabase/winemaker'

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
}

function resolveDocumentId(ctx: WinemakerAgentContext, query: string): string | null {
  if (ctx.selectedDocumentId) return ctx.selectedDocumentId
  if (ctx.uploadedDocument?.id) return ctx.uploadedDocument.id

  const q = norm(query)
  for (const doc of ctx.documentosRecientes ?? []) {
    const label = formatCfdiFolioLabel(doc.folio, doc.vendor || doc.original_filename)
    const vendor = norm(doc.vendor || '')
    const folio = norm(doc.folio || '')
    const filename = norm(doc.original_filename || '')
    if (folio && q.includes(folio)) return doc.id
    if (vendor && q.includes(vendor)) return doc.id
    if (filename && q.includes(filename)) return doc.id
    if (norm(label) && q.includes(norm(label))) return doc.id
  }
  return null
}

export type WinemakerDocumentActionResult = {
  message: string
  accionLabel: string
  accionHref: string
}

export async function tryWinemakerDocumentAction(
  sb: SupabaseClient,
  clerkId: string,
  query: string,
  ctx: WinemakerAgentContext
): Promise<WinemakerDocumentActionResult | null> {
  const q = norm(query)

  const wantsOverhead =
    (q.includes('registra') || q.includes('registrar')) &&
    q.includes('gast') &&
    (q.includes('bodega') || q.includes('sin lote'))

  const wantsAssignLot =
    q.includes('asigna') &&
    q.includes('lote') &&
    (q.includes('factura') || q.includes('ticket'))

  if (!wantsOverhead && !wantsAssignLot) return null

  const documentId = resolveDocumentId(ctx, query)
  if (!documentId) {
    return {
      message: 'No ubiqué la factura. Sube el ticket de nuevo o dime el folio del proveedor.',
      accionLabel: 'Ver documentos',
      accionHref: '/dashboard/winemaker/documentos',
    }
  }

  if (wantsAssignLot) {
    return {
      message:
        'Asignar a lote llegará en el siguiente paso. Por ahora puedo registrarla como gasto de bodega con el botón «Gasto de bodega».',
      accionLabel: 'Ver lotes',
      accionHref: '/dashboard/winemaker/lotes',
    }
  }

  try {
    const { total, vendor } = await registerDocumentOverheadCosts(sb, clerkId, documentId)
    return {
      message: `Registré ${fmtMoney(total)} de ${vendor} como gasto de bodega (sin lote). Ya aparece en tus gastos.`,
      accionLabel: 'Ver gastos',
      accionHref: '/dashboard/winemaker/gastos',
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'No se pudo registrar el gasto'
    return {
      message: msg,
      accionLabel: 'Ver documentos',
      accionHref: '/dashboard/winemaker/documentos',
    }
  }
}
