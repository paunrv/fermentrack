import {
  isValidProveedorNombre,
  looksLikeCrearOrdenCompraQuery,
} from '@/lib/proof/distributor-agent-actions'
import type { AgentConversationTurn } from '@/lib/proof/toma-pedido-intent'
import { looksLikeIniciarPedidoVentaQuery } from '@/lib/proof/toma-pedido-intent'

export type UnidadOrdenCompra = 'cajas' | 'latas' | 'botellas' | 'unidades'

export type PartialOrdenCompraDraft = {
  cantidad: number
  unidad: UnidadOrdenCompra
  producto: string
  proveedor: string | null
}

export type OrdenCompraDraft = PartialOrdenCompraDraft & {
  proveedor: string
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
}

function normalizeUnidad(raw: string): UnidadOrdenCompra {
  const n = norm(raw)
  if (n.startsWith('caja')) return 'cajas'
  if (n.startsWith('lata')) return 'latas'
  if (n.startsWith('botella')) return 'botellas'
  return 'unidades'
}

function unidadLabel(unidad: UnidadOrdenCompra): string {
  switch (unidad) {
    case 'cajas':
      return 'cajas'
    case 'latas':
      return 'latas'
    case 'botellas':
      return 'botellas'
    default:
      return 'unidades'
  }
}

export { unidadLabel as ordenCompraUnidadLabel }

function stripOrdenCompraPrefix(raw: string): string {
  return raw
    .replace(/^(?:quiero\s+)?(?:crear\s+)?(?:una?\s+)?orden\s+de\s+compra\s*,?\s*/i, '')
    .replace(/^comprar\s+/i, '')
    .replace(/^oc\s*,?\s*/i, '')
    .trim()
}

function trimProveedorSuffix(name: string): string {
  return name.replace(/\s+con\s+.+$/i, '').trim()
}

function splitProductoProveedor(rest: string): { producto: string; proveedor: string | null } {
  const trimmed = rest.trim()

  const alProv = trimmed.match(
    /^(.+?)\s+al\s+pro?v?eedor\s+([a-záéíóúñ0-9\s\-'&.]{2,48})$/i
  )
  if (alProv?.[1] && alProv[2]) {
    return { producto: alProv[1].trim(), proveedor: trimProveedorSuffix(alProv[2].trim()) }
  }

  const aProv = trimmed.match(
    /^(.+?)\s+a\s+pro?v?eedor\s+([a-záéíóúñ0-9\s\-'&.]{2,48})$/i
  )
  if (aProv?.[1] && aProv[2]) {
    return { producto: aProv[1].trim(), proveedor: trimProveedorSuffix(aProv[2].trim()) }
  }

  const aNombre = trimmed.match(
    /^(.+?)\s+a\s+([a-záéíóúñ][a-záéíóúñ0-9\s\-'&.]{2,48})$/i
  )
  if (aNombre?.[1] && aNombre[2]) {
    return { producto: aNombre[1].trim(), proveedor: trimProveedorSuffix(aNombre[2].trim()) }
  }

  const deFinal = trimmed.match(
    /^(.+?)\s+de\s+([a-záéíóúñ][a-záéíóúñ0-9\s\-'&.]{2,48})$/i
  )
  if (deFinal?.[1] && deFinal[2]) {
    return { producto: deFinal[1].trim(), proveedor: trimProveedorSuffix(deFinal[2].trim()) }
  }

  return { producto: trimmed, proveedor: null }
}

/** Cantidad + producto (+ proveedor), también dentro de frases largas. */
export function extractPartialOrdenCompraDraft(query: string): PartialOrdenCompraDraft | null {
  const normalized = stripOrdenCompraPrefix(query.trim())
  const qtyLine =
    normalized.match(/^(\d[\d,]*)\s*(cajas?|latas?|botellas?|unidades?)\s+de\s+(.+)$/i) ??
    normalized.match(/(\d[\d,]*)\s*(cajas?|latas?|botellas?|unidades?)\s+de\s+(.+)/i)

  if (!qtyLine?.[1] || !qtyLine[2] || !qtyLine[3]) return null

  const cantidad = Number(qtyLine[1].replace(/,/g, ''))
  if (!Number.isFinite(cantidad) || cantidad <= 0) return null

  const { producto, proveedor } = splitProductoProveedor(qtyLine[3])
  if (!producto) return null

  return {
    cantidad,
    unidad: normalizeUnidad(qtyLine[2]),
    producto,
    proveedor,
  }
}

function findLastIncompleteOcDraft(
  conversation: AgentConversationTurn[] | undefined
): PartialOrdenCompraDraft | null {
  if (!conversation?.length) return null
  for (let i = conversation.length - 1; i >= 0; i--) {
    const turn = conversation[i]!
    if (turn.role !== 'user') continue
    const draft = extractPartialOrdenCompraDraft(turn.content)
    if (!draft) continue
    if (!draft.proveedor || !isValidProveedorNombre(draft.proveedor)) {
      return draft
    }
    return null
  }
  return null
}

function looksLikeProveedorOnlyReply(query: string): boolean {
  const prov = query.trim()
  if (prov.length < 2 || prov.length > 48) return false
  if (/\d/.test(prov)) return false
  if (extractPartialOrdenCompraDraft(query)) return false
  return isValidProveedorNombre(prov)
}

/** Une cantidad/producto de un turno anterior con proveedor en el mensaje actual. */
export function resolvePartialOrdenCompraDraft(
  query: string,
  conversation: AgentConversationTurn[] | undefined
): PartialOrdenCompraDraft | null {
  const direct = extractPartialOrdenCompraDraft(query)
  if (direct?.proveedor && isValidProveedorNombre(direct.proveedor)) {
    return direct
  }

  if (looksLikeProveedorOnlyReply(query)) {
    const prev = findLastIncompleteOcDraft(conversation)
    if (prev) {
      return { ...prev, proveedor: query.trim() }
    }
  }

  return direct
}

export function formatOrdenCompraProposal(draft: PartialOrdenCompraDraft): string {
  const unidad = unidadLabel(draft.unidad)
  if (!draft.proveedor || !isValidProveedorNombre(draft.proveedor)) {
    return `Compra de ${draft.cantidad} ${unidad} de ${draft.producto}. ¿A qué proveedor va la orden? (ej. "al proveedor Cla Cla")`
  }
  return `Orden de compra propuesta: ${draft.cantidad} ${unidad} de ${draft.producto} a ${draft.proveedor}. Número y fecha se asignan al confirmar. ¿La creo? Responde "sí, crea la orden".`
}

export function isOrdenCompraFlowActive(
  conversation: AgentConversationTurn[] | undefined
): boolean {
  if (!conversation?.length) return false

  for (let i = conversation.length - 1; i >= 0; i--) {
    const turn = conversation[i]!
    if (turn.role === 'user' && looksLikeIniciarPedidoVentaQuery(turn.content)) {
      return false
    }
    if (turn.role === 'user' && looksLikeCrearOrdenCompraQuery(turn.content)) {
      return true
    }
  }

  for (let i = conversation.length - 1; i >= 0; i--) {
    const turn = conversation[i]!
    if (
      turn.role === 'agent' &&
      /orden de compra/i.test(turn.content) &&
      (/cantidad|producto|proveedor/i.test(turn.content) || /ejemplo:/i.test(turn.content))
    ) {
      return true
    }
  }
  return false
}

export function isOrdenCompraConfirmationReply(q: string): boolean {
  const n = norm(q)
  if (n.includes('prepara ticket') || n.includes('preparar ticket')) return false
  return (
    /^(si|sí|confirmo|confirmar|dale|ok|va|perfecto|listo|adelante|hecho)\b/.test(n) ||
    n.includes('crea la orden') ||
    n.includes('crear la orden') ||
    n.includes('confirma la oc') ||
    n.includes('confirma la orden')
  )
}

export function resolveOrdenCompraDraft(
  query: string,
  conversation: AgentConversationTurn[] | undefined
): OrdenCompraDraft | null {
  const direct = resolvePartialOrdenCompraDraft(query, conversation)
  if (direct?.proveedor && isValidProveedorNombre(direct.proveedor)) {
    return direct as OrdenCompraDraft
  }

  if (!isOrdenCompraConfirmationReply(query) || !conversation?.length) return null
  if (!isOrdenCompraFlowActive(conversation)) return null

  let pending: PartialOrdenCompraDraft | null = null
  for (const turn of conversation) {
    if (turn.role !== 'user') continue
    const draft = extractPartialOrdenCompraDraft(turn.content)
    if (draft) {
      pending = draft
      continue
    }
    if (pending && looksLikeProveedorOnlyReply(turn.content)) {
      pending = { ...pending, proveedor: turn.content.trim() }
    }
  }

  if (pending?.proveedor && isValidProveedorNombre(pending.proveedor)) {
    return pending as OrdenCompraDraft
  }

  return null
}

export function isOrdenCompraTurn(query: string, conversation?: AgentConversationTurn[]): boolean {
  if (looksLikeCrearOrdenCompraQuery(query)) return true
  if (extractPartialOrdenCompraDraft(query) && isOrdenCompraFlowActive(conversation)) {
    return true
  }
  if (isOrdenCompraFlowActive(conversation) && isOrdenCompraConfirmationReply(query)) {
    return true
  }
  return false
}
