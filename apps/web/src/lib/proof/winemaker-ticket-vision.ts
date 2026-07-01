import type { WmCfdiLineVision, WmCfdiVisionResult } from '@/lib/proof/winemaker-cfdi-types'
import type { WmSupplyKind } from '@/lib/proof/wm-supply-taxonomy'
import {
  inferSupplyKind,
  inferVarietal,
  normalizeSupplyText,
  WM_SUPPLY_KIND_LABEL,
} from '@/lib/proof/wm-supply-taxonomy'

export const WINEMAKER_TICKET_VISION_SYSTEM = `Eres el módulo de visión de PROOF para facturas CFDI y tickets de insumos de bodega/viñedo en México.
Extrae TODOS los campos visibles de la factura y clasifica cada línea de concepto.

En CFDI: supplier_name = EMISOR (vendedor), NO el receptor/comprador de la bodega.

supply_kind por línea: uva, corcho, botella, etiqueta, caja, tapa, sulfito, levadura, clarificante, barrica, energia, mano_obra, analisis, flete, equipo, limpieza, otro
Si es uva, indica varietal. Usa clave prod/servicio y descripción para inferir supply_kind (24122003 = botella, etc.).

Responde ÚNICAMENTE JSON válido (sin markdown):
{
  "supplier_name": "razón social emisor",
  "supplier_rfc": "",
  "supplier_address": "domicilio fiscal emisor",
  "supplier_email": "",
  "folio": "número de folio/factura",
  "document_date": "YYYY-MM-DD",
  "payment_method": "ej. PPD - Pago en parcialidades o diferido",
  "payment_form": "ej. 99 - Por definir",
  "concept_title": "título sección conceptos, ej. Información de compra",
  "subtotal": number,
  "tax_iva": number,
  "tax_iva_rate": "ej. 8%",
  "tax_iesps": number,
  "tax_isr_ret": number,
  "tax_iva_ret": number,
  "total": number,
  "currency": "MXN",
  "description": "resumen corto",
  "lines": [
    {
      "supply_kind": "botella|uva|corcho|...",
      "varietal": "solo si uva",
      "product_service_code": "24122003",
      "product_service_label": "Botellas de cristal",
      "description": "texto completo del concepto",
      "quantity": number,
      "unit": "Pieza|Tonelada|kg|...",
      "unit_price": number,
      "discount": number,
      "tax_note": "IVA 8% - Importe: 970.30",
      "amount": number
    }
  ]
}`

export function buildWinemakerTicketVisionUserText(wineryName?: string | null): string {
  const base =
    'Analiza este ticket. Clasifica cada línea: uva (con varietal), corchos, botellas, etiquetas, etc.'
  const winery = wineryName?.trim()
  if (!winery) return base
  return `${base}

La bodega dueña del perfil es "${winery}". Ese nombre es el COMPRADOR/receptor: no lo uses como supplier_name. supplier_name = emisor/proveedor del documento.`
}

export type WmTicketLineVision = WmCfdiLineVision

export type WmTicketVisionResult = WmCfdiVisionResult

const VALID_KINDS = new Set<WmSupplyKind>([
  'uva',
  'corcho',
  'botella',
  'etiqueta',
  'caja',
  'tapa',
  'sulfito',
  'levadura',
  'clarificante',
  'barrica',
  'energia',
  'mano_obra',
  'analisis',
  'flete',
  'equipo',
  'limpieza',
  'otro',
])

function coerceSupplyKind(raw: unknown, description: string): WmSupplyKind {
  const s = normalizeSupplyText(String(raw ?? ''))
  if (VALID_KINDS.has(s as WmSupplyKind)) return s as WmSupplyKind
  return inferSupplyKind(description || s)
}

function parseLineRow(row: Record<string, unknown>): WmCfdiLineVision {
  const description = String(row.description ?? '').trim()
  const code = String(row.product_service_code ?? '').trim()
  const label = String(row.product_service_label ?? '').trim()
  const kind = coerceSupplyKind(
    row.supply_kind,
    [description, code, label].filter(Boolean).join(' ')
  )
  const varietal =
    kind === 'uva' ? String(row.varietal ?? '').trim() || inferVarietal(description) : ''
  return {
    supply_kind: kind,
    varietal,
    product_service_code: code,
    product_service_label: label,
    description,
    quantity: row.quantity != null ? Number(row.quantity) : null,
    unit: String(row.unit ?? '').trim(),
    unit_price: row.unit_price != null ? Number(row.unit_price) : null,
    discount: row.discount != null ? Number(row.discount) : 0,
    tax_note: String(row.tax_note ?? '').trim(),
    amount: Number(row.amount ?? 0),
  }
}

function parseHeaderFields(parsed: Record<string, unknown>): Omit<WmCfdiVisionResult, 'lines'> {
  return {
    supplier_name: String(parsed.supplier_name ?? parsed.vendor ?? '').trim(),
    supplier_rfc: String(parsed.supplier_rfc ?? '').trim(),
    supplier_address: String(parsed.supplier_address ?? '').trim(),
    supplier_email: String(parsed.supplier_email ?? '').trim(),
    folio: String(parsed.folio ?? '').trim(),
    document_date: String(parsed.document_date ?? '').trim(),
    payment_method: String(parsed.payment_method ?? '').trim(),
    payment_form: String(parsed.payment_form ?? '').trim(),
    concept_title: String(parsed.concept_title ?? '').trim(),
    subtotal: parsed.subtotal != null ? Number(parsed.subtotal) : null,
    tax_iva: parsed.tax_iva != null ? Number(parsed.tax_iva) : 0,
    tax_iva_rate: String(parsed.tax_iva_rate ?? '').trim(),
    tax_iesps: parsed.tax_iesps != null ? Number(parsed.tax_iesps) : 0,
    tax_isr_ret: parsed.tax_isr_ret != null ? Number(parsed.tax_isr_ret) : 0,
    tax_iva_ret: parsed.tax_iva_ret != null ? Number(parsed.tax_iva_ret) : 0,
    total: parsed.total != null ? Number(parsed.total) : null,
    currency: String(parsed.currency ?? 'MXN').trim() || 'MXN',
    description: String(parsed.description ?? '').trim(),
  }
}

export function parseWmTicketVisionJson(raw: string): WmTicketVisionResult | null {
  try {
    const m = raw.match(/\{[\s\S]*\}/)
    if (!m) return null
    const parsed = JSON.parse(m[0]) as Record<string, unknown>

    const linesRaw = Array.isArray(parsed.lines) ? parsed.lines : []
    const lines = linesRaw.map(li => parseLineRow(li as Record<string, unknown>))

    if (lines.length === 0 && (parsed.vendor || parsed.category)) {
      return legacyVisionToResult(parsed)
    }

    return { ...parseHeaderFields(parsed), lines }
  } catch {
    return null
  }
}

export type WmTicketVisionStatus =
  | 'ok'
  | 'skipped_pdf'
  | 'skipped_not_image'
  | 'no_api_key'
  | 'api_error'
  | 'parse_error'

export type WmTicketVisionAttempt = {
  status: WmTicketVisionStatus
  result: WmTicketVisionResult | null
  error?: string
}

const VISION_MODEL = 'claude-sonnet-4-5'

const EXT_TO_MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.heic': 'image/heic',
  '.heif': 'image/heif',
}

export function resolveTicketContentType(filename: string, fileType?: string | null): string {
  const declared = fileType?.trim()
  if (declared && declared !== 'application/octet-stream') return declared
  const lower = filename.toLowerCase()
  for (const [ext, mime] of Object.entries(EXT_TO_MIME)) {
    if (lower.endsWith(ext)) return mime
  }
  if (lower.endsWith('.pdf')) return 'application/pdf'
  return declared || 'application/octet-stream'
}

export function isTicketImageContentType(contentType: string): boolean {
  return contentType.startsWith('image/')
}

export async function analyzeWinemakerTicketImage(
  base64: string,
  mediaType: string,
  wineryName?: string | null
): Promise<WmTicketVisionAttempt> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return { status: 'no_api_key', result: null, error: 'ANTHROPIC_API_KEY no configurada' }
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: VISION_MODEL,
      max_tokens: 2048,
      system: WINEMAKER_TICKET_VISION_SYSTEM,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64 },
            },
            {
              type: 'text',
              text: buildWinemakerTicketVisionUserText(wineryName),
            },
          ],
        },
      ],
    }),
  })

  if (!res.ok) {
    const errText = (await res.text()).slice(0, 400)
    console.error('[winemaker-ticket-vision] API error', res.status, errText)
    return {
      status: 'api_error',
      result: null,
      error: errText || res.statusText,
    }
  }

  const data = (await res.json()) as {
    content?: { type: string; text?: string }[]
  }
  const text = data.content?.find(c => c.type === 'text')?.text ?? ''
  const result = parseWmTicketVisionJson(text)
  if (!result) {
    console.error('[winemaker-ticket-vision] parse failed', text.slice(0, 500))
    return { status: 'parse_error', result: null, error: 'No se pudo interpretar la respuesta de visión' }
  }

  return { status: 'ok', result }
}

export function isTicketVisionClassified(
  vision: WmTicketVisionResult | null,
  supplierId: string | null
): boolean {
  if (!vision) return false
  const hasSupplier = Boolean(vision.supplier_name?.trim() || supplierId)
  const hasUsefulLines = vision.lines.some(
    l => l.supply_kind !== 'otro' || l.varietal || l.description.trim()
  )
  return hasSupplier || hasUsefulLines
}

export type { ProofSuggestedReply } from '@/lib/proof/winemaker-ticket-copy'
import type { ProofSuggestedReply } from '@/lib/proof/winemaker-ticket-copy'

export {
  buildTicketUploadMessage,
  createWinemakerTicketCopy,
  inferTicketAllocationReplies,
  type WinemakerTicketCopy,
} from '@/lib/proof/winemaker-ticket-copy'

/** @deprecated Use createWinemakerTicketCopy — kept for legacy tests */
export const WINEMAKER_TICKET_ALLOCATION_REPLIES: ProofSuggestedReply[] = [
  { label: 'Queda en bodega', message: 'queda en bodega' },
  { label: 'Asignar a lote', message: 'asignar a un lote' },
]

function legacyVisionToResult(parsed: Record<string, unknown>): WmTicketVisionResult | null {
  const vendor = String(parsed.vendor ?? parsed.supplier_name ?? '').trim()
  const category = String(parsed.category ?? 'otro')
  const description = String(parsed.description ?? '').trim()
  const kind = coerceSupplyKind(category, description)
  return {
    ...parseHeaderFields(parsed),
    supplier_name: vendor || parseHeaderFields(parsed).supplier_name,
    lines: [
      {
        supply_kind: kind,
        varietal: kind === 'uva' ? inferVarietal(description) : '',
        product_service_code: '',
        product_service_label: '',
        description: description || WM_SUPPLY_KIND_LABEL[kind],
        quantity: null,
        unit: '',
        unit_price: null,
        discount: 0,
        tax_note: '',
        amount: parsed.total != null ? Number(parsed.total) : 0,
      },
    ],
  }
}
