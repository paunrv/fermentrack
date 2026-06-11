import type { SupabaseClient } from '@supabase/supabase-js'
import type { DistributorAgentContext } from '@/lib/proof/distributor-agent-context'
import { ensureRemisionPdfForPedido } from '@/lib/proof/remision-salida-server'
import {
  finalizarTomaPedido,
  type UnidadPedido,
} from '@/lib/proof/toma-pedido-client'
import {
  extractTomaPedidoDraft,
  isConfirmationReply,
  looksLikeTomaPedidoQuery,
  resolveTomaPedidoDraft,
  type AgentConversationTurn,
} from '@/lib/proof/toma-pedido-intent'
import {
  categoriaLiquidoLabel,
  looksLikeEditarSkuQuery,
  parseCategoriaLiquidoFromQuery,
} from '@/lib/proof/categoria-liquido'
import { uploadSkuImagen } from '@/lib/proof/storage-skus'
import type { ProfileScope } from '@/lib/supabase'
import {
  confirmarLlegadaOrdenCompraDistribuidor,
  createOrdenCompraDistribuidor,
  fetchSkus,
  rpcEntregarPedido,
  rpcRegistrarPagoCliente,
  rpcRegistrarPagoProveedor,
  updateSkuCartera,
  type CategoriaLiquido,
  type ConfirmarLlegadaOcLinea,
} from '@/lib/supabase/distribuidor'

export type DistributorAgentActionType =
  | 'confirmar_entrega'
  | 'crear_toma_pedido'
  | 'registrar_pago'
  | 'actualizar_precio'
  | 'editar_sku'
  | 'agregar_nota'
  | 'crear_orden_compra'
  | 'confirmar_llegada_distribuidor'
  | 'registrar_pago_proveedor'
  | 'generar_remision'
  | 'set_sku_image'
  | 'abrir_imagen_sku'

export type DistributorAgentAction =
  | { type: 'confirmar_entrega'; pedido_id: string; sku_id?: string | null }
  | {
      type: 'crear_toma_pedido'
      cantidad: number
      unidad: UnidadPedido
      etiqueta: string
      cliente: string
      sku_id: string | null
    }
  | {
      type: 'registrar_pago'
      cuenta_id: string
      monto: number
      cliente_nombre: string
    }
  | { type: 'actualizar_precio'; sku_id: string; precio: number; nombre: string }
  | {
      type: 'editar_sku'
      sku_id: string
      nombre: string
      categoria_liquido?: CategoriaLiquido
      precio_venta?: number
    }
  | { type: 'agregar_nota'; sku_id: string; nota: string; nombre: string }
  | {
      type: 'crear_orden_compra'
      proveedor: string
      producto: string
      cantidad: number
      costo?: number
    }
  | {
      type: 'confirmar_llegada_distribuidor'
      orden_id: string
      lineas: ConfirmarLlegadaOcLinea[]
      proveedor: string
      producto_resumen: string
      total_recibido: number
    }
  | {
      type: 'registrar_pago_proveedor'
      cuenta_id: string
      monto: number
      proveedor_nombre: string
    }
  | { type: 'generar_remision'; pedido_id: string; numero: string }
  | { type: 'set_sku_image'; sku_id: string; nombre: string; image: string }
  | { type: 'abrir_imagen_sku'; sku_id: string; nombre: string }

function normQ(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
}

export function looksLikeDistributorMutation(q: string): boolean {
  const n = normQ(q)
  if (looksLikeTomaPedidoQuery(n) || isConfirmationReply(n)) return true
  if (
    (n.includes('entregar') || n.includes('entregado') || n.includes('marcar')) &&
    (n.includes('pedido') || n.includes('entrega'))
  ) {
    return true
  }
  if (/\bpag[oó]\b/.test(n) || n.includes('registrar pago')) return true
  if (
    n.includes('precio') &&
    (n.includes('cambiar') || n.includes('actualizar') || n.includes('poner') || n.includes('a $'))
  ) {
    return true
  }
  if (
    (n.includes('categor') || n.includes('categoria')) &&
    (n.includes('cambiar') ||
      n.includes('editar') ||
      n.includes('actualizar') ||
      n.includes('poner'))
  ) {
    return true
  }
  if (n.includes('editar') && (n.includes('sku') || n.includes('producto'))) {
    return true
  }
  if (n.includes('nota') || n.includes('anotar') || n.includes('comentario')) return true
  if (
    (n.includes('remision') || n.includes('remisión')) &&
    (n.includes('generar') || n.includes('crear') || n.includes('pedido'))
  ) {
    return true
  }
  if (
    n.includes('orden') &&
    (n.includes('compr') || n.includes('pedido') || n.includes('ordenar'))
  ) {
    return true
  }
  if (
    (n.includes('llego') || n.includes('llegó') || n.includes('recib') || n.includes('llegada')) &&
    (n.includes('pedido') || n.includes('orden') || n.includes('oc-') || n.includes('mercanc'))
  ) {
    return true
  }
  if (
    n.includes('imagen') ||
    n.includes('foto') ||
    n.includes('fotografia') ||
    n.includes('fotografía') ||
    n.includes('subir imagen') ||
    n.includes('agregar imagen')
  ) {
    return true
  }
  return false
}

function parseEditarSkuIntent(
  query: string,
  ctx: DistributorAgentContext
): Extract<DistributorAgentAction, { type: 'editar_sku' }> | null {
  if (!looksLikeEditarSkuQuery(query)) return null

  const q = normQ(query)

  const sku = resolveSku(q, ctx)
  if (!sku) {
    console.log('[agente] editar_sku: SKU no resuelto', {
      query,
      skusEnContexto: ctx.skus.length,
      nombres: ctx.skus.slice(0, 5).map(s => s.nombre),
    })
    return null
  }

  const categoria_liquido = parseCategoriaLiquidoFromQuery(query) ?? undefined
  const precio_venta = parsePrecioFromQuery(q) ?? undefined

  if (categoria_liquido == null && precio_venta == null) return null

  return {
    type: 'editar_sku',
    sku_id: sku.id,
    nombre: sku.nombre,
    ...(categoria_liquido != null ? { categoria_liquido } : {}),
    ...(precio_venta != null ? { precio_venta } : {}),
  }
}

function parsePrecioFromQuery(q: string): number | null {
  const m = q.match(/\$?\s*([\d,]+(?:\.\d{1,2})?)/)
  if (!m?.[1]) return null
  const n = Number(m[1].replace(/,/g, ''))
  return Number.isFinite(n) && n > 0 ? n : null
}

function parseMontoFromQuery(q: string): number | null {
  const explicit = q.match(
    /\$?\s*([\d,]+(?:\.\d{1,2})?)\s*(?:pesos|mxn|de pago|de abono)?/
  )
  if (explicit?.[1]) {
    const n = Number(explicit[1].replace(/,/g, ''))
    if (Number.isFinite(n) && n > 0) return n
  }
  return parsePrecioFromQuery(q)
}

function resolveSku(
  q: string,
  ctx: DistributorAgentContext
): DistributorAgentContext['skus'][number] | null {
  if (ctx.selectedSkuId) {
    const hit = ctx.skus.find(s => s.id === ctx.selectedSkuId)
    if (hit) return hit
  }
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
    const nombre = normQ(s.nombre)
    if (nombre.length < 3) continue
    if (q.includes(nombre) && nombre.length > bestLen) {
      best = s
      bestLen = nombre.length
    }
  }
  return best
}

function resolvePedido(
  q: string,
  ctx: DistributorAgentContext
): DistributorAgentContext['pedidos'][number] | null {
  const numMatch = q.match(/pedido\s*#?\s*([\w-]+)/i) ?? q.match(/#([\w-]+)/)
  if (numMatch?.[1]) {
    const frag = numMatch[1].toUpperCase()
    const hit = ctx.pedidos.find(
      p =>
        p.numero.toUpperCase() === frag ||
        p.numero.toUpperCase().includes(frag)
    )
    if (hit) return hit
  }
  const uuidFrag = q.match(/\b([a-f0-9]{8,32})\b/i)
  if (uuidFrag?.[1]) {
    const frag = uuidFrag[1].toLowerCase()
    const hit = ctx.pedidos.find(
      p => p.id.toLowerCase().startsWith(frag) || p.id.toLowerCase().includes(frag)
    )
    if (hit) return hit
  }
  const confirmados = ctx.pedidos.filter(p => p.estado === 'confirmado')
  if (confirmados.length === 1) return confirmados[0]!
  return null
}

function parseCantidadFromQuery(q: string): number | null {
  const latas = q.match(/(\d[\d,]*)\s*latas?/)
  if (latas?.[1]) {
    const n = Number(latas[1].replace(/,/g, ''))
    if (Number.isFinite(n) && n > 0) return n
  }
  const cajas = q.match(/(\d[\d,]*)\s*cajas?/)
  if (cajas?.[1]) {
    const n = Number(cajas[1].replace(/,/g, ''))
    if (Number.isFinite(n) && n > 0) return n
  }
  const uds = q.match(/(\d[\d,]*)\s*(?:unidades?|uds?|botellas?|bts?)\b/)
  if (uds?.[1]) {
    const n = Number(uds[1].replace(/,/g, ''))
    if (Number.isFinite(n) && n > 0) return n
  }
  const deMatch = q.match(/\b(?:ordenar|comprar|pedir|hacer pedido de)\s+(\d[\d,]*)/)
  if (deMatch?.[1]) {
    const n = Number(deMatch[1].replace(/,/g, ''))
    if (Number.isFinite(n) && n > 0) return n
  }
  return null
}

function parseProductoFromQuery(q: string): string | null {
  if (looksLikeEditarSkuQuery(q)) return null
  const de = q.match(/\bde\s+([a-záéíóúñ0-9][a-záéíóúñ0-9\s\-]{2,40}?)(?:\s+a\s+\$|\s+por\s+\$|\s+cajas?|\s+unidades?|$)/)
  if (de?.[1]) return de[1].trim()
  const orden = q.match(/(?:ordenar|comprar|pedir)\s+\d+\s+(?:cajas?\s+)?de\s+([a-záéíóúñ0-9][^,$]+)/)
  if (orden?.[1]) return orden[1].trim()
  return null
}

function parseProveedorFromQuery(q: string): string | null {
  const pedidoDe = q.match(/pedido\s+de\s+([a-záéíóúñ][a-záéíóúñ\s]{2,40}?)(?:\s|$|\.|,)/)
  if (pedidoDe?.[1]) return pedidoDe[1].trim()
  const llego = q.match(/lleg[oó]\s+(?:el\s+)?pedido\s+de\s+([a-záéíóúñ][a-záéíóúñ\s]{2,40}?)(?:\s|$|\.|,)/)
  if (llego?.[1]) return llego[1].trim()
  return null
}

function resolveOrdenCompra(
  q: string,
  ctx: DistributorAgentContext
): DistributorAgentContext['ordenes_compra_pendientes'][number] | null {
  const ocMatch = q.match(/\boc[-\s]?(\d+)\b/i)
  if (ocMatch?.[1]) {
    const frag = `OC-${ocMatch[1].padStart(3, '0')}`
    const hit = ctx.ordenes_compra_pendientes.find(
      o => o.numero_orden.toUpperCase() === frag || o.numero_orden.includes(ocMatch[1]!)
    )
    if (hit) return hit
  }

  const proveedor = parseProveedorFromQuery(q)
  if (proveedor) {
    const provNorm = normQ(proveedor)
    const byProv = ctx.ordenes_compra_pendientes.filter(o =>
      normQ(o.proveedor_nombre).includes(provNorm)
    )
    if (byProv.length === 1) return byProv[0]!
  }

  for (const o of ctx.ordenes_compra_pendientes) {
    for (const it of o.items) {
      const nombre = normQ(it.producto_nombre)
      if (nombre.length >= 3 && q.includes(nombre)) return o
    }
  }

  if (ctx.ordenes_compra_pendientes.length === 1) {
    return ctx.ordenes_compra_pendientes[0]!
  }
  return null
}

function parseCrearOrdenCompraIntent(
  q: string
): Extract<DistributorAgentAction, { type: 'crear_orden_compra' }> | null {
  if (looksLikeEditarSkuQuery(q)) return null
  if (looksLikeVentaPedidoQuery(q)) return null

  const wantsOrder =
    q.includes('ordenar') ||
    q.includes('hacer pedido de compra') ||
    q.includes('orden de compra') ||
    q.includes('comprar') ||
    (q.includes('pedido de') && !q.includes('pedido para') && !q.includes('llego') && !q.includes('llegó'))

  if (!wantsOrder) return null

  const cantidad = parseCantidadFromQuery(q)
  const producto = parseProductoFromQuery(q)
  const proveedor = parseProveedorFromQuery(q) ?? producto
  const costo = parsePrecioFromQuery(q) ?? undefined

  if (!cantidad || !producto) return null

  return {
    type: 'crear_orden_compra',
    proveedor: proveedor || 'Por registrar',
    producto,
    cantidad,
    costo,
  }
}

function parseConfirmarLlegadaOcIntent(
  q: string,
  ctx: DistributorAgentContext
): Extract<DistributorAgentAction, { type: 'confirmar_llegada_distribuidor' }> | null {
  if (looksLikeEditarSkuQuery(q)) return null

  const wantsConfirm =
    (q.includes('llego') ||
      q.includes('llegó') ||
      q.includes('recib') ||
      q.includes('llegada') ||
      q.includes('confirmar')) &&
    (q.includes('pedido') ||
      q.includes('orden') ||
      q.includes('oc-') ||
      q.includes('mercanc') ||
      q.includes('caja'))

  if (!wantsConfirm) return null

  const orden = resolveOrdenCompra(q, ctx)
  if (!orden) return null

  const esParcial =
    q.includes('parcial') ||
    (q.includes('solo') && q.includes('lleg')) ||
    (q.includes('falt') && q.includes('lleg'))

  const cantidadExplicita = parseCantidadFromQuery(q)
  const esCompleto =
    !esParcial &&
    (q.includes('completo') ||
      q.includes('todo') ||
      q.includes('toda') ||
      cantidadExplicita == null)

  const lineas: ConfirmarLlegadaOcLinea[] = orden.items.map(it => {
    let recibida = it.cantidad_ordenada
    if (!esCompleto && cantidadExplicita != null && orden.items.length === 1) {
      recibida = cantidadExplicita
    } else if (esParcial && cantidadExplicita != null && orden.items.length === 1) {
      recibida = cantidadExplicita
    } else if (it.cantidad_recibida != null) {
      recibida = Math.max(it.cantidad_ordenada - it.cantidad_recibida, 0)
      if (esCompleto) recibida = it.cantidad_ordenada - (it.cantidad_recibida ?? 0)
    }
    return { item_id: it.id, cantidad_recibida: recibida }
  })

  const totalRecibido = lineas.reduce((s, l) => s + l.cantidad_recibida, 0)
  if (totalRecibido <= 0) return null

  const productoResumen =
    orden.items.length === 1
      ? orden.items[0]!.producto_nombre
      : `${orden.items.length} productos`

  return {
    type: 'confirmar_llegada_distribuidor',
    orden_id: orden.id,
    lineas,
    proveedor: orden.proveedor_nombre,
    producto_resumen: productoResumen,
    total_recibido: totalRecibido,
  }
}

function resolveCuentaPorProveedor(
  q: string,
  ctx: DistributorAgentContext
): DistributorAgentContext['cxp']['cuentas'][number] | null {
  let best: DistributorAgentContext['cxp']['cuentas'][number] | null = null
  let bestLen = 0
  for (const c of ctx.cxp.cuentas) {
    const nombre = normQ(c.proveedor_nombre)
    if (nombre.length < 2) continue
    if (q.includes(nombre) && nombre.length > bestLen) {
      best = c
      bestLen = nombre.length
    }
  }
  if (best) return best
  if (ctx.cxp.cuentas.length === 1) return ctx.cxp.cuentas[0]!
  return null
}

function parsePagoProveedorIntent(
  q: string,
  ctx: DistributorAgentContext
): Extract<DistributorAgentAction, { type: 'registrar_pago_proveedor' }> | null {
  const wantsPay =
    /\bpag[oó]\b/.test(q) ||
    q.includes('registrar pago') ||
    (q.includes('registrar') && q.includes('pago'))

  if (!wantsPay || ctx.cxp.cuentas.length === 0) return null

  const cuenta = resolveCuentaPorProveedor(q, ctx)
  if (!cuenta) return null

  const monto = parseMontoFromQuery(q) ?? cuenta.saldo_pendiente
  if (monto <= 0) return null

  return {
    type: 'registrar_pago_proveedor',
    cuenta_id: cuenta.id,
    monto: Math.min(monto, cuenta.saldo_pendiente),
    proveedor_nombre: cuenta.proveedor_nombre,
  }
}

function resolveCuentaPorCliente(
  q: string,
  ctx: DistributorAgentContext
): (typeof ctx.credito.cuentas)[number] | null {
  const qCompact = q.replace(/\s+/g, '')
  let best: (typeof ctx.credito.cuentas)[number] | null = null
  let bestLen = 0
  for (const c of ctx.credito.cuentas) {
    const nombre = normQ(c.cliente_nombre)
    if (nombre.length < 2) continue
    const nombreCompact = nombre.replace(/\s+/g, '')
    if (
      (q.includes(nombre) || qCompact.includes(nombreCompact)) &&
      nombre.length > bestLen
    ) {
      best = c
      bestLen = nombre.length
      continue
    }
    const tokens = nombre.split(/\s+/).filter(t => t.length >= 3)
    if (tokens.length > 0 && tokens.every(t => q.includes(t)) && nombre.length > bestLen) {
      best = c
      bestLen = nombre.length
    }
  }

  const debeMatch = q.match(/\bdebe[n]?\s+(?:a\s+)?([a-z0-9\s\-'&.]{2,60})$/i)
  if (debeMatch?.[1]) {
    const frag = normQ(debeMatch[1]).replace(/\s+/g, '')
    for (const c of ctx.credito.cuentas) {
      const nombreCompact = normQ(c.cliente_nombre).replace(/\s+/g, '')
      if (frag.length >= 3 && (nombreCompact.includes(frag) || frag.includes(nombreCompact))) {
        return c
      }
    }
  }

  return best
}

function looksLikeVentaPedidoQuery(q: string): boolean {
  if (/\bpedido\s+para\b/.test(q)) return true
  if (/\bprepar(a|ame|ar)\s+(un\s+)?pedido\b/.test(q)) return true
  if (/\b(entregar|vender)\s+\d/.test(q)) return true
  if (/\bticket\b/.test(q) && !q.includes('compra')) return true
  return false
}

function parseCrearTomaPedidoDirectIntent(
  query: string,
  ctx: DistributorAgentContext
): Extract<DistributorAgentAction, { type: 'crear_toma_pedido' }> | null {
  if (looksLikeEditarSkuQuery(query)) return null
  const q = normQ(query)
  if (!looksLikeVentaPedidoQuery(q) && !looksLikeTomaPedidoQuery(q)) return null

  const wantsDirect =
    q.includes('prepara') ||
    q.includes('preparame') ||
    q.includes('genera el ticket') ||
    q.includes('generar el ticket') ||
    q.includes('generar ticket') ||
    q.includes('confirmo') ||
    isConfirmationReply(q)

  if (!wantsDirect) return null

  const draft = extractTomaPedidoDraft(query, ctx)
  if (!draft) return null

  return {
    type: 'crear_toma_pedido',
    cantidad: draft.cantidad,
    unidad: draft.unidad,
    etiqueta: draft.etiqueta,
    cliente: draft.cliente,
    sku_id: draft.sku_id,
  }
}

function parseCrearTomaPedidoIntent(
  query: string,
  ctx: DistributorAgentContext,
  conversation?: AgentConversationTurn[]
): Extract<DistributorAgentAction, { type: 'crear_toma_pedido' }> | null {
  const direct = parseCrearTomaPedidoDirectIntent(query, ctx)
  if (direct) return direct

  const q = normQ(query)
  if (!isConfirmationReply(q) && !q.includes('confirmo')) return null

  const draft = resolveTomaPedidoDraft(query, conversation, ctx)
  if (!draft) return null

  return {
    type: 'crear_toma_pedido',
    cantidad: draft.cantidad,
    unidad: draft.unidad,
    etiqueta: draft.etiqueta,
    cliente: draft.cliente,
    sku_id: draft.sku_id,
  }
}

export function parseDistributorActionIntent(
  query: string,
  ctx: DistributorAgentContext,
  conversation?: AgentConversationTurn[]
): DistributorAgentAction | null {
  const q = normQ(query)

  const editarSkuAction = parseEditarSkuIntent(query, ctx)
  if (editarSkuAction) {
    console.log('[agente] intent editar_sku', editarSkuAction)
    return editarSkuAction
  }

  const toma = parseCrearTomaPedidoIntent(query, ctx, conversation)
  if (toma) return toma

  const llegada = parseConfirmarLlegadaOcIntent(q, ctx)
  if (llegada) return llegada

  const crearOc = parseCrearOrdenCompraIntent(q)
  if (crearOc) return crearOc

  if (
    (q.includes('remision') || q.includes('remisión')) &&
    (q.includes('generar') || q.includes('crear') || q.includes('descargar'))
  ) {
    const pedido = resolvePedido(q, ctx)
    if (!pedido) return null
    if (pedido.estado !== 'entregado') return null
    return { type: 'generar_remision', pedido_id: pedido.id, numero: pedido.numero }
  }

  if (
    (q.includes('entregar') || q.includes('entregado') || q.includes('marcar')) &&
    (q.includes('pedido') || q.includes('entrega'))
  ) {
    const pedido = resolvePedido(q, ctx)
    if (!pedido) return null
    if (!['confirmado', 'preparando', 'en_ruta', 'parcial'].includes(pedido.estado)) {
      return null
    }
    return { type: 'confirmar_entrega', pedido_id: pedido.id }
  }

  if (
    /\bpag[oó]\b/.test(q) ||
    q.includes('registrar pago') ||
    (q.includes('registrar') && q.includes('pago'))
  ) {
    const pagoProveedor = parsePagoProveedorIntent(q, ctx)
    if (pagoProveedor) return pagoProveedor

    const cuenta = resolveCuentaPorCliente(q, ctx)
    if (!cuenta) return null
    const monto =
      parseMontoFromQuery(q) ?? cuenta.saldo_pendiente
    if (monto <= 0) return null
    return {
      type: 'registrar_pago',
      cuenta_id: cuenta.id,
      monto: Math.min(monto, cuenta.saldo_pendiente),
      cliente_nombre: cuenta.cliente_nombre,
    }
  }

  if (
    q.includes('precio') &&
    (q.includes('cambiar') ||
      q.includes('actualizar') ||
      q.includes('poner') ||
      q.includes('a $') ||
      q.includes('venta'))
  ) {
    const sku = resolveSku(q, ctx)
    const precio = parsePrecioFromQuery(q)
    if (!sku || precio == null) return null
    return {
      type: 'actualizar_precio',
      sku_id: sku.id,
      precio,
      nombre: sku.nombre,
    }
  }

  if (q.includes('nota') || q.includes('anotar') || q.includes('comentario')) {
    const sku = resolveSku(q, ctx)
    if (!sku) return null
    const notaMatch = query.match(/(?:nota|anotar|comentario)[:\s]+(.+)/i)
    const nota = notaMatch?.[1]?.trim()
    if (!nota) return null
    return {
      type: 'agregar_nota',
      sku_id: sku.id,
      nota,
      nombre: sku.nombre,
    }
  }

  // Abrir file picker del SkuCard (sin imagen adjunta aún)
  if (!ctx.image) {
    const wantsImage =
      q.includes('imagen') ||
      q.includes('foto') ||
      q.includes('fotografia') ||
      q.includes('fotografía') ||
      q.includes('subir imagen') ||
      q.includes('agregar imagen') ||
      q.includes('subir foto') ||
      q.includes('agregar foto') ||
      (q.includes('subir') && (q.includes('sku') || q.includes('producto'))) ||
      (q.includes('agregar') && (q.includes('imagen') || q.includes('foto')))
    if (wantsImage) {
      const sku = resolveSku(q, ctx)
      if (sku) {
        return {
          type: 'abrir_imagen_sku',
          sku_id: sku.id,
          nombre: sku.nombre,
        }
      }
    }
  }

  // SET_SKU_IMAGE — se activa cuando hay imagen adjunta y hay SKU resuelto
  if (ctx.image) {
    const sku = resolveSku(q, ctx)
    if (sku) {
      return {
        type: 'set_sku_image',
        sku_id: sku.id,
        nombre: sku.nombre,
        image: ctx.image,
      }
    }
  }

  return null
}

function todayIsoDate(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })
}

export async function executeDistributorAgentAction(
  sb: SupabaseClient,
  clerkId: string,
  scope: ProfileScope,
  action: DistributorAgentAction
): Promise<{
  ok: true
  message: string
  entityId: string
  entityKind?: 'sku' | 'pedido' | 'orden'
  refreshSkuId?: string | null
  openImagePicker?: boolean
}> {
  switch (action.type) {
    case 'crear_toma_pedido': {
      const skus = await fetchSkus(sb, scope)
      const result = await finalizarTomaPedido(sb, scope, {
        clienteName: action.cliente,
        lineas: [
          {
            etiqueta: action.etiqueta,
            cantidad: action.cantidad,
            unidad: action.unidad,
          },
        ],
        fechaEntrega: todayIsoDate(),
        anticipo: false,
        skus,
      })
      const unidadLabel =
        action.unidad === 'latas'
          ? 'latas'
          : action.unidad === 'cajas'
            ? 'cajas'
            : 'botellas'
      return {
        ok: true,
        entityId: result.pedido.id,
        entityKind: 'pedido',
        refreshSkuId: action.sku_id,
        message: `Pedido ${result.pedido.numero} confirmado ✓ ${action.cantidad} ${unidadLabel} ${action.etiqueta} → ${action.cliente}. Stock reservado.`,
      }
    }
    case 'confirmar_entrega': {
      const { data: pedido, error: pedErr } = await sb
        .from('pedidos')
        .select('id, numero, estado')
        .eq('id', action.pedido_id)
        .eq('clerk_id', clerkId)
        .maybeSingle()
      if (pedErr) throw pedErr
      if (!pedido) throw new Error('Pedido no encontrado')
      if (pedido.estado === 'entregado') {
        throw new Error(`El pedido ${pedido.numero} ya está entregado`)
      }
      const updated = await rpcEntregarPedido(sb, action.pedido_id, false)
      let refreshSkuId = action.sku_id ?? null
      if (!refreshSkuId) {
        const { data: items } = await sb
          .from('items_pedido')
          .select('sku_id')
          .eq('pedido_id', action.pedido_id)
          .limit(1)
        refreshSkuId = items?.[0]?.sku_id ?? null
      }
      let remisionLine = ''
      try {
        const rem = await ensureRemisionPdfForPedido(action.pedido_id, clerkId)
        remisionLine = ` Remisión ${rem.remision.numero_remision} lista ✓`
      } catch (e) {
        console.error('[agent] remision pdf after entrega', e)
        remisionLine = ' (PDF de remisión pendiente — genera desde el pedido)'
      }
      return {
        ok: true,
        entityId: updated.id,
        entityKind: 'pedido',
        refreshSkuId,
        message: `Pedido ${pedido.numero} marcado como entregado ✓${remisionLine}`,
      }
    }
    case 'generar_remision': {
      const rem = await ensureRemisionPdfForPedido(action.pedido_id, clerkId)
      return {
        ok: true,
        entityId: rem.remision.id,
        entityKind: 'pedido',
        message: `Remisión ${rem.remision.numero_remision} del pedido ${action.numero} lista ✓ Descarga: ${rem.downloadUrl}`,
      }
    }
    case 'registrar_pago': {
      const updated = await rpcRegistrarPagoCliente(sb, action.cuenta_id, action.monto)
      const saldo = Number(updated.saldo_pendiente)
      return {
        ok: true,
        entityId: action.cuenta_id,
        entityKind: 'pedido',
        message: `Pago de $${action.monto.toLocaleString('es-MX')} registrado ✓ Saldo pendiente: $${saldo.toLocaleString('es-MX')}`,
      }
    }
    case 'actualizar_precio': {
      try {
        await updateSkuCartera(sb, scope, action.sku_id, {
          precio_venta: action.precio,
        })
        return {
          ok: true,
          entityId: action.sku_id,
          entityKind: 'sku',
          refreshSkuId: action.sku_id,
          message: `Precio de ${action.nombre} actualizado a $${action.precio.toLocaleString('es-MX')} ✓`,
        }
      } catch (e) {
        console.error('[agente] editarSku', e)
        throw new Error(
          e instanceof Error ? e.message : 'No se pudo actualizar el precio del SKU'
        )
      }
    }
    case 'editar_sku': {
      try {
        await updateSkuCartera(sb, scope, action.sku_id, {
          ...(action.categoria_liquido != null
            ? { categoria_liquido: action.categoria_liquido }
            : {}),
          ...(action.precio_venta != null ? { precio_venta: action.precio_venta } : {}),
        })
        const parts: string[] = []
        if (action.categoria_liquido != null) {
          parts.push(`categoría ${categoriaLiquidoLabel(action.categoria_liquido)}`)
        }
        if (action.precio_venta != null) {
          parts.push(`precio $${action.precio_venta.toLocaleString('es-MX')}`)
        }
        return {
          ok: true,
          entityId: action.sku_id,
          entityKind: 'sku',
          refreshSkuId: action.sku_id,
          message: `${action.nombre} actualizado ✓ ${parts.join(' · ')}`,
        }
      } catch (e) {
        console.error('[agente] editarSku', e)
        throw new Error(
          e instanceof Error ? e.message : 'No se pudo editar el SKU'
        )
      }
    }
    case 'agregar_nota': {
      const { error: upErr } = await sb
        .from('skus')
        .update({
          notas: action.nota,
          updated_at: new Date().toISOString(),
        })
        .eq('id', action.sku_id)
        .eq('clerk_id', clerkId)
        .eq('profile_type_v2', scope.profile_type_v2)
      if (upErr) {
        const msg = upErr.message ?? ''
        if (msg.includes('notas') && (msg.includes('schema cache') || msg.includes('PGRST204'))) {
          throw new Error(
            'Falta la columna notas en skus. Aplica la migración 20250527000000_skus_catalog_columns.sql'
          )
        }
        throw upErr
      }
      return {
        ok: true,
        entityId: action.sku_id,
        entityKind: 'sku',
        message: `Nota guardada en ${action.nombre} ✓`,
      }
    }
    case 'crear_orden_compra': {
      const orden = await createOrdenCompraDistribuidor(sb, scope, {
        proveedor_nombre: action.proveedor,
        items: [
          {
            producto_nombre: action.producto,
            cantidad_ordenada: action.cantidad,
            costo_unitario: action.costo ?? 0,
          },
        ],
      })
      return {
        ok: true,
        entityId: orden.id,
        entityKind: 'orden',
        message: `Orden ${orden.numero_orden} creada ✓ ${action.cantidad} unidades de ${action.producto} pendientes de llegada`,
      }
    }
    case 'confirmar_llegada_distribuidor': {
      await confirmarLlegadaOrdenCompraDistribuidor(sb, action.orden_id, action.lineas)
      return {
        ok: true,
        entityId: action.orden_id,
        entityKind: 'orden',
        message: `Recibidas ${action.total_recibido} unidades de ${action.proveedor} ✓ Stock actualizado: ${action.total_recibido} unidades en bodega`,
      }
    }
    case 'registrar_pago_proveedor': {
      const updated = await rpcRegistrarPagoProveedor(sb, action.cuenta_id, action.monto)
      const saldo = Number(updated.saldo_pendiente)
      return {
        ok: true,
        entityId: action.cuenta_id,
        entityKind: 'sku',
        message: `Pago de $${action.monto.toLocaleString('es-MX')} registrado ✓ Saldo pendiente con ${action.proveedor_nombre}: $${saldo.toLocaleString('es-MX')}`,
      }
    }
    case 'set_sku_image': {
      await uploadSkuImagen(sb, action.sku_id, action.image)
      return {
        ok: true,
        entityId: action.sku_id,
        entityKind: 'sku',
        refreshSkuId: action.sku_id,
        message: `Imagen de ${action.nombre} actualizada ✓`,
      }
    }
    case 'abrir_imagen_sku': {
      return {
        ok: true,
        entityId: action.sku_id,
        entityKind: 'sku',
        refreshSkuId: action.sku_id,
        openImagePicker: true,
        message: `Selecciona la imagen para ${action.nombre}`,
      }
    }
    default: {
      const _exhaustive: never = action
      throw new Error(`Acción de agente no soportada: ${(_exhaustive as DistributorAgentAction).type}`)
    }
  }
}
