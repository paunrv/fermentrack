import {
  categoriaLiquidoLabel,
  extractSkuNameFromCategoryEditQuery,
  looksLikeEditarSkuQuery,
  parseCategoriaLiquidoFromQuery,
  filterSkusByCategoriaQuery,
} from '@/lib/proof/categoria-liquido'
import type { DistributorAgentContext } from '@/lib/proof/distributor-agent-context'
import { isSkuStockCritico } from '@/lib/proof/distributor-agent-context'
import { looksLikeCrearOrdenCompraQuery, looksLikeDistributorMutation, looksLikeCompraLlegadaQuery, looksLikeEntregaVentaQuery, looksLikeVentaPedidoQuery, needsOrdenCompraDetails, isValidProveedorNombre } from '@/lib/proof/distributor-agent-actions'
import { filterSkusByBodegaQuery } from '@/lib/proof/bodega-filter'
import {
  formatBodegaFisica,
  formatCategoriaBodegaConCompras,
  formatDetalleCompraProveedor,
  formatEstadoBodegaResumen,
  formatPendienteIngreso,
  formatPorPagarProveedor,
  looksLikeBodegaFisicaLensQuery,
  looksLikeDetalleCompraProveedorQuery,
  looksLikeEstadoBodegaQuery,
  looksLikePendienteIngresoLensQuery,
  looksLikePorPagarLensQuery,
} from '@/lib/proof/bodega-estado-answers'
import { formatLineaToma, parseTomaPedidoNotas } from '@/lib/proof/toma-pedido-client'
import {
  extractPartialTomaPedidoDraft,
  extractTomaPedidoDraft,
  isConfirmationReply,
  isPedidoVentaFlowActive,
  isPedidoVentaTurn,
  looksLikeIniciarPedidoVentaQuery,
  looksLikeTomaPedidoQuery,
  resolveSkuFromQuery,
  resolveTomaPedidoDraft,
  type AgentConversationTurn,
} from '@/lib/proof/toma-pedido-intent'
import {
  extractPartialOrdenCompraDraft,
  isOrdenCompraConfirmationReply,
  isOrdenCompraFlowActive,
  isOrdenCompraTurn,
  resolveOrdenCompraDraft,
  formatOrdenCompraProposal,
  resolvePartialOrdenCompraDraft,
} from '@/lib/proof/toma-oc-intent'
import { resolveTitularCuenta } from '@/lib/proof/format-datos-cobro-clipboard'
import {
  looksLikeActualizarMiInformacionQuery,
  looksLikeMiInformacionQuery,
  parseActualizarMiInformacionIntent,
} from '@/lib/proof/mi-informacion-intent'

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

function contextWarnPrefix(datos: Record<string, unknown>): string {
  const warnings = (datos as { context_load_warnings?: string[] }).context_load_warnings
  if (!warnings?.length) return ''
  const labels: Record<string, string> = {
    skus: 'inventario',
    pedidos: 'pedidos',
    cuentas_por_cobrar: 'cuentas por cobrar',
    ordenes_compra_pendientes: 'órdenes de compra',
    cuentas_por_pagar: 'cuentas por pagar',
  }
  const list = warnings.map(w => labels[w] ?? w).join(', ')
  return `No pude cargar ${list} desde la base de datos; los números pueden estar incompletos. `
}

function answer(
  datos: Record<string, unknown>,
  body: { mensaje: string; accionLabel: string; accionHref: string }
) {
  return { ...body, mensaje: contextWarnPrefix(datos) + body.mensaje }
}

function tryCompoundLlegadaPagoHint(query: string): {
  mensaje: string
  accionLabel: string
  accionHref: string
} | null {
  const q = norm(query)
  if (!looksLikeCompraLlegadaQuery(query)) return null
  if (!/\bpag[oó]\b/.test(q) && !q.includes('pago')) return null
  return {
    mensaje:
      'Haz un paso a la vez: primero confirma la llegada a bodega (ej. "confirmar llegada OC-001") y después registra el pago al proveedor en otro mensaje.',
    accionLabel: 'Ver compras',
    accionHref: '/dashboard/distribuidor/compras/nuevo',
  }
}

function tryLlegadaGuidanceAnswer(
  query: string,
  ctx: DistributorAgentContext
): { mensaje: string; accionLabel: string; accionHref: string } | null {
  if (!looksLikeCompraLlegadaQuery(query)) return null
  const ordenes = ctx.ordenes_compra_pendientes ?? []
  if (ordenes.length === 0) {
    return {
      mensaje:
        'No hay órdenes de compra pendientes de recepción. Si ya pagaste al proveedor pero no ves stock, la mercancía aún no se ingresó a bodega.',
      accionLabel: 'Nueva OC',
      accionHref: '/dashboard/distribuidor/compras/nuevo',
    }
  }
  if (ordenes.length === 1) return null
  const q = norm(query)
  if (/\boc[-\s]?\d+/i.test(q)) return null
  const lista = ordenes
    .slice(0, 4)
    .map(o => `${o.numero_orden} (${o.proveedor_nombre})`)
    .join(', ')
  return {
    mensaje: `Tienes ${ordenes.length} OCs sin ingresar. Indica cuál llegó: ${lista}. Ejemplo: "confirmar llegada ${ordenes[0]!.numero_orden}".`,
    accionLabel: 'Ver compras',
    accionHref: '/dashboard/distribuidor/compras/nuevo',
  }
}

function resolveClienteDeudaEnQuery(
  q: string,
  ctx: DistributorAgentContext
): DistributorAgentContext['credito']['cuentas'][number] | null {
  const qNorm = norm(q)
  const qCompact = qNorm.replace(/\s+/g, '')
  let best: DistributorAgentContext['credito']['cuentas'][number] | null = null
  let bestLen = 0

  for (const c of ctx.credito.cuentas) {
    const nombre = norm(c.cliente_nombre)
    const nombreCompact = nombre.replace(/\s+/g, '')
    if (
      (qNorm.includes(nombre) || qCompact.includes(nombreCompact)) &&
      nombre.length > bestLen
    ) {
      best = c
      bestLen = nombre.length
      continue
    }
    const tokens = nombre.split(/\s+/).filter(t => t.length >= 3)
    if (tokens.length > 0 && tokens.every(t => qNorm.includes(t)) && nombre.length > bestLen) {
      best = c
      bestLen = nombre.length
    }
  }

  const debeMatch = qNorm.match(/\bdebe[n]?\s+(?:a\s+)?([a-z0-9\s\-'&.]{2,60})$/i)
  if (debeMatch?.[1]) {
    const frag = norm(debeMatch[1]).replace(/\s+/g, '')
    for (const c of ctx.credito.cuentas) {
      const nombreCompact = norm(c.cliente_nombre).replace(/\s+/g, '')
      if (frag.length >= 3 && (nombreCompact.includes(frag) || frag.includes(nombreCompact))) {
        return c
      }
    }
  }

  return best
}

function formatSkuStockLine(
  s: DistributorAgentContext['skus'][number],
  opts?: { short?: boolean; bodegaLabel?: string | null }
): string {
  const fisico = s.stock_total.toLocaleString('es-MX')
  const disponible = s.stock_disponible.toLocaleString('es-MX')
  const bodegaSuffix =
    opts?.bodegaLabel && opts.bodegaLabel !== 'Principal'
      ? ` (${opts.bodegaLabel})`
      : s.bodega && s.bodega !== 'Principal' && !opts?.short
        ? ` — bodega ${s.bodega}`
        : ''
  if (s.stock_reservado > 0) {
    const reservado = s.stock_reservado.toLocaleString('es-MX')
    if (opts?.short) {
      return `${s.nombre}: ${fisico} fís. · ${reservado} res. · ${disponible} disp.${bodegaSuffix}`
    }
    return `${s.nombre} (${s.codigo}): ${fisico} en bodega, ${reservado} reservadas, ${disponible} disponibles${bodegaSuffix}.`
  }
  if (opts?.short) {
    return `${s.nombre}: ${disponible} disp.${bodegaSuffix}`
  }
  return `Tienes ${disponible} disponibles de ${s.nombre} (${s.codigo}) — ${fisico} en bodega${bodegaSuffix}.`
}

/** Respuesta determinística (sin LLM). */
export function tryDistributorQuickAnswer(
  query: string,
  datos: Record<string, unknown>
): DistributorQuickAnswer | null {
  const ctx = datos as unknown as DistributorAgentContext
  if (ctx.perfil !== 'distribuidor' || !ctx.resumen) return null

  const q = norm(query)
  if (looksLikeEditarSkuQuery(query)) {
    const categoria = parseCategoriaLiquidoFromQuery(query)
    if (!categoria) {
      return {
        mensaje:
          'No entendí la categoría. Usa: vino, cerveza, mezcal, gin, destilado u otro.',
        accionLabel: 'Ver inventario',
        accionHref: '/dashboard/inventario',
      }
    }
    const sku = resolveSkuFromQuery(query, ctx)
    if (!sku) {
      const frag = extractSkuNameFromCategoryEditQuery(query)
      const nombres = ctx.skus
        .slice(0, 5)
        .map(s => s.nombre)
        .join(', ')
      return {
        mensaje: frag
          ? `No encontré "${frag}" en inventario.${nombres ? ` Tienes: ${nombres}.` : ''}`
          : `No encontré ese SKU.${nombres ? ` Tienes: ${nombres}.` : ''}`,
        accionLabel: 'Ver inventario',
        accionHref: '/dashboard/inventario',
      }
    }
    return null
  }

  if (
    looksLikeActualizarMiInformacionQuery(query) &&
    !parseActualizarMiInformacionIntent(query)
  ) {
    return {
      mensaje:
        'No capté el dato. Titular: "titular: Nombre Apellido". Banco: "banco: Banregio". Cuenta: "BBVA clabe 012345678901234567".',
      accionLabel: 'Mi información',
      accionHref: '/dashboard',
    }
  }

  if (looksLikeMiInformacionQuery(query)) {
    const mi = ctx.mi_informacion
    const cuenta = mi?.cuenta_deposito?.trim() ?? ''
    const banco = mi?.banco_deposito?.trim() ?? ''
    const titular = resolveTitularCuenta(mi?.titular_cuenta, null)
    const tieneConstancia = mi?.tiene_constancia_fiscal ?? false

    if (!cuenta && !tieneConstancia && !titular) {
      return {
        mensaje:
          'Aún no tienes cuenta ni constancia configuradas. Dime banco y CLABE, ej: "BBVA clabe 012345678901234567". La constancia PDF la subes desde el ícono de información personal en el header.',
        accionLabel: 'Mi información',
        accionHref: '/dashboard/settings',
      }
    }

    const partes: string[] = []
    if (titular) partes.push(`Titular: ${titular}`)
    if (cuenta) {
      partes.push(`${banco ? `Banco: ${banco}. ` : ''}CLABE/cuenta: ${cuenta}`)
    } else if (!titular) {
      partes.push('Cuenta de depósito: pendiente')
    }
    partes.push(
      tieneConstancia
        ? 'Constancia fiscal: cargada ✓'
        : 'Constancia fiscal: pendiente (súbela desde el menú de cuenta)'
    )

    return {
      mensaje: partes.join('. ') + '.',
      accionLabel: 'Mi información',
      accionHref: '/dashboard',
    }
  }

  const conversation = Array.isArray(
    (datos as { conversation?: AgentConversationTurn[] }).conversation
  )
    ? ((datos as { conversation: AgentConversationTurn[] }).conversation ?? [])
    : []

  const tomaDraft = extractTomaPedidoDraft(query, ctx)
  const partialVenta = extractPartialTomaPedidoDraft(query, ctx)
  const ocFlowActive = isOrdenCompraFlowActive(conversation)
  const pedidoFlowActive = isPedidoVentaFlowActive(conversation)
  const partialOc = resolvePartialOrdenCompraDraft(query, conversation)
  const ocDraft = resolveOrdenCompraDraft(query, conversation)

  if (looksLikeIniciarPedidoVentaQuery(query) && !partialVenta) {
    return {
      mensaje:
        'Vamos a registrar un pedido de venta a tu cliente (bar, restaurante, tienda). Dime cantidad, producto y cliente. Ejemplo: "100 latas de Silvana IPA a Bar La Cueva".',
      accionLabel: 'Ver pedidos',
      accionHref: '/dashboard/pedidos',
    }
  }

  if (
    (pedidoFlowActive || isPedidoVentaTurn(query, conversation)) &&
    !ocFlowActive &&
    partialVenta &&
    !isConfirmationReply(q)
  ) {
    const unidadLabel =
      partialVenta.unidad === 'latas'
        ? 'latas'
        : partialVenta.unidad === 'cajas'
          ? 'cajas'
          : 'botellas'
    const producto = partialVenta.sku_nombre ?? partialVenta.etiqueta
    if (!partialVenta.cliente) {
      return {
        mensaje: `Venta de ${partialVenta.cantidad} ${unidadLabel} de ${producto}. ¿Para qué cliente va el pedido? (ej. "a Bar La Cueva")`,
        accionLabel: 'Ver pedidos',
        accionHref: '/dashboard/pedidos',
      }
    }
    const stock =
      partialVenta.stock_disponible != null
        ? partialVenta.stock_disponible.toLocaleString('es-MX')
        : '—'
    if (
      partialVenta.stock_disponible != null &&
      partialVenta.cantidad > partialVenta.stock_disponible
    ) {
      return {
        mensaje: `Solo tienes ${stock} ${unidadLabel} de ${producto} disponibles. No alcanza para ${partialVenta.cantidad} a ${partialVenta.cliente}.`,
        accionLabel: 'Ver inventario',
        accionHref: '/dashboard/inventario',
      }
    }
    if (partialVenta.anticipo && partialVenta.anticipo_monto == null) {
      return {
        mensaje: `Pedido de ${partialVenta.cantidad} ${unidadLabel} a ${partialVenta.cliente} con anticipo. ¿Cuánto de anticipo? (ej. "$500 de anticipo")`,
        accionLabel: 'Ver pedidos',
        accionHref: '/dashboard/pedidos',
      }
    }
    const anticipoHint =
      partialVenta.anticipo && partialVenta.anticipo_monto != null
        ? ` con anticipo de $${partialVenta.anticipo_monto.toLocaleString('es-MX')}`
        : ''
    return {
      mensaje: `Pedido de venta propuesto: ${partialVenta.cantidad} ${unidadLabel} de ${producto} a ${partialVenta.cliente}${anticipoHint}. ¿Confirmo? Responde "sí, prepara ticket".`,
      accionLabel: 'Ver pedidos',
      accionHref: '/dashboard/pedidos',
    }
  }

  if (partialOc && !isOrdenCompraConfirmationReply(q) && !pedidoFlowActive) {
    if (ocFlowActive || looksLikeCrearOrdenCompraQuery(query)) {
      return {
        mensaje: formatOrdenCompraProposal(partialOc),
        accionLabel: 'Nueva OC',
        accionHref: '/dashboard/distribuidor/compras/nuevo',
      }
    }
  }

  if ((ocFlowActive || isOrdenCompraTurn(query, conversation)) && !pedidoFlowActive) {
    if (isOrdenCompraConfirmationReply(q) && !ocDraft) {
      return {
        mensaje:
          'No tengo los datos de la orden anterior. Escribe de nuevo: "100 cajas de [producto] de [proveedor]" y confirma.',
        accionLabel: 'Nueva OC',
        accionHref: '/dashboard/distribuidor/compras/nuevo',
      }
    }

    if (partialOc && !isOrdenCompraConfirmationReply(q)) {
      return {
        mensaje: formatOrdenCompraProposal(partialOc),
        accionLabel: 'Nueva OC',
        accionHref: '/dashboard/distribuidor/compras/nuevo',
      }
    }
  }

  if (
    partialVenta &&
    !partialVenta.cliente &&
    !isConfirmationReply(q) &&
    !ocFlowActive &&
    !pedidoFlowActive &&
    (looksLikeTomaPedidoQuery(q) || looksLikeVentaPedidoQuery(q))
  ) {
    const unidadLabel =
      partialVenta.unidad === 'latas'
        ? 'latas'
        : partialVenta.unidad === 'cajas'
          ? 'cajas'
          : 'botellas'
    const producto = partialVenta.sku_nombre ?? partialVenta.etiqueta
    const stock =
      partialVenta.stock_disponible != null
        ? partialVenta.stock_disponible.toLocaleString('es-MX')
        : '—'
    if (
      partialVenta.stock_disponible != null &&
      partialVenta.cantidad > partialVenta.stock_disponible
    ) {
      return {
        mensaje: `Solo tienes ${stock} ${unidadLabel} de ${producto} disponibles. No alcanza para ${partialVenta.cantidad}.`,
        accionLabel: 'Ver inventario',
        accionHref: '/dashboard/inventario',
      }
    }
    if (partialVenta.anticipo && partialVenta.anticipo_monto == null) {
      return {
        mensaje: `Pedido de ${partialVenta.cantidad} ${unidadLabel} de ${producto} con anticipo. ¿Para qué cliente y cuánto de anticipo? (ej. "Bar La Cueva con anticipo de $500")`,
        accionLabel: 'Ver pedidos',
        accionHref: '/dashboard/pedidos',
      }
    }
    return {
      mensaje: `Tienes ${stock} ${unidadLabel} de ${producto} disponibles. ¿Para qué cliente van las ${partialVenta.cantidad}? Responde con el nombre del cliente.`,
      accionLabel: 'Ver pedidos',
      accionHref: '/dashboard/pedidos',
    }
  }

  if (isConfirmationReply(q) && !tomaDraft && !ocDraft && !looksLikeEntregaVentaQuery(q) && !looksLikeCompraLlegadaQuery(q)) {
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
    if (tomaDraft.anticipo && tomaDraft.anticipo_monto == null) {
      return {
        mensaje: `Pedido de ${tomaDraft.cantidad} ${unidadLabel} a ${tomaDraft.cliente} con anticipo. ¿Cuánto de anticipo? (ej. "$500 de anticipo")`,
        accionLabel: 'Ver pedidos',
        accionHref: '/dashboard/pedidos',
      }
    }
    const anticipoHint =
      tomaDraft.anticipo && tomaDraft.anticipo_monto != null
        ? ` con anticipo de $${tomaDraft.anticipo_monto.toLocaleString('es-MX')}`
        : ''
    return {
      mensaje: `Tienes ${stock} ${unidadLabel} ${producto} disponibles. ¿Confirmo pedido de ${tomaDraft.cantidad} a ${tomaDraft.cliente}${anticipoHint}? Responde "sí, prepara ticket".`,
      accionLabel: 'Ver pedidos',
      accionHref: '/dashboard/pedidos',
    }
  }

  if (looksLikeBodegaFisicaLensQuery(query)) {
    return answer(datos, {
      mensaje: formatBodegaFisica(ctx),
      accionLabel: 'Ver inventario',
      accionHref: '/dashboard/inventario',
    })
  }

  if (looksLikePendienteIngresoLensQuery(query)) {
    return answer(datos, {
      mensaje: formatPendienteIngreso(ctx),
      accionLabel: 'Ver compras',
      accionHref: '/dashboard/distribuidor/compras/nuevo',
    })
  }

  if (looksLikePorPagarLensQuery(query)) {
    return answer(datos, {
      mensaje: formatPorPagarProveedor(ctx),
      accionLabel: 'Ver inicio',
      accionHref: '/dashboard',
    })
  }

  if (
    (q.includes('ultima') || q.includes('última')) &&
    (q.includes('ingres') || q.includes('recib')) &&
    q.includes('orden') &&
    q.includes('compra')
  ) {
    const ultima = ctx.ultima_orden_ingresada
    if (!ultima) {
      return {
        mensaje: 'Aún no hay órdenes de compra ingresadas a bodega.',
        accionLabel: 'Nueva OC',
        accionHref: '/dashboard/distribuidor/compras/nuevo',
      }
    }
    const items = ultima.items
      .map(it => {
        const rec = it.cantidad_recibida ?? 0
        return `${it.producto_nombre} (${rec}/${it.cantidad_ordenada} u.)`
      })
      .join(', ')
    const fecha = ultima.fecha_recepcion
      ? new Date(`${ultima.fecha_recepcion}T12:00:00`).toLocaleDateString('es-MX', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : '—'
    return {
      mensaje: `Última ingresada: ${ultima.numero_orden} · ${ultima.proveedor_nombre} (${fecha}). ${items}.`,
      accionLabel: 'Ver compras',
      accionHref: '/dashboard',
    }
  }

  if (
    q.includes('ordenes de compra') ||
    q.includes('órdenes de compra') ||
    q.includes('oc pendiente') ||
    (q.includes('orden') && q.includes('pendiente') && q.includes('compra')) ||
    (q.includes('compra') && q.includes('pendiente') && !q.includes('cliente'))
  ) {
    const ordenes = ctx.ordenes_compra_pendientes ?? []
    if (ordenes.length === 0) {
      return {
        mensaje: 'No tienes órdenes de compra pendientes de llegada.',
        accionLabel: 'Nueva OC',
        accionHref: '/dashboard/distribuidor/compras/nuevo',
      }
    }
    const lista = ordenes
      .slice(0, 5)
      .map(o => {
        const det = o.items
          .map(
            it =>
              `${it.producto_nombre} (${it.cantidad_recibida ?? 0}/${it.cantidad_ordenada})`
          )
          .join(', ')
        return `${o.numero_orden} · ${o.proveedor_nombre}: ${det}`
      })
      .join('; ')
    return {
      mensaje: `${ordenes.length} OC pendiente${ordenes.length === 1 ? '' : 's'}: ${lista}${ordenes.length > 5 ? '…' : ''}.`,
      accionLabel: 'Nueva OC',
      accionHref: '/dashboard/distribuidor/compras/nuevo',
    }
  }

  if (
    q.includes('cuentas por pagar') ||
    q.includes('cuenta por pagar') ||
    (q.includes('por pagar') && (q.includes('proveedor') || q.includes('cxp'))) ||
    ((q.includes('pendiente') || q.includes('pendientes')) &&
      (q.includes('proveedor') || q.includes('productor') || q.includes('proovedor')))
  ) {
    const cuentas = ctx.cxp?.cuentas ?? []
    const ordenes = ctx.ordenes_compra_pendientes ?? []
    if (cuentas.length === 0 && ordenes.length === 0) {
      return {
        mensaje:
          'No tienes cuentas por pagar ni órdenes de compra pendientes de ingreso con proveedores.',
        accionLabel: 'Ver inicio',
        accionHref: '/dashboard',
      }
    }
    const partes: string[] = []
    if (ordenes.length > 0) {
      const ocLista = ordenes
        .slice(0, 3)
        .map(o => {
          const pend = o.items.reduce(
            (s, it) => s + Math.max(it.cantidad_ordenada - (it.cantidad_recibida ?? 0), 0),
            0
          )
          return `${o.numero_orden} · ${o.proveedor_nombre} (${pend} u. sin ingresar)`
        })
        .join('; ')
      partes.push(
        `Compras sin ingresar a bodega: ${ocLista}. Confirma recepción para sumar stock.`
      )
    }
    if (cuentas.length > 0) {
      const lista = cuentas
        .slice(0, 4)
        .map(c => `${c.proveedor_nombre} ($${c.saldo_pendiente.toLocaleString('es-MX')})`)
        .join('; ')
      partes.push(
        `Por pagar a proveedor: ${lista}${cuentas.length > 4 ? '…' : ''}. Total: $${(ctx.cxp?.total_por_pagar ?? 0).toLocaleString('es-MX')}.`
      )
    }
    return {
      mensaje: partes.join(' '),
      accionLabel: ordenes.length > 0 ? 'Nueva OC' : 'Ver inicio',
      accionHref:
        ordenes.length > 0 ? '/dashboard/distribuidor/compras/nuevo' : '/dashboard',
    }
  }

  if (q.includes('reservad') || (q.includes('comprometid') && q.includes('stock'))) {
    const conReserva = ctx.skus.filter(s => s.stock_reservado > 0)
    if (conReserva.length === 0) {
      return {
        mensaje: 'No hay stock reservado para pedidos ahora mismo.',
        accionLabel: 'Ver inventario',
        accionHref: '/dashboard/inventario',
      }
    }
    const lista = conReserva
      .slice(0, 6)
      .map(s => formatSkuStockLine(s, { short: true }))
      .join('; ')
    return {
      mensaje: `Stock reservado: ${lista}${conReserva.length > 6 ? '…' : ''}.`,
      accionLabel: 'Ver pedidos',
      accionHref: '/dashboard/pedidos',
    }
  }

  if (
    looksLikeCrearOrdenCompraQuery(query) &&
    needsOrdenCompraDetails(query) &&
    !pedidoFlowActive &&
    !tomaDraft &&
    !partialVenta
  ) {
    return {
      mensaje:
        'Vamos a crear tu orden de compra al proveedor. Dime cantidad, producto y proveedor. Ejemplo: "comprar 50 cajas de IPA a Cervecería Norte".',
      accionLabel: 'Nueva OC',
      accionHref: '/dashboard/distribuidor/compras/nuevo',
    }
  }

  if (looksLikeDistributorMutation(q) && !tomaDraft && !partialVenta) {
    const compound = tryCompoundLlegadaPagoHint(query)
    if (compound) return answer(datos, compound)
    const llegadaGuide = tryLlegadaGuidanceAnswer(query, ctx)
    if (llegadaGuide) return answer(datos, llegadaGuide)
    return null
  }

  if (looksLikeEstadoBodegaQuery(query)) {
    return answer(datos, {
      mensaje: formatEstadoBodegaResumen(ctx),
      accionLabel: 'Ver inventario',
      accionHref: '/dashboard/inventario',
    })
  }

  if (looksLikeDetalleCompraProveedorQuery(query)) {
    const detalle = formatDetalleCompraProveedor(query, ctx)
    if (detalle) {
      return {
        mensaje: detalle,
        accionLabel: 'Ver compras',
        accionHref: '/dashboard/distribuidor/compras/nuevo',
      }
    }
  }

  if (
    (q.includes('debe') || q.includes('deben') || q.includes('debo')) &&
    !q.includes('proveedor') &&
    !q.includes('productor') &&
    (q.includes('cuanto') || q.includes('cuanta') || q.includes('cuánto') || q.includes('cuánta'))
  ) {
    const cuenta = resolveClienteDeudaEnQuery(q, ctx)
    if (cuenta) {
      const saldo = cuenta.saldo_pendiente
      if (saldo <= 0) {
        return {
          mensaje: `${cuenta.cliente_nombre} no tiene saldo pendiente.`,
          accionLabel: 'Ver crédito',
          accionHref: '/dashboard/credito',
        }
      }
      const vencida =
        cuenta.estado === 'vencida' ||
        (cuenta.fecha_vencimiento != null &&
          cuenta.fecha_vencimiento <
            new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' }))
      return {
        mensaje: `${cuenta.cliente_nombre} te debe $${saldo.toLocaleString('es-MX')}${vencida ? ' (vencido)' : ''}.`,
        accionLabel: 'Ver crédito',
        accionHref: '/dashboard/credito',
      }
    }
  }

  const wantsStock =
    !ocFlowActive &&
    !pedidoFlowActive &&
    !isOrdenCompraTurn(query, conversation) &&
    !isPedidoVentaTurn(query, conversation) &&
    (q.includes('stock') ||
      q.includes('cuanto') ||
      q.includes('cuanta') ||
      q.includes('tengo') ||
      q.includes('disponible') ||
      q.includes('unidades') ||
      q.includes('botellas') ||
      q.includes('bodega') ||
      (q.includes('inventario') && (q.includes('tenemos') || q.includes('que hay'))))

  if (
    wantsStock &&
    ctx.skus.length === 0 &&
    ctx.pedidos.length > 0 &&
    (ctx.ordenes_compra_pendientes ?? []).length === 0 &&
    !parseCategoriaLiquidoFromQuery(query)
  ) {
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

  const { bodega: bodegaFilter, transito, items: skusEnBodega } = filterSkusByBodegaQuery(
    ctx.skus,
    query
  )
  const skusScope = bodegaFilter || transito ? skusEnBodega : ctx.skus
  const bodegaLabel = bodegaFilter ?? (transito ? 'Tránsito' : null)

  const { categoria: catFilter, items: skusPorCategoria } = filterSkusByCategoriaQuery(
    skusScope,
    query
  )
  if (
    catFilter &&
    (wantsStock ||
      q.includes('muéstrame') ||
      q.includes('muestrame') ||
      q.includes('mostrar') ||
      q.includes('que hay'))
  ) {
    const categoriaAnswer = formatCategoriaBodegaConCompras(
      ctx,
      catFilter,
      bodegaLabel,
      skusScope
    )
    return {
      mensaje: categoriaAnswer.mensaje,
      accionLabel: 'Ver inventario',
      accionHref: '/dashboard/inventario',
    }
  }

  if ((bodegaLabel || transito) && wantsStock) {
    if (skusScope.length === 0) {
      return {
        mensaje: `No hay SKUs${bodegaLabel ? ` en ${bodegaLabel}` : ' en tránsito'} ahora mismo.`,
        accionLabel: 'Ver inventario',
        accionHref: '/dashboard/inventario',
      }
    }
    const lista = skusScope
      .slice(0, 6)
      .map(s => formatSkuStockLine(s, { short: true, bodegaLabel }))
      .join('; ')
    return {
      mensaje: `Inventario${bodegaLabel ? ` en ${bodegaLabel}` : ''}: ${lista}${skusScope.length > 6 ? '…' : ''}.`,
      accionLabel: 'Ver inventario',
      accionHref: '/dashboard/inventario',
    }
  }

  if (wantsStock) {
    const sku = resolveSkuFromQuery(query, { ...ctx, skus: skusScope })
    if (sku) {
      return {
        mensaje: formatSkuStockLine(sku, { bodegaLabel }),
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
    q.includes('cuentas por cobrar') ||
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
      mensaje: `Tienes $${total.toLocaleString('es-MX')} por cobrar de ${n} cuenta${n === 1 ? '' : 's'}.`,
      accionLabel: 'Ver crédito',
      accionHref: '/dashboard/credito',
    }
  }

  if (
    q.includes('deuda vencida') ||
    q.includes('vencida') ||
    q.includes('vencidos') ||
    (q.includes('deben') && q.includes('venc'))
  ) {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })
    const vencidas = (ctx.credito.cuentas ?? []).filter(
      c =>
        c.estado === 'vencida' ||
        (c.fecha_vencimiento != null && c.fecha_vencimiento < today && c.saldo_pendiente > 0)
    )
    if (vencidas.length === 0) {
      return {
        mensaje: 'Ningún cliente con deuda vencida.',
        accionLabel: 'Ver crédito',
        accionHref: '/dashboard/credito',
      }
    }
    const lista = vencidas
      .slice(0, 4)
      .map(c => `${c.cliente_nombre} ($${c.saldo_pendiente.toLocaleString('es-MX')})`)
      .join('; ')
    const totalVenc = vencidas.reduce((s, c) => s + c.saldo_pendiente, 0)
    return {
      mensaje: `${vencidas.length} cuenta${vencidas.length === 1 ? '' : 's'} vencida${vencidas.length === 1 ? '' : 's'} por $${totalVenc.toLocaleString('es-MX')}: ${lista}${vencidas.length > 4 ? '…' : ''}.`,
      accionLabel: 'Ver crédito',
      accionHref: '/dashboard/credito',
    }
  }

  if (
    q.includes('pedidos pendientes') ||
    q.includes('por entregar') ||
    q.includes('que hay por entregar') ||
    (q.includes('pendiente') && q.includes('entrega')) ||
    (q.includes('confirmado') && q.includes('entrega')) ||
    (q.includes('esperando') && q.includes('pedido')) ||
    (q.includes('cliente') && q.includes('esperando'))
  ) {
    const n = ctx.pedidos_pendientes_entrega.length
    if (n === 0) {
      return {
        mensaje: 'No hay pedidos pendientes de entrega (confirmados, preparando o en ruta).',
        accionLabel: 'Ver pedidos',
        accionHref: '/dashboard/pedidos',
      }
    }
    const nums = ctx.pedidos_pendientes_entrega
      .slice(0, 3)
      .map(p => `${p.numero} (${p.estado})`)
      .join(', ')
    return {
      mensaje: `${n} pedido${n === 1 ? '' : 's'} por entregar${n <= 3 ? `: ${nums}` : ''}.`,
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

  return null
}
