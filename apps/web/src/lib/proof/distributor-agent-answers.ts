import type { DistributorAgentContext } from '@/lib/proof/distributor-agent-context'
import { isSkuStockCritico } from '@/lib/proof/distributor-agent-context'
import { looksLikeDistributorMutation } from '@/lib/proof/distributor-agent-actions'
import { formatLineaToma, parseTomaPedidoNotas } from '@/lib/proof/toma-pedido-client'
import {
  extractTomaPedidoDraft,
  isConfirmationReply,
  resolveSkuFromQuery,
  resolveTomaPedidoDraft,
  type AgentConversationTurn,
} from '@/lib/proof/toma-pedido-intent'

export type DistributorQuickAnswer = {
  mensaje: string
  accionLabel: string
  accionHref: string
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
}

/** Respuesta determinística (sin LLM). */
export function tryDistributorQuickAnswer(
  query: string,
  datos: Record<string, unknown>
): DistributorQuickAnswer | null {
  const ctx = datos as unknown as DistributorAgentContext
  if (ctx.perfil !== 'distribuidor' || !ctx.resumen) return null

  const q = norm(query)
  const conversation = Array.isArray(
    (datos as { conversation?: AgentConversationTurn[] }).conversation
  )
    ? ((datos as { conversation: AgentConversationTurn[] }).conversation ?? [])
    : []

  const tomaDraft = extractTomaPedidoDraft(query, ctx)
  if (isConfirmationReply(q) && !tomaDraft) {
    const prior = resolveTomaPedidoDraft(query, conversation, ctx)
    if (!prior) {
      return {
        mensaje:
          'No tengo el pedido anterior. Escribe de nuevo: "entregar 100 latas de [producto] a [cliente]".',
        accionLabel: 'Ver pedidos',
        accionHref: '/dashboard/pedidos',
      }
    }
  }

  if (tomaDraft && !isConfirmationReply(q)) {
    const unidadLabel =
      tomaDraft.unidad === 'latas'
        ? 'latas'
        : tomaDraft.unidad === 'cajas'
          ? 'cajas'
          : 'botellas'
    const producto = tomaDraft.sku_nombre ?? tomaDraft.etiqueta
    const stock =
      tomaDraft.stock_disponible != null
        ? tomaDraft.stock_disponible.toLocaleString('es-MX')
        : '—'
    if (
      tomaDraft.stock_disponible != null &&
      tomaDraft.cantidad > tomaDraft.stock_disponible
    ) {
      return {
        mensaje: `Solo tienes ${stock} ${unidadLabel} de ${producto} disponibles. No alcanza para ${tomaDraft.cantidad} a ${tomaDraft.cliente}.`,
        accionLabel: 'Ver inventario',
        accionHref: '/dashboard/inventario',
      }
    }
    return {
      mensaje: `Tienes ${stock} ${unidadLabel} ${producto} disponibles. ¿Confirmo pedido de ${tomaDraft.cantidad} a ${tomaDraft.cliente}? Responde "sí, prepara ticket".`,
      accionLabel: 'Ver pedidos',
      accionHref: '/dashboard/pedidos',
    }
  }

  if (looksLikeDistributorMutation(q) && !tomaDraft) return null

  const wantsStock =
    q.includes('stock') ||
    q.includes('cuanto') ||
    q.includes('cuanta') ||
    q.includes('tengo') ||
    q.includes('disponible') ||
    q.includes('unidades') ||
    q.includes('botellas') ||
    q.includes('bodega') ||
    (q.includes('inventario') && (q.includes('tenemos') || q.includes('que hay')))

  if (wantsStock && ctx.skus.length === 0 && ctx.pedidos.length > 0) {
    const ultimo = ctx.pedidos[0]
    const notas = (ultimo as { notas?: string | null }).notas
    const toma = parseTomaPedidoNotas(notas ?? null)
    const detalle =
      toma?.lineas
        .slice(0, 3)
        .map(l => `${l.etiqueta} (${formatLineaToma(l)})`)
        .join('; ') ?? ultimo?.numero ?? 'pedidos recientes'
    return {
      mensaje: `No hay SKUs en catálogo todavía (inventario físico vacío). Tienes ${ctx.pedidos.length} pedido(s) registrado(s) — p. ej. ${detalle}. Los pedidos son ventas comprometidas, no stock en bodega.`,
      accionLabel: 'Ver pedidos',
      accionHref: '/dashboard/pedidos',
    }
  }

  if (wantsStock) {
    const sku = resolveSkuFromQuery(query, ctx)
    if (sku) {
      return {
        mensaje: `Tienes ${sku.stock_disponible.toLocaleString('es-MX')} unidades disponibles de ${sku.nombre} (${sku.codigo}).`,
        accionLabel: 'Ver inventario',
        accionHref: '/dashboard/inventario',
      }
    }
  }

  if (
    (q.includes('debo') || q.includes('debe')) &&
    (q.includes('proveedor') || q.includes('productor') || q.includes('pagar'))
  ) {
    const total = ctx.cxp?.total_por_pagar ?? 0
    const n = ctx.cxp?.proveedores_con_saldo ?? 0
    if (total <= 0) {
      return {
        mensaje: 'No tienes cuentas por pagar pendientes con proveedores.',
        accionLabel: 'Ver inicio',
        accionHref: '/dashboard',
      }
    }
    const lista = (ctx.cxp?.cuentas ?? [])
      .slice(0, 3)
      .map(c => `${c.proveedor_nombre} ($${c.saldo_pendiente.toLocaleString('es-MX')})`)
      .join('; ')
    return {
      mensaje: `Debes $${total.toLocaleString('es-MX')} a ${n} proveedor${n === 1 ? '' : 'es'}${lista ? `: ${lista}` : ''}.`,
      accionLabel: 'Ver inicio',
      accionHref: '/dashboard',
    }
  }

  if (
    q.includes('deben') ||
    q.includes('por cobrar') ||
    q.includes('cobros pendientes') ||
    q.includes('me deben') ||
    (q.includes('cobrar') && (q.includes('cuanto') || q.includes('cuanta')))
  ) {
    if (
      q.includes('proveedor') ||
      q.includes('productor') ||
      (q.includes('debo') && !q.includes('cliente'))
    ) {
      const total = ctx.cxp?.total_por_pagar ?? 0
      const n = ctx.cxp?.proveedores_con_saldo ?? 0
      if (total <= 0) {
        return {
          mensaje: 'No tienes cuentas por pagar pendientes con proveedores.',
          accionLabel: 'Ver inicio',
          accionHref: '/dashboard',
        }
      }
      return {
        mensaje: `Debes $${total.toLocaleString('es-MX')} a ${n} proveedor${n === 1 ? '' : 'es'}.`,
        accionLabel: 'Ver inicio',
        accionHref: '/dashboard',
      }
    }

    const total = ctx.resumen.total_por_cobrar
    const n = ctx.resumen.clientes_con_saldo
    if (total <= 0) {
      return {
        mensaje: 'No tienes saldos pendientes por cobrar a clientes.',
        accionLabel: 'Ver crédito',
        accionHref: '/dashboard/credito',
      }
    }
    return {
      mensaje: `Tienes $${total.toLocaleString('es-MX')} por cobrar de ${n} cliente${n === 1 ? '' : 's'}.`,
      accionLabel: 'Ver crédito',
      accionHref: '/dashboard/credito',
    }
  }

  if (
    q.includes('pedidos pendientes') ||
    q.includes('por entregar') ||
    q.includes('que hay por entregar') ||
    (q.includes('pendiente') && q.includes('entrega')) ||
    (q.includes('confirmado') && q.includes('entrega'))
  ) {
    const n = ctx.pedidos_pendientes_entrega.length
    if (n === 0) {
      return {
        mensaje: 'No hay pedidos confirmados pendientes de entrega.',
        accionLabel: 'Ver pedidos',
        accionHref: '/dashboard/pedidos',
      }
    }
    const nums = ctx.pedidos_pendientes_entrega
      .slice(0, 3)
      .map(p => p.numero)
      .join(', ')
    return {
      mensaje: `${n} pedido${n === 1 ? '' : 's'} confirmado${n === 1 ? '' : 's'} pendiente${n === 1 ? '' : 's'} de entrega${n <= 3 ? `: ${nums}` : ''}.`,
      accionLabel: 'Ver pedidos',
      accionHref: '/dashboard/pedidos',
    }
  }

  if (
    q.includes('stock bajo') ||
    q.includes('por agotarse') ||
    q.includes('agotarse') ||
    q.includes('quiebre') ||
    q.includes('sin stock') ||
    (q.includes('critico') && q.includes('sku'))
  ) {
    const criticos =
      ctx.skus_stock_critico.length > 0
        ? ctx.skus_stock_critico
        : ctx.skus.filter(s => isSkuStockCritico(s.estado))
    if (criticos.length === 0) {
      return {
        mensaje: 'Ningún SKU en estado bajo o quiebre ahora mismo.',
        accionLabel: 'Ver inventario',
        accionHref: '/dashboard/inventario',
      }
    }
    const lista = criticos
      .slice(0, 5)
      .map(s => `${s.nombre} (${s.stock_disponible} u.)`)
      .join('; ')
    return {
      mensaje: `${criticos.length} SKU${criticos.length === 1 ? '' : 's'} crítico${criticos.length === 1 ? '' : 's'}: ${lista}${criticos.length > 5 ? '…' : ''}.`,
      accionLabel: 'Ver inventario',
      accionHref: '/dashboard/inventario',
    }
  }

  if (q.includes('nuevo pedido') || (q.includes('registrar') && q.includes('pedido'))) {
    return {
      mensaje: 'Abre el formulario para crear un pedido con cliente y fecha de entrega.',
      accionLabel: 'Nuevo pedido',
      accionHref: '/dashboard/pedidos/nuevo',
    }
  }

  return null
}
