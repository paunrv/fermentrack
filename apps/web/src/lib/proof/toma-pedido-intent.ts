import { looksLikeEditarSkuQuery, extractSkuNameFromCategoryEditQuery, parseCategoriaLiquidoFromQuery } from '@/lib/proof/categoria-liquido'
import type { DistributorAgentContext } from '@/lib/proof/distributor-agent-context'
import type { UnidadPedido } from '@/lib/proof/toma-pedido-client'

export type AgentConversationTurn = { role: 'user' | 'agent'; content: string }

export type TomaPedidoDraft = {
  cantidad: number
  unidad: UnidadPedido
  etiqueta: string
  cliente: string
  sku_id: string | null
  sku_nombre: string | null
  stock_disponible: number | null
  anticipo: boolean
  anticipo_monto: number | null
}

export type PartialTomaPedidoDraft = Omit<TomaPedidoDraft, 'cliente'> & {
  cliente: string | null
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
}

function parseCantidadEntrega(q: string): number | null {
  const patterns = [
    /(\d[\d,]*)\s*latas?\b/,
    /(\d[\d,]*)\s*botellas?\b/,
    /(\d[\d,]*)\s*cajas?\b/,
    /(\d[\d,]*)\s*(?:unidades?|uds?)\b/,
    /\bentregar\s+(\d[\d,]*)\b/,
    /\bvender\s+(\d[\d,]*)\b/,
  ]
  for (const re of patterns) {
    const m = q.match(re)
    if (m?.[1]) {
      const n = Number(m[1].replace(/,/g, ''))
      if (Number.isFinite(n) && n > 0) return n
    }
  }
  return null
}

function parseUnidadEntrega(q: string): UnidadPedido {
  if (/\bbotellas?\b/.test(q)) return 'botellas'
  if (/\bcajas?\b/.test(q)) return 'cajas'
  return 'latas'
}

function parseProductoEntrega(q: string): string | null {
  if (looksLikeEditarSkuQuery(q)) return null

  const cajasDe = q.match(
    /\bde\s+\d[\d,]*\s+(?:cajas?|latas?|botellas?|unidades?)\s+de\s+([a-záéíóúñ0-9][a-záéíóúñ0-9\s\-'&.]{2,50})/i
  )
  if (cajasDe?.[1]) return cajasDe[1].trim()

  const deA = q.match(
    /\bde\s+([a-záéíóúñ0-9][a-záéíóúñ0-9\s\-'&.]{2,50}?)\s+a\s+/i
  )
  if (deA?.[1]) return deA[1].trim()

  const dePara = q.match(
    /\bde\s+([a-záéíóúñ0-9][a-záéíóúñ0-9\s\-'&.]{2,50}?)\s+para\s+/i
  )
  if (dePara?.[1]) return dePara[1].trim()

  const deEnd = q.match(/\bde\s+([a-záéíóúñ0-9][a-záéíóúñ0-9\s\-'&.]{2,50})$/i)
  if (deEnd?.[1]) return deEnd[1].trim()

  return null
}

function stripClienteSuffix(name: string): string {
  return name
    .replace(/\s+con\s+anticipo\b.*$/i, '')
    .replace(/\s+con\s+adelanto\b.*$/i, '')
    .trim()
}

function parseClienteEntrega(q: string): string | null {
  if (looksLikeEditarSkuQuery(q)) return null

  const paraDe = q.match(
    /\bpara\s+([a-záéíóúñ][a-záéíóúñ0-9\s\-'&.]{2,60}?)\s+de\s+\d/i
  )
  if (paraDe?.[1]) return stripClienteSuffix(paraDe[1].trim())

  const aEnd = q.match(/\ba\s+([a-záéíóúñ][a-záéíóúñ0-9\s\-'&.]{2,60})$/i)
  if (aEnd?.[1]) return stripClienteSuffix(aEnd[1].trim())

  const paraEnd = q.match(/\bpara\s+([a-záéíóúñ][a-záéíóúñ0-9\s\-'&.]{2,60})$/i)
  if (paraEnd?.[1]) return stripClienteSuffix(paraEnd[1].trim())

  return null
}

export function parseAnticipoFromQuery(q: string): {
  anticipo: boolean
  anticipo_monto: number | null
} {
  const n = norm(q)
  if (!n.includes('anticipo') && !n.includes('adelanto')) {
    return { anticipo: false, anticipo_monto: null }
  }

  const patterns = [
    /anticipo(?:\s+de)?\s*\$?\s*([\d,]+(?:\.\d{1,2})?)/,
    /adelanto(?:\s+de)?\s*\$?\s*([\d,]+(?:\.\d{1,2})?)/,
    /\$?\s*([\d,]+(?:\.\d{1,2})?)\s+de\s+anticipo/,
    /con\s+\$?\s*([\d,]+(?:\.\d{1,2})?)\s+de\s+anticipo/,
  ]

  for (const re of patterns) {
    const m = n.match(re)
    if (m?.[1]) {
      const amount = Number(m[1].replace(/,/g, ''))
      if (Number.isFinite(amount) && amount > 0) {
        return { anticipo: true, anticipo_monto: amount }
      }
    }
  }

  return { anticipo: true, anticipo_monto: null }
}

function mergeAnticipo(
  a: { anticipo: boolean; anticipo_monto: number | null },
  b: { anticipo: boolean; anticipo_monto: number | null }
): { anticipo: boolean; anticipo_monto: number | null } {
  if (!a.anticipo && !b.anticipo) return { anticipo: false, anticipo_monto: null }
  return {
    anticipo: true,
    anticipo_monto: a.anticipo_monto ?? b.anticipo_monto,
  }
}

function resolveSkuByNombre(
  producto: string,
  ctx: DistributorAgentContext
): DistributorAgentContext['skus'][number] | null {
  const p = norm(producto)
  if (p.length < 3) return null

  let best: DistributorAgentContext['skus'][number] | null = null
  let bestLen = 0
  for (const s of ctx.skus) {
    const nombre = norm(s.nombre)
    if (nombre.length < 3) continue
    if ((p.includes(nombre) || nombre.includes(p)) && nombre.length > bestLen) {
      best = s
      bestLen = nombre.length
    }
  }
  return best
}

export function looksLikeTomaPedidoQuery(q: string): boolean {
  if (looksLikeEditarSkuQuery(q)) return false
  const n = norm(q)
  if (isConfirmationReply(n)) return true
  const hasQty = parseCantidadEntrega(n) != null
  const hasDest =
    n.includes('entregar') ||
    n.includes('vender') ||
    n.includes('ticket') ||
    n.includes('pedido') ||
    n.includes('toma') ||
    n.includes('prepara')
  const hasProduct = parseProductoEntrega(n) != null
  const hasClient = parseClienteEntrega(n) != null
  return hasQty && hasDest && (hasProduct || hasClient)
}

export function isConfirmationReply(q: string): boolean {
  const n = norm(q)
  if (
    /^(si|sí|confirmo|confirmar|dale|ok|va|perfecto|listo|adelante|hecho)\b/.test(n) ||
    n.includes('preparame') ||
    n.includes('prepara el ticket') ||
    n.includes('preparame un ticket') ||
    n.includes('prepara un pedido') ||
    n.includes('preparame un pedido') ||
    n.includes('genera el ticket') ||
    n.includes('generame el ticket') ||
    n.includes('generar el ticket') ||
    n.includes('generar ticket')
  ) {
    return true
  }
  return false
}

export function extractTomaPedidoDraft(
  query: string,
  ctx: DistributorAgentContext
): TomaPedidoDraft | null {
  const partial = extractPartialTomaPedidoDraft(query, ctx)
  if (!partial?.cliente) return null
  return partial as TomaPedidoDraft
}

/** Cantidad + producto aunque falte cliente (p. ej. "hacer pedido de 100 botellas de X"). */
export function extractPartialTomaPedidoDraft(
  query: string,
  ctx: DistributorAgentContext
): PartialTomaPedidoDraft | null {
  const q = norm(query)
  const cantidad = parseCantidadEntrega(q)
  const etiqueta = parseProductoEntrega(q)
  if (!cantidad || !etiqueta) return null

  const cliente = parseClienteEntrega(q)
  const sku = resolveSkuByNombre(etiqueta, ctx)
  const anticipoInfo = parseAnticipoFromQuery(q)
  return {
    cantidad,
    unidad: parseUnidadEntrega(q),
    etiqueta,
    cliente,
    sku_id: sku?.id ?? null,
    sku_nombre: sku?.nombre ?? null,
    stock_disponible: sku?.stock_disponible ?? null,
    anticipo: anticipoInfo.anticipo,
    anticipo_monto: anticipoInfo.anticipo_monto,
  }
}

export function resolveTomaPedidoDraft(
  query: string,
  conversation: AgentConversationTurn[] | undefined,
  ctx: DistributorAgentContext
): TomaPedidoDraft | null {
  const direct = extractTomaPedidoDraft(query, ctx)
  if (direct) return direct

  const partialFromConfirm = extractPartialTomaPedidoDraft(query, ctx)
  if (partialFromConfirm && isConfirmationReply(query)) {
    for (let i = (conversation?.length ?? 0) - 1; i >= 0; i--) {
      const turn = conversation?.[i]
      if (turn?.role !== 'user') continue
      const prior = extractPartialTomaPedidoDraft(turn.content, ctx)
      if (!prior) continue
      const cliente = partialFromConfirm.cliente ?? prior.cliente
      if (!cliente) continue
      const anticipo = mergeAnticipo(
        {
          anticipo: partialFromConfirm.anticipo,
          anticipo_monto: partialFromConfirm.anticipo_monto,
        },
        { anticipo: prior.anticipo, anticipo_monto: prior.anticipo_monto }
      )
      return {
        cantidad: partialFromConfirm.cantidad ?? prior.cantidad,
        unidad: partialFromConfirm.unidad ?? prior.unidad,
        etiqueta: partialFromConfirm.etiqueta ?? prior.etiqueta,
        cliente,
        sku_id: partialFromConfirm.sku_id ?? prior.sku_id,
        sku_nombre: partialFromConfirm.sku_nombre ?? prior.sku_nombre,
        stock_disponible:
          partialFromConfirm.stock_disponible ?? prior.stock_disponible,
        anticipo: anticipo.anticipo,
        anticipo_monto: anticipo.anticipo_monto,
      }
    }
  }

  if (!isConfirmationReply(query) || !conversation?.length) return null

  for (let i = conversation.length - 1; i >= 0; i--) {
    const turn = conversation[i]!
    if (turn.role !== 'user') continue
    const draft = extractTomaPedidoDraft(turn.content, ctx)
    if (draft) return draft
  }
  return null
}

export function resolveSkuFromQuery(
  query: string,
  ctx: DistributorAgentContext
): DistributorAgentContext['skus'][number] | null {
  if (ctx.selectedSkuId) {
    const selected = ctx.skus.find(s => s.id === ctx.selectedSkuId)
    if (selected) return selected
  }

  const draft = extractTomaPedidoDraft(query, ctx)
  if (draft?.sku_id) {
    return ctx.skus.find(s => s.id === draft.sku_id) ?? null
  }

  const q = norm(query)
  const codigoMatch = q.match(/\b(sku[-\s]?\d+)\b/i)
  if (codigoMatch?.[1]) {
    const frag = codigoMatch[1].replace(/\s/g, '').toUpperCase()
    const byCode = ctx.skus.find(
      s =>
        s.codigo.toUpperCase() === frag ||
        s.codigo.toUpperCase().includes(frag.replace('SKU-', ''))
    )
    if (byCode) return byCode
  }

  let best: DistributorAgentContext['skus'][number] | null = null
  let bestLen = 0
  for (const s of ctx.skus) {
    const nombre = norm(s.nombre)
    if (nombre.length < 3) continue
    if (q.includes(nombre) && nombre.length > bestLen) {
      best = s
      bestLen = nombre.length
    }
  }
  if (best) return best

  const fromCategoryEdit = extractSkuNameFromCategoryEditQuery(query)
  if (fromCategoryEdit) {
    const byName = resolveSkuByNombre(fromCategoryEdit, ctx)
    if (byName) return byName
  }

  return resolveSkuByNombre(q, ctx)
}

/** Reduce contexto LLM a un solo SKU cuando la pregunta lo menciona. */
export function narrowDistributorContextForQuery(
  ctx: DistributorAgentContext,
  query: string
): DistributorAgentContext {
  const sku = resolveSkuFromQuery(query, ctx)
  if (!sku) return ctx
  return {
    ...ctx,
    skus: ctx.skus.filter(s => s.id === sku.id),
    skus_stock_critico: ctx.skus_stock_critico.filter(s => s.id === sku.id),
  }
}
