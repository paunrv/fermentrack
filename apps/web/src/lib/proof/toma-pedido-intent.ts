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

function parseClienteEntrega(q: string): string | null {
  const aEnd = q.match(/\ba\s+([a-záéíóúñ][a-záéíóúñ0-9\s\-'&.]{2,60})$/i)
  if (aEnd?.[1]) return aEnd[1].trim()

  const paraEnd = q.match(/\bpara\s+([a-záéíóúñ][a-záéíóúñ0-9\s\-'&.]{2,60})$/i)
  if (paraEnd?.[1]) return paraEnd[1].trim()

  return null
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
  const n = norm(q)
  if (isConfirmationReply(n)) return true
  const hasQty = parseCantidadEntrega(n) != null
  const hasDest =
    n.includes('entregar') ||
    n.includes('vender') ||
    n.includes('ticket') ||
    n.includes('pedido') ||
    n.includes('toma')
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
    n.includes('haz el ticket') ||
    n.includes('genera el ticket') ||
    n.includes('generame el ticket')
  ) {
    return true
  }
  return false
}

export function extractTomaPedidoDraft(
  query: string,
  ctx: DistributorAgentContext
): TomaPedidoDraft | null {
  const q = norm(query)
  const cantidad = parseCantidadEntrega(q)
  const etiqueta = parseProductoEntrega(q)
  const cliente = parseClienteEntrega(q)
  if (!cantidad || !etiqueta || !cliente) return null

  const sku = resolveSkuByNombre(etiqueta, ctx)
  return {
    cantidad,
    unidad: parseUnidadEntrega(q),
    etiqueta,
    cliente,
    sku_id: sku?.id ?? null,
    sku_nombre: sku?.nombre ?? null,
    stock_disponible: sku?.stock_disponible ?? null,
  }
}

export function resolveTomaPedidoDraft(
  query: string,
  conversation: AgentConversationTurn[] | undefined,
  ctx: DistributorAgentContext
): TomaPedidoDraft | null {
  const direct = extractTomaPedidoDraft(query, ctx)
  if (direct) return direct

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
  return best
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
