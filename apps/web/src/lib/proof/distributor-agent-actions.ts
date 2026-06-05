import type { SupabaseClient } from '@supabase/supabase-js'
import type { DistributorAgentContext } from '@/lib/proof/distributor-agent-context'
import type { ProfileScope } from '@/lib/supabase'
import {
  confirmarLlegadaOrdenCompraDistribuidor,
  createOrdenCompraDistribuidor,
  rpcEntregarPedido,
  type ConfirmarLlegadaOcLinea,
} from '@/lib/supabase/distribuidor'

export type DistributorAgentActionType =
  | 'confirmar_entrega'
  | 'registrar_pago'
  | 'actualizar_precio'
  | 'agregar_nota'
  | 'crear_orden_compra'
  | 'confirmar_llegada_distribuidor'

export type DistributorAgentAction =
  | { type: 'confirmar_entrega'; pedido_id: string }
  | {
      type: 'registrar_pago'
      cuenta_id: string
      monto: number
      cliente_nombre: string
    }
  | { type: 'actualizar_precio'; sku_id: string; precio: number; nombre: string }
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
  if (n.includes('nota') || n.includes('anotar') || n.includes('comentario')) return true
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
  return false
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
  const wantsOrder =
    q.includes('ordenar') ||
    q.includes('hacer pedido') ||
    q.includes('hacer un pedido') ||
    q.includes('comprar') ||
    (q.includes('pedido') && q.includes('de') && !q.includes('llego') && !q.includes('llegó'))

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

function resolveCuentaPorCliente(
  q: string,
  ctx: DistributorAgentContext
): (typeof ctx.credito.cuentas)[number] | null {
  let best: (typeof ctx.credito.cuentas)[number] | null = null
  let bestLen = 0
  for (const c of ctx.credito.cuentas) {
    const nombre = normQ(c.cliente_nombre)
    if (nombre.length < 2) continue
    if (q.includes(nombre) && nombre.length > bestLen) {
      best = c
      bestLen = nombre.length
    }
  }
  return best
}

export function parseDistributorActionIntent(
  query: string,
  ctx: DistributorAgentContext
): DistributorAgentAction | null {
  const q = normQ(query)

  const llegada = parseConfirmarLlegadaOcIntent(q, ctx)
  if (llegada) return llegada

  const crearOc = parseCrearOrdenCompraIntent(q)
  if (crearOc) return crearOc

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

  return null
}

export async function executeDistributorAgentAction(
  sb: SupabaseClient,
  clerkId: string,
  scope: ProfileScope,
  action: DistributorAgentAction
): Promise<{ ok: true; message: string; entityId: string }> {
  switch (action.type) {
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
      return {
        ok: true,
        entityId: updated.id,
        message: `Pedido ${pedido.numero} marcado como entregado ✓`,
      }
    }
    case 'registrar_pago': {
      const { data: cuenta, error: cErr } = await sb
        .from('cuentas_clientes')
        .select('id, saldo_pendiente, cliente_id')
        .eq('id', action.cuenta_id)
        .eq('clerk_id', clerkId)
        .maybeSingle()
      if (cErr) throw cErr
      if (!cuenta) throw new Error('Cuenta de cliente no encontrada')
      const saldo = Number(cuenta.saldo_pendiente)
      const nuevo = Math.max(0, saldo - action.monto)
      const { error: upErr } = await sb
        .from('cuentas_clientes')
        .update({
          saldo_pendiente: nuevo,
          updated_at: new Date().toISOString(),
        })
        .eq('id', action.cuenta_id)
        .eq('clerk_id', clerkId)
      if (upErr) throw upErr
      return {
        ok: true,
        entityId: action.cuenta_id,
        message: `Pago de $${action.monto.toLocaleString('es-MX')} registrado para ${action.cliente_nombre} ✓ Saldo: $${nuevo.toLocaleString('es-MX')}`,
      }
    }
    case 'actualizar_precio': {
      const { error: upErr } = await sb
        .from('skus')
        .update({
          precio_venta: action.precio,
          updated_at: new Date().toISOString(),
        })
        .eq('id', action.sku_id)
        .eq('clerk_id', clerkId)
        .eq('profile_type_v2', scope.profile_type_v2)
      if (upErr) throw upErr
      return {
        ok: true,
        entityId: action.sku_id,
        message: `Precio de ${action.nombre} actualizado a $${action.precio.toLocaleString('es-MX')} ✓`,
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
        message: `Orden ${orden.numero_orden} creada ✓ ${action.cantidad} unidades de ${action.producto} pendientes de llegada`,
      }
    }
    case 'confirmar_llegada_distribuidor': {
      await confirmarLlegadaOrdenCompraDistribuidor(sb, action.orden_id, action.lineas)
      return {
        ok: true,
        entityId: action.orden_id,
        message: `Recibidas ${action.total_recibido} unidades de ${action.proveedor} ✓ Stock actualizado: ${action.total_recibido} unidades en bodega`,
      }
    }
  }
}
