import {
  cardActionsForType,
  skuStatusToCard,
  type CardItem,
  type DisplayCards,
} from '@/lib/proof/agent-response-types'
import {
  categoriaLiquidoLabel,
  filterSkusByCategoriaQuery,
} from '@/lib/proof/categoria-liquido'
import type { DistributorAgentContext } from '@/lib/proof/distributor-agent-context'
import { isSkuStockCritico } from '@/lib/proof/distributor-agent-context'
import { filterSkusByBodegaQuery } from '@/lib/proof/bodega-filter'

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
}

function mapSkuToCard(s: DistributorAgentContext['skus'][number], type: 'inventory' | 'low_stock'): CardItem {
  const catLabel = categoriaLiquidoLabel(s.categoria_liquido)
  const proveedor =
    s.productor?.trim() && norm(s.productor) !== norm(s.nombre) ? s.productor.trim() : undefined
  const secondaryValues: { label: string; value: string | number }[] = [
    { label: 'físico', value: s.stock_total },
  ]
  if (s.stock_reservado > 0) {
    secondaryValues.push({ label: 'reservado', value: s.stock_reservado })
  }
  if (s.bodega && s.bodega !== 'Principal') {
    secondaryValues.push({ label: 'bodega', value: s.bodega })
  }
  if (proveedor) {
    secondaryValues.push({ label: 'proveedor', value: proveedor })
  }
  return {
    id: s.id,
    name: s.nombre,
    subtitle: catLabel,
    status: skuStatusToCard(s.estado),
    primaryValue: { label: 'disponible', value: s.stock_disponible },
    secondaryValues,
    actions: cardActionsForType(type, s.nombre),
  }
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
}

function daysUntil(iso: string | null | undefined): string {
  if (!iso) return '—'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(`${iso}T12:00:00`)
  const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diff < 0) return 'vencido'
  if (diff === 0) return 'hoy'
  return `${diff} días`
}

export type DisplayCardsBuildResult = {
  displayCards: DisplayCards | null
  /** Query pedía datos pero no hubo items */
  emptyResults: boolean
}

function isDataQuery(q: string): boolean {
  return (
    q.includes('stock bajo') ||
    q.includes('por agotarse') ||
    q.includes('quiebre') ||
    q.includes('sin stock') ||
    q.includes('inventario') ||
    q.includes('bodega') ||
    q.includes('que hay') ||
    q.includes('pedidos pendientes') ||
    q.includes('por entregar') ||
    q.includes('por cobrar') ||
    q.includes('deuda vencida') ||
    q.includes('vencida') ||
    q.includes('vencidos') ||
    q.includes('clientes') ||
    q.includes('proveedores') ||
    q.includes('productores') ||
    q.includes('ordenes de compra') ||
    q.includes('órdenes de compra') ||
    q.includes('cuentas por pagar') ||
    q.includes('cuenta por pagar') ||
    (q.includes('compra') && q.includes('pendiente')) ||
    (q.includes('muéstrame') || q.includes('muestrame') || q.includes('mostrar')) ||
    (q.includes('esperando') && q.includes('pedido')) ||
    (q.includes('cliente') && q.includes('esperando'))
  )
}

export function buildDistributorDisplayCards(
  query: string,
  datos: Record<string, unknown>
): DisplayCardsBuildResult {
  const ctx = datos as unknown as DistributorAgentContext
  if (ctx.perfil !== 'distribuidor' || !ctx.resumen) {
    return { displayCards: null, emptyResults: false }
  }

  const q = norm(query)
  if (!q || !isDataQuery(q)) {
    return { displayCards: null, emptyResults: false }
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
      return { displayCards: null, emptyResults: true }
    }
    const type = 'low_stock' as const
    const items: CardItem[] = criticos.slice(0, 12).map(s => {
      const full = ctx.skus.find(x => x.id === s.id)
      return mapSkuToCard(full ?? { ...s, productor: '', stock_total: s.stock_disponible, precio_venta: 0, notas: null }, type)
    })
    return {
      displayCards: { type, title: 'Stock bajo', items },
      emptyResults: false,
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
    const pedidos = ctx.pedidos_pendientes_entrega
    if (pedidos.length === 0) {
      return { displayCards: null, emptyResults: true }
    }
    const type = 'orders' as const
    const items: CardItem[] = pedidos.slice(0, 12).map(p => ({
      id: p.id,
      name: p.numero,
      subtitle: p.estado,
      status: p.estado === 'en_ruta' ? ('ok' as const) : ('warning' as const),
      primaryValue: { label: 'total', value: `$${p.total.toLocaleString('es-MX')}` },
      secondaryValues: [{ label: 'entrega', value: formatDate(p.fecha_entrega) }],
      actions: cardActionsForType(type, p.numero),
    }))
    return {
      displayCards: { type, title: 'Pedidos pendientes', items },
      emptyResults: false,
    }
  }

  if (
    q.includes('deuda vencida') ||
    (q.includes('vencida') && !q.includes('por cobrar')) ||
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
      return { displayCards: null, emptyResults: true }
    }
    const type = 'receivables' as const
    const items: CardItem[] = vencidas.slice(0, 12).map(c => ({
      id: c.id,
      name: c.cliente_nombre,
      status: 'danger' as const,
      primaryValue: {
        label: 'por cobrar',
        value: `$${c.saldo_pendiente.toLocaleString('es-MX')}`,
      },
      secondaryValues: [{ label: 'vence en', value: daysUntil(c.fecha_vencimiento) }],
      actions: cardActionsForType(type, c.cliente_nombre),
    }))
    return {
      displayCards: { type, title: 'Deuda vencida', items },
      emptyResults: false,
    }
  }

  if (
    q.includes('por cobrar') ||
    q.includes('cobros pendientes') ||
    q.includes('me deben') ||
    (q.includes('cobrar') && (q.includes('cuanto') || q.includes('cuanta')))
  ) {
    if (q.includes('proveedor') || q.includes('productor') || (q.includes('debo') && !q.includes('cliente'))) {
      return { displayCards: null, emptyResults: false }
    }
    const cuentas = (ctx.credito.cuentas ?? []).filter(c => c.saldo_pendiente > 0)
    if (cuentas.length === 0) {
      return { displayCards: null, emptyResults: true }
    }
    const type = 'receivables' as const
    const items: CardItem[] = cuentas.slice(0, 12).map(c => {
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })
      const vencida =
        c.estado === 'vencida' ||
        (c.fecha_vencimiento != null && c.fecha_vencimiento < today)
      return {
        id: c.id,
        name: c.cliente_nombre,
        status: vencida ? ('danger' as const) : ('warning' as const),
        primaryValue: {
          label: 'por cobrar',
          value: `$${c.saldo_pendiente.toLocaleString('es-MX')}`,
        },
        secondaryValues: [{ label: 'vence en', value: daysUntil(c.fecha_vencimiento) }],
        actions: cardActionsForType(type, c.cliente_nombre),
      }
    })
    return {
      displayCards: { type, title: 'Por cobrar', items },
      emptyResults: false,
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
      return { displayCards: null, emptyResults: true }
    }
    const items: CardItem[] = ordenes.slice(0, 12).map(o => {
      const pendiente = o.items.reduce(
        (s, it) => s + Math.max(it.cantidad_ordenada - (it.cantidad_recibida ?? 0), 0),
        0
      )
      return {
        id: o.id,
        name: o.numero_orden,
        subtitle: o.proveedor_nombre,
        status: o.estado === 'parcial' ? ('warning' as const) : ('neutral' as const),
        primaryValue: { label: 'pendiente', value: `${pendiente} u.` },
        secondaryValues: o.items.slice(0, 2).map(it => ({
          label: it.producto_nombre,
          value: `${it.cantidad_recibida ?? 0}/${it.cantidad_ordenada}`,
        })),
        actions: cardActionsForType('providers', o.proveedor_nombre),
      }
    })
    return {
      displayCards: { type: 'providers', title: 'Órdenes de compra', items },
      emptyResults: false,
    }
  }

  if (q.includes('proveedor') || q.includes('productores') || q.includes('orden de compra')) {
    const ordenes = ctx.ordenes_compra_pendientes ?? []
    const cxp = ctx.cxp?.cuentas ?? []
    const seen = new Set<string>()
    const items: CardItem[] = []

    for (const o of ordenes) {
      if (seen.has(o.proveedor_nombre)) continue
      seen.add(o.proveedor_nombre)
      const type = 'providers' as const
      items.push({
        id: o.id,
        name: o.proveedor_nombre,
        subtitle: o.numero_orden,
        status: 'neutral' as const,
        primaryValue: { label: 'pedidos', value: o.numero_orden },
        actions: cardActionsForType(type, o.proveedor_nombre),
      })
    }
    for (const c of cxp) {
      if (seen.has(c.proveedor_nombre)) continue
      seen.add(c.proveedor_nombre)
      const type = 'providers' as const
      items.push({
        id: c.id,
        name: c.proveedor_nombre,
        status: 'warning' as const,
        primaryValue: {
          label: 'por pagar',
          value: `$${c.saldo_pendiente.toLocaleString('es-MX')}`,
        },
        actions: cardActionsForType(type, c.proveedor_nombre),
      })
    }
    if (items.length === 0) {
      return { displayCards: null, emptyResults: q.includes('proveedor') || q.includes('productor') }
    }
    return {
      displayCards: { type: 'providers', title: 'Proveedores', items: items.slice(0, 12) },
      emptyResults: false,
    }
  }

  if (q.includes('clientes') || q.includes('cliente')) {
    const pedidos = ctx.pedidos.filter(p =>
      ['confirmado', 'preparando', 'en_ruta', 'borrador'].includes(p.estado)
    )
    const seen = new Map<string, CardItem>()
    for (const p of pedidos) {
      const name = p.etiqueta_nombre ?? p.numero
      if (seen.has(name)) continue
      const type = 'clients' as const
      seen.set(name, {
        id: p.id,
        name,
        status: 'ok' as const,
        primaryValue: { label: 'pedidos', value: p.numero },
        actions: cardActionsForType(type, name),
      })
    }
    const items = [...seen.values()]
    if (items.length === 0) {
      return { displayCards: null, emptyResults: true }
    }
    return {
      displayCards: { type: 'clients', title: 'Clientes', items: items.slice(0, 12) },
      emptyResults: false,
    }
  }

  if (
    q.includes('inventario') ||
    q.includes('stock') ||
    q.includes('sku') ||
    q.includes('bodega') ||
    (q.includes('muéstrame') && !q.includes('pedido') && !q.includes('cobrar')) ||
    (q.includes('muestrame') && !q.includes('pedido') && !q.includes('cobrar'))
  ) {
    const { bodega: bodegaFilter, transito, items: skusEnBodega } = filterSkusByBodegaQuery(
      ctx.skus,
      query
    )
    const skusScope = bodegaFilter || transito ? skusEnBodega : ctx.skus
    const { categoria, items: filteredSkus } = filterSkusByCategoriaQuery(skusScope, query)
    if (filteredSkus.length === 0) {
      return { displayCards: null, emptyResults: true }
    }
    const type = 'inventory' as const
    const bodegaTitle = bodegaFilter ?? (transito ? 'Tránsito' : null)
    const title = categoria
      ? categoriaLiquidoLabel(categoria) + 's'
      : bodegaTitle
        ? `Inventario · ${bodegaTitle}`
        : 'Inventario'
    const items: CardItem[] = filteredSkus.slice(0, 12).map(s => mapSkuToCard(s, type))
    return {
      displayCards: { type, title, items },
      emptyResults: false,
    }
  }

  return { displayCards: null, emptyResults: false }
}
