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
  isOrdenCompraConfirmationReply,
  isOrdenCompraFlowActive,
  resolveOrdenCompraDraft,
  extractPartialOrdenCompraDraft,
} from '@/lib/proof/toma-oc-intent'
import {
  categoriaLiquidoLabel,
  extractSkuNameFromCategoryEditQuery,
  looksLikeEditarSkuQuery,
  parseCategoriaLiquidoFromQuery,
} from '@/lib/proof/categoria-liquido'
import {
  looksLikeActualizarMiInformacionQuery,
  parseActualizarMiInformacionIntent,
} from '@/lib/proof/mi-informacion-intent'
import { uploadSkuImagen } from '@/lib/proof/storage-skus'
import { PROOF_PROFILES_TABLE, type ProfileScope, upsertProfile } from '@/lib/supabase'
import {
  confirmarLlegadaOrdenCompraDistribuidor,
  createOrdenCompraDistribuidor,
  fetchSkus,
  rpcEntregarPedido,
  rpcActualizarEstadoPedido,
  rpcRegistrarPagoCliente,
  rpcRegistrarPagoProveedor,
  updateSkuCartera,
  type CategoriaLiquido,
  type ConfirmarLlegadaOcLinea,
} from '@/lib/supabase/distribuidor'

export type DistributorAgentActionType =
  | 'confirmar_entrega'
  | 'actualizar_estado_pedido'
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
  | 'actualizar_mi_informacion'

export type DistributorAgentAction =
  | { type: 'confirmar_entrega'; pedido_id: string; sku_id?: string | null }
  | {
      type: 'actualizar_estado_pedido'
      pedido_id: string
      estado: 'preparando' | 'en_ruta'
      numero: string
    }
  | {
      type: 'crear_toma_pedido'
      cantidad: number
      unidad: UnidadPedido
      etiqueta: string
      cliente: string
      sku_id: string | null
      anticipo: boolean
      anticipo_monto: number | null
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
  | {
      type: 'actualizar_mi_informacion'
      cuenta_deposito?: string
      banco_deposito?: string
      titular_cuenta?: string
    }

function normQ(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
}

export function looksLikeDistributorMutation(q: string): boolean {
  const n = normQ(q)
  if (
    n.includes('ordenes de compra') ||
    n.includes('órdenes de compra') ||
    n.includes('cuentas por pagar') ||
    n.includes('cuenta por pagar') ||
    (n.includes('orden') && n.includes('pendiente') && n.includes('compra')) ||
    (n.includes('compra') && n.includes('pendiente') && !n.includes('cliente')) ||
    n.includes('reservad')
  ) {
    return false
  }
  if (looksLikeTomaPedidoQuery(n) || isConfirmationReply(n)) {
    if (looksLikeEntregaVentaQuery(n) || looksLikeCompraLlegadaQuery(n)) {
      /* no es confirmación de toma pedido */
    } else {
      return true
    }
  }
  if (looksLikeEntregaVentaQuery(n)) return true
  if (looksLikeActualizarEstadoPedidoQuery(n)) return true
  if (looksLikeCrearOrdenCompraQuery(n) && !needsOrdenCompraDetails(n)) return true
  if (looksLikeCompraLlegadaQuery(n)) return true
  if (/\bpag[oó]\b/.test(n) || n.includes('registrar pago')) return true
  if (
    n.includes('precio') &&
    (n.includes('cambiar') || n.includes('actualizar') || n.includes('poner') || n.includes('a $'))
  ) {
    return true
  }
  if (
    (n.includes('categor') || n.includes('categoria')) &&
    (/\b(cambi|edit|actualiz|pon)\w*\b/.test(n) ||
      /\bcategor\w*\s+de\s+.+\s+a\s+(vino|cerveza|mezcal|gin|destilado|otro)\b/.test(n))
  ) {
    return true
  }
  if (n.includes('editar') && (n.includes('sku') || n.includes('producto'))) {
    return true
  }
  if (n.includes('nota') || n.includes('anotar') || n.includes('comentario')) return true
  if (looksLikeActualizarMiInformacionQuery(n)) return true
  if (
    (n.includes('remision') || n.includes('remisión')) &&
    (n.includes('generar') || n.includes('crear') || n.includes('pedido'))
  ) {
    return true
  }
  if (
    n.includes('orden') &&
    (n.includes('compr') || n.includes('ordenar'))
  ) {
    if (needsOrdenCompraDetails(n)) return false
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

/** Compra a proveedor (OC) — sin cantidad/producto suficientes para crear. */
export function looksLikeCrearOrdenCompraQuery(q: string): boolean {
  const n = normQ(q)
  if (looksLikeEditarSkuQuery(q)) return false
  if (looksLikeVentaPedidoQuery(n)) return false
  if (looksLikeCompraLlegadaQuery(n)) return false
  return (
    n.includes('orden de compra') ||
    n.includes('crear orden') ||
    (n.includes('comprar') && !n.includes('cliente')) ||
    n.includes('ordenar') ||
    (n.includes('quiero') && n.includes('compra') && !n.includes('pedido para'))
  )
}

const PLACEHOLDER_PROVEEDOR_RE =
  /^(mi\s+)?proveedor$|^por\s+registrar$|^a\s+definir$|^sin\s+proveedor$|^proveedor\s+generico$/i

export function isValidProveedorNombre(name: string | null | undefined): boolean {
  if (!name?.trim()) return false
  return !PLACEHOLDER_PROVEEDOR_RE.test(normQ(name))
}

export function needsOrdenCompraDetails(q: string): boolean {
  if (!looksLikeCrearOrdenCompraQuery(q)) return false
  const draft = extractPartialOrdenCompraDraft(q)
  if (draft?.proveedor && isValidProveedorNombre(draft.proveedor)) return false
  if (draft && (!draft.proveedor || !isValidProveedorNombre(draft.proveedor))) return true
  const n = normQ(q)
  const cantidad = parseCantidadFromQuery(n)
  const producto = parseProductoFromCompraQuery(q)
  const proveedor = parseProveedorFromCompraQuery(q)
  return cantidad == null || producto == null || !isValidProveedorNombre(proveedor)
}

/** Llegada de mercancía de proveedor (no entrega a cliente). */
export function looksLikeCompraLlegadaQuery(q: string): boolean {
  const n = normQ(q)
  if (
    n.includes('entrega') &&
    !n.includes('mercanc') &&
    !n.includes('proveedor') &&
    !n.includes('productor') &&
    !n.includes('compra') &&
    !/\boc[-\s]?\d+/i.test(n)
  ) {
    return false
  }

  const hasArrival =
    n.includes('llego') ||
    n.includes('llegó') ||
    n.includes('entro') ||
    n.includes('entró') ||
    n.includes('recib') ||
    n.includes('llegada') ||
    n.includes('ingreso') ||
    n.includes('ingresó') ||
    (n.includes('confirmar') &&
      (n.includes('lleg') ||
        n.includes('recib') ||
        n.includes('orden') ||
        n.includes('oc') ||
        n.includes('bodega') ||
        n.includes('entro') ||
        n.includes('entró')))

  if (!hasArrival) return false

  if (/\boc[-\s]?\d+/i.test(n)) return true
  if (n.includes('orden de compra')) return true
  if (n.includes('proveedor') || n.includes('productor')) return true
  if (n.includes('mercanc')) return true
  if (n.includes('compra')) return true
  if (n.includes('bodega') && (n.includes('entro') || n.includes('entró') || n.includes('ingreso'))) {
    return true
  }
  if (n.includes('pedido de') && !looksLikeVentaPedidoQuery(n) && !/\bpedido\s+para\b/.test(n)) {
    return true
  }
  return false
}

/** Salida de bodega / pedido de venta ya confirmado. */
export function looksLikeEntregaVentaQuery(q: string): boolean {
  const n = normQ(q)
  if (looksLikeCompraLlegadaQuery(n)) return false
  if (looksLikeActualizarEstadoPedidoQuery(n)) return false
  if (/\b(entregar|vender)\s+\d/.test(n)) return false

  if (n.includes('marcar') && (n.includes('entregad') || n.includes('enviad'))) return true
  if (n.includes('enviad') && n.includes('pedido')) return true
  if (n.includes('confirmar') && n.includes('entrega') && n.includes('pedido')) return true

  if (
    (n.includes('entregar') || n.includes('entregado') || n.includes('marcar')) &&
    (n.includes('pedido') || n.includes('entrega'))
  ) {
    return true
  }
  return false
}

/** Avance operativo: preparando / en ruta (sin cerrar venta). */
export function looksLikeActualizarEstadoPedidoQuery(q: string): boolean {
  const n = normQ(q)
  if (looksLikeCompraLlegadaQuery(n)) return false
  if (/\b(entregar|vender)\s+\d/.test(n)) return false
  if (looksLikeTomaPedidoQuery(n) && !n.includes('marcar')) return false

  const mentionsPedido =
    n.includes('pedido') || /\bped[-\s]?\d+/i.test(n) || n.includes('marcar')

  if (
    mentionsPedido &&
    (n.includes('en ruta') ||
      n.includes('en camino') ||
      n.includes('salio de bodega') ||
      n.includes('salió de bodega'))
  ) {
    return true
  }

  if (
    mentionsPedido &&
    (n.includes('preparando') ||
      (n.includes('preparad') && n.includes('marcar')) ||
      (n.includes('prepara') && n.includes('pedido') && n.includes('marcar')))
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

function resolveSkuByFragment(
  frag: string,
  ctx: DistributorAgentContext
): DistributorAgentContext['skus'][number] | null {
  const p = normQ(frag)
  if (p.length < 3) return null

  let best: DistributorAgentContext['skus'][number] | null = null
  let bestLen = 0
  for (const s of ctx.skus) {
    const nombre = normQ(s.nombre)
    if (nombre.length < 3) continue
    if ((p.includes(nombre) || nombre.includes(p)) && nombre.length > bestLen) {
      best = s
      bestLen = nombre.length
    }
  }
  return best
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

  const fromCategoryEdit = extractSkuNameFromCategoryEditQuery(q)
  if (fromCategoryEdit) {
    const byName = resolveSkuByFragment(fromCategoryEdit, ctx)
    if (byName) return byName
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
  if (best) return best

  return resolveSkuByFragment(q, ctx)
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

  const fulfillable = ctx.pedidos.filter(p =>
    ['confirmado', 'preparando', 'en_ruta', 'parcial'].includes(p.estado)
  )
  const qn = normQ(q)
  let best: DistributorAgentContext['pedidos'][number] | null = null
  let bestLen = 0
  for (const p of fulfillable) {
    const name = p.etiqueta_nombre?.trim()
    if (!name) continue
    const pn = normQ(name)
    if (qn.includes(pn) && pn.length > bestLen) {
      best = p
      bestLen = pn.length
    }
  }
  if (best) return best

  if (fulfillable.length === 1) return fulfillable[0]!
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
  const deCantidad = q.match(
    /\bde\s+\d[\d,]*\s+(?:cajas?|latas?|botellas?|unidades?)\s+de\s+([a-záéíóúñ0-9][a-záéíóúñ0-9\s\-'&.]{2,50})/i
  )
  if (deCantidad?.[1]) return deCantidad[1].trim()
  const de = q.match(
    /\bde\s+([a-záéíóúñ0-9][a-záéíóúñ0-9\s\-'&.]{2,40}?)(?:\s+a\s+\$|\s+por\s+\$|\s+cajas?|\s+unidades?|$)/i
  )
  if (de?.[1] && !/^\d/.test(de[1])) return de[1].trim()
  const orden = q.match(
    /(?:ordenar|comprar|pedir)\s+\d+\s+(?:cajas?\s+)?de\s+([a-záéíóúñ0-9][^,$]+)/i
  )
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

function parseProveedorFromCompraQuery(q: string): string | null {
  const alProv = q.match(
    /\sal\s+pro?v?eedor\s+([a-záéíóúñ][a-záéíóúñ0-9\s\-'&.]{2,48})\s*$/i
  )
  if (alProv?.[1]) return alProv[1].trim()
  const aFinal = q.match(/\s+a\s+([a-záéíóúñ][a-záéíóúñ0-9\s\-'&.]{2,48})\s*$/i)
  if (aFinal?.[1]) return aFinal[1].trim()
  return parseProveedorFromQuery(q)
}

function parseProductoFromCompraQuery(q: string): string | null {
  const raw = parseProductoFromQuery(q)
  if (!raw) return null
  const proveedor = parseProveedorFromCompraQuery(q)
  if (!proveedor) return raw
  const suffix = ` a ${proveedor}`
  if (raw.toLowerCase().endsWith(suffix.toLowerCase())) {
    return raw.slice(0, -suffix.length).trim()
  }
  const aIdx = raw.toLowerCase().lastIndexOf(' a ')
  if (aIdx > 0) {
    const maybeProv = raw.slice(aIdx + 3).trim()
    if (normQ(maybeProv) === normQ(proveedor)) {
      return raw.slice(0, aIdx).trim()
    }
  }
  return raw
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

function parseCrearOrdenCompraConfirmIntent(
  query: string,
  conversation?: AgentConversationTurn[]
): Extract<DistributorAgentAction, { type: 'crear_orden_compra' }> | null {
  if (!isOrdenCompraFlowActive(conversation)) return null
  if (!isOrdenCompraConfirmationReply(query)) return null

  const draft = resolveOrdenCompraDraft(query, conversation)
  if (!draft) return null

  return {
    type: 'crear_orden_compra',
    proveedor: draft.proveedor,
    producto: draft.producto,
    cantidad: draft.cantidad,
  }
}

function parseCrearOrdenCompraIntent(
  raw: string
): Extract<DistributorAgentAction, { type: 'crear_orden_compra' }> | null {
  if (looksLikeEditarSkuQuery(raw)) return null
  if (looksLikeVentaPedidoQuery(normQ(raw))) return null

  const q = normQ(raw)
  const wantsOrder =
    q.includes('ordenar') ||
    q.includes('hacer pedido de compra') ||
    q.includes('orden de compra') ||
    q.includes('comprar') ||
    (q.includes('crear') && q.includes('orden')) ||
    (q.includes('pedido de') &&
      !looksLikeVentaPedidoQuery(q) &&
      !q.includes('pedido para') &&
      !q.includes('llego') &&
      !q.includes('llegó'))

  if (!wantsOrder) return null

  const cantidad = parseCantidadFromQuery(q)
  const producto = parseProductoFromCompraQuery(raw)
  const proveedor = parseProveedorFromCompraQuery(raw)
  const costo = parsePrecioFromQuery(q) ?? undefined

  if (!cantidad || !producto || !isValidProveedorNombre(proveedor)) return null

  return {
    type: 'crear_orden_compra',
    proveedor: proveedor!.trim(),
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
  if (!looksLikeCompraLlegadaQuery(q)) return null

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

  // cantidad_recibida en RPC = total acumulado por ítem (no incremento de esta entrega)
  const lineas: ConfirmarLlegadaOcLinea[] = orden.items.map(it => {
    const prev = it.cantidad_recibida ?? 0
    let acumulado = it.cantidad_ordenada

    if (cantidadExplicita != null && orden.items.length === 1) {
      acumulado = Math.min(prev + cantidadExplicita, it.cantidad_ordenada)
    } else if (esCompleto) {
      acumulado = it.cantidad_ordenada
    } else if (prev > 0) {
      acumulado = prev
    }

    return { item_id: it.id, cantidad_recibida: acumulado }
  })

  const totalRecibido = lineas.reduce(
    (s, l) => {
      const it = orden.items.find(i => i.id === l.item_id)
      const prev = it?.cantidad_recibida ?? 0
      return s + Math.max(0, l.cantidad_recibida - prev)
    },
    0
  )
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

  const mentionsProveedor =
    q.includes('proveedor') || q.includes('productor') || q.includes('cxp')
  const clienteMatch = resolveCuentaPorCliente(q, ctx)
  if (clienteMatch && !mentionsProveedor) return null

  const cuenta = resolveCuentaPorProveedor(q, ctx)
  let resolved = cuenta
  if (!resolved) {
    if (mentionsProveedor) return null
    if (ctx.cxp.cuentas.length === 1 && !clienteMatch) {
      resolved = ctx.cxp.cuentas[0]!
    } else {
      return null
    }
  }

  const monto = parseMontoFromQuery(q) ?? resolved.saldo_pendiente
  if (monto <= 0) return null

  return {
    type: 'registrar_pago_proveedor',
    cuenta_id: resolved.id,
    monto: Math.min(monto, resolved.saldo_pendiente),
    proveedor_nombre: resolved.proveedor_nombre,
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

export function looksLikeVentaPedidoQuery(q: string): boolean {
  if (/\bpedido\s+para\b/.test(q)) return true
  if (/\bprepar(a|ame|ar)\s+(un\s+)?pedido\b/.test(q)) return true
  if (/\b(entregar|vender)\s+\d/.test(q)) return true
  if (/\bticket\b/.test(q) && !q.includes('compra')) return true
  if (/\b(hacer|hagamos|vamos\s+a\s+hacer)\s+(un\s+)?pedido\b/.test(q)) return true
  if (
    /\b(registrar|registremos)\s+(un\s+)?(nuevo\s+)?pedido\b/.test(q) &&
    !q.includes('compra')
  ) {
    return true
  }
  if (/\bnuevo\s+pedido\b/.test(q) && !q.includes('compra') && !q.includes('orden')) {
    return true
  }
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
    anticipo: draft.anticipo,
    anticipo_monto: draft.anticipo_monto,
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
    anticipo: draft.anticipo,
    anticipo_monto: draft.anticipo_monto,
  }
}

function parseActualizarEstadoPedidoIntent(
  q: string,
  ctx: DistributorAgentContext
): Extract<DistributorAgentAction, { type: 'actualizar_estado_pedido' }> | null {
  if (!looksLikeActualizarEstadoPedidoQuery(q)) return null

  const pedido = resolvePedido(q, ctx)
  if (!pedido) return null

  const n = normQ(q)
  let estado: 'preparando' | 'en_ruta' | null = null
  if (
    n.includes('en ruta') ||
    n.includes('en camino') ||
    n.includes('salio de bodega') ||
    n.includes('salió de bodega')
  ) {
    estado = 'en_ruta'
  } else if (n.includes('preparando') || n.includes('preparad')) {
    estado = 'preparando'
  }
  if (!estado) return null

  if (estado === 'preparando' && !['confirmado', 'parcial'].includes(pedido.estado)) {
    return null
  }
  if (
    estado === 'en_ruta' &&
    !['confirmado', 'preparando', 'parcial'].includes(pedido.estado)
  ) {
    return null
  }

  return {
    type: 'actualizar_estado_pedido',
    pedido_id: pedido.id,
    estado,
    numero: pedido.numero,
  }
}

function parseConfirmarEntregaIntent(
  q: string,
  ctx: DistributorAgentContext
): Extract<DistributorAgentAction, { type: 'confirmar_entrega' }> | null {
  if (!looksLikeEntregaVentaQuery(q)) return null

  const pedido = resolvePedido(q, ctx)
  if (!pedido) return null
  if (!['confirmado', 'preparando', 'en_ruta', 'parcial'].includes(pedido.estado)) {
    return null
  }
  return { type: 'confirmar_entrega', pedido_id: pedido.id }
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

  const miInfo = parseActualizarMiInformacionIntent(query)
  if (miInfo) {
    return {
      type: 'actualizar_mi_informacion',
      ...miInfo,
    }
  }

  const ocConfirm = parseCrearOrdenCompraConfirmIntent(query, conversation)
  if (ocConfirm) return ocConfirm

  const toma = parseCrearTomaPedidoIntent(query, ctx, conversation)
  if (toma) return toma

  const avance = parseActualizarEstadoPedidoIntent(q, ctx)
  if (avance) return avance

  const entrega = parseConfirmarEntregaIntent(q, ctx)
  if (entrega) return entrega

  const llegada = parseConfirmarLlegadaOcIntent(q, ctx)
  if (llegada) return llegada

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
  userId: string,
  scope: ProfileScope,
  action: DistributorAgentAction
): Promise<{
  ok: true
  message: string
  entityId: string
  entityKind?: 'sku' | 'pedido' | 'orden'
  refreshSkuId?: string | null
  openImagePicker?: boolean
  refreshProfile?: boolean
}> {
  switch (action.type) {
    case 'crear_toma_pedido': {
      if (action.anticipo && (action.anticipo_monto == null || action.anticipo_monto <= 0)) {
        throw new Error('Escribe el monto del anticipo (ej. "con anticipo de $500")')
      }
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
        anticipo: action.anticipo,
        anticipoMonto: action.anticipo_monto,
        skus,
      })
      const unidadLabel =
        action.unidad === 'latas'
          ? 'latas'
          : action.unidad === 'cajas'
            ? 'cajas'
            : 'botellas'
      const total = Number(result.pedido.total) || 0
      const anticipoLine =
        action.anticipo && action.anticipo_monto != null
          ? total > action.anticipo_monto
            ? ` Anticipo $${action.anticipo_monto.toLocaleString('es-MX')} registrado en CxC. Saldo pendiente: $${(total - action.anticipo_monto).toLocaleString('es-MX')}.`
            : ` Anticipo $${action.anticipo_monto.toLocaleString('es-MX')} registrado en CxC.`
          : ''
      return {
        ok: true,
        entityId: result.pedido.id,
        entityKind: 'pedido',
        refreshSkuId: action.sku_id,
        message: `Pedido ${result.pedido.numero} confirmado ✓ ${action.cantidad} ${unidadLabel} ${action.etiqueta} → ${action.cliente}.${anticipoLine} Stock reservado.`,
      }
    }
    case 'actualizar_estado_pedido': {
      const updated = await rpcActualizarEstadoPedido(sb, action.pedido_id, action.estado)
      const label = action.estado === 'preparando' ? 'preparando' : 'en ruta'
      return {
        ok: true,
        entityId: updated.id,
        entityKind: 'pedido',
        message: `Pedido ${action.numero} marcado como ${label} ✓`,
      }
    }
    case 'confirmar_entrega': {
      const { data: pedido, error: pedErr } = await sb
        .from('pedidos')
        .select('id, numero, estado')
        .eq('id', action.pedido_id)
        .eq('user_id', scope.user_id)
        .eq('profile_type_v2', scope.profile_type_v2)
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
        const rem = await ensureRemisionPdfForPedido(action.pedido_id, userId)
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
      const rem = await ensureRemisionPdfForPedido(action.pedido_id, userId)
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
        .eq('user_id', scope.user_id)
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
        message: `Orden ${orden.numero_orden} creada ✓ ${action.cantidad} uds de ${action.producto} a ${action.proveedor}. Revisa el detalle arriba para exportar o confirmar llegada.`,
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
    case 'actualizar_mi_informacion': {
      const { data: profile, error: profileErr } = await sb
        .from(PROOF_PROFILES_TABLE)
        .select(
          'user_id, profile_type_v2, profile_type, username, onboarding_complete, is_super_user, extra_profiles, email, cuenta_deposito, banco_deposito, titular_cuenta, constancia_fiscal_path'
        )
        .eq('user_id', scope.user_id)
        .eq('profile_type_v2', 'distributor')
        .maybeSingle()
      if (profileErr) throw profileErr
      if (!profile) throw new Error('Perfil de distribuidor no encontrado')

      const cuenta =
        action.cuenta_deposito?.trim() ||
        profile.cuenta_deposito?.trim() ||
        null
      const banco =
        action.banco_deposito?.trim() ||
        profile.banco_deposito?.trim() ||
        null
      const titular =
        action.titular_cuenta?.trim() ||
        profile.titular_cuenta?.trim() ||
        null

      await upsertProfile(sb, {
        user_id: profile.user_id,
        profile_type_v2: profile.profile_type_v2,
        profile_type: profile.profile_type,
        username: profile.username,
        onboarding_complete: profile.onboarding_complete,
        is_super_user: profile.is_super_user,
        extra_profiles: profile.extra_profiles,
        email: profile.email,
        cuenta_deposito: cuenta,
        banco_deposito: banco,
        titular_cuenta: titular,
        constancia_fiscal_path: profile.constancia_fiscal_path ?? null,
      })

      let message: string
      if (action.banco_deposito && !action.cuenta_deposito && !action.titular_cuenta) {
        message = `Banco actualizado ✓ ${banco}`
      } else if (action.titular_cuenta && !action.cuenta_deposito && !action.banco_deposito) {
        message = `Titular actualizado ✓ ${titular}`
      } else if (action.titular_cuenta && !action.cuenta_deposito) {
        message = `Titular actualizado ✓ ${titular}`
      } else if (action.cuenta_deposito) {
        const bancoLine = banco ? `${banco} — ` : ''
        message = `Cuenta de depósito guardada ✓ ${bancoLine}${cuenta}`
        if (action.titular_cuenta) {
          message += `. Titular: ${titular}`
        }
        if (action.banco_deposito && !bancoLine) {
          message += `. Banco: ${banco}`
        }
      } else {
        message = `Mi información actualizada ✓`
      }

      return {
        ok: true,
        entityId: profile.user_id,
        refreshProfile: true,
        message,
      }
    }
    default: {
      const _exhaustive: never = action
      throw new Error(`Acción de agente no soportada: ${(_exhaustive as DistributorAgentAction).type}`)
    }
  }
}
