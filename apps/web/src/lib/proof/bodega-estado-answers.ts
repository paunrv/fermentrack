import type { CategoriaLiquido } from '@/lib/proof/types'
import {
  categoriaLiquidoLabel,
  parseCategoriaLiquidoFromQuery,
  resolveSkuCategoriaLiquido,
} from '@/lib/proof/categoria-liquido'
import type { DistributorAgentContext } from '@/lib/proof/distributor-agent-context'

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
}

function ocItemPendiente(it: {
  cantidad_ordenada: number
  cantidad_recibida: number | null
}): number {
  return Math.max(it.cantidad_ordenada - (it.cantidad_recibida ?? 0), 0)
}

function ocItemMatchesCategoria(
  productoNombre: string,
  categoria: CategoriaLiquido
): boolean {
  return (
    resolveSkuCategoriaLiquido({ nombre: productoNombre, productor: productoNombre }) ===
    categoria
  )
}

function resolveProveedorHint(
  query: string,
  ctx: DistributorAgentContext
): string | null {
  const q = norm(query)
  const names = new Set<string>()
  for (const o of ctx.ordenes_compra_pendientes ?? []) {
    if (o.proveedor_nombre?.trim()) names.add(o.proveedor_nombre.trim())
  }
  for (const c of ctx.cxp?.cuentas ?? []) {
    if (c.proveedor_nombre?.trim()) names.add(c.proveedor_nombre.trim())
  }
  for (const s of ctx.skus) {
    if (s.productor?.trim()) names.add(s.productor.trim())
  }

  let best: string | null = null
  let bestLen = 0
  for (const name of names) {
    const nn = norm(name)
    if (nn.length < 3) continue
    if (q.includes(nn) && nn.length > bestLen) {
      best = name
      bestLen = nn.length
    }
  }
  if (best) return best
  if (q.includes('proveedor') || q.includes('productor') || q.includes('mi proveedor')) {
    return null
  }
  return null
}

export function looksLikeEstadoBodegaQuery(query: string): boolean {
  const q = norm(query).replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}.!?]+$/gu, '')
  if (looksLikeBodegaFisicaLensQuery(query)) return false
  if (looksLikePendienteIngresoLensQuery(query)) return false
  if (looksLikePorPagarLensQuery(query)) return false
  if (q.includes('estado de bodega') || q.includes('estado de la bodega')) return true
  if (q.includes('que tengo en bodega') || q.includes('qué tengo en bodega')) return true
  if (q === 'bodega' || q === 'inventario') return true
  if (/^(?:que hay|qué hay)\s+en\s+(?:la\s+)?bodega[?.!]?$/.test(q)) return true
  return false
}

export function looksLikeBodegaFisicaLensQuery(query: string): boolean {
  const q = norm(query)
  return (
    q.includes('stock en bodega') ||
    q.includes('en bodega fisica') ||
    q.includes('en bodega física') ||
    (q.includes('muéstrame') && q.includes('bodega') && !q.includes('ingreso') && !q.includes('pagar'))
  )
}

export function looksLikePendienteIngresoLensQuery(query: string): boolean {
  const q = norm(query)
  return (
    q.includes('pendientes de ingreso') ||
    q.includes('pendiente de ingreso') ||
    q.includes('sin ingresar') ||
    (q.includes('compra') && q.includes('pendiente') && q.includes('ingreso'))
  )
}

export function looksLikePorPagarLensQuery(query: string): boolean {
  const q = norm(query)
  return (
    q.includes('cuentas por pagar a proveedor') ||
    q.includes('cuentas por pagar a proveedores') ||
    (q.includes('muéstrame') && q.includes('cuentas por pagar'))
  )
}

export function formatBodegaFisica(ctx: DistributorAgentContext): string {
  const conStock = ctx.skus.filter(s => s.stock_disponible > 0)
  if (conStock.length === 0) {
    if (ctx.skus.length === 0) {
      return 'En bodega: vacío. Aún no hay SKUs con stock disponible para vender.'
    }
    return 'En bodega: sin unidades disponibles (todo reservado o agotado).'
  }
  const categorias: CategoriaLiquido[] = [
    'cerveza',
    'vino',
    'mezcal',
    'gin',
    'destilado',
    'otro',
  ]
  const resumen = categorias
    .map(cat => {
      const { disponible, items } = sumByCategoria(ctx.skus, cat)
      if (disponible <= 0) return null
      const detalle = items
        .filter(s => s.stock_disponible > 0)
        .slice(0, 3)
        .map(s => `${s.nombre} (${s.stock_disponible.toLocaleString('es-MX')})`)
        .join(', ')
      return `${categoriaLiquidoLabel(cat).toLowerCase()}: ${disponible.toLocaleString('es-MX')} u. — ${detalle}`
    })
    .filter(Boolean)
  return `En bodega (listo para vender): ${resumen.join(' · ')}.`
}

export function formatPendienteIngreso(ctx: DistributorAgentContext): string {
  const ocLines = collectOcLines(ctx)
  if (ocLines.length === 0) {
    return 'Pendiente de ingreso: ninguna compra esperando recepción. Si ya pagaste, confirma llegada para sumar a bodega.'
  }
  const detalle = ocLines
    .slice(0, 4)
    .map(
      l =>
        `${l.numero} · ${l.proveedor}: ${l.pendiente.toLocaleString('es-MX')} u. de ${l.producto} (${l.recibida}/${l.ordenada} recibidas)`
    )
    .join('; ')
  return `Pendiente de ingreso: ${detalle}${ocLines.length > 4 ? '…' : ''}. Confirma recepción para sumar a bodega.`
}

export function formatPorPagarProveedor(ctx: DistributorAgentContext): string {
  const cuentas = (ctx.cxp?.cuentas ?? []).filter(c => c.saldo_pendiente > 0)
  if (cuentas.length === 0) {
    return 'Por pagar: sin deuda pendiente con proveedores. La CxP se abre al confirmar recepción de mercancía.'
  }
  const lista = cuentas
    .slice(0, 4)
    .map(c => `${c.proveedor_nombre}: $${c.saldo_pendiente.toLocaleString('es-MX')}`)
    .join('; ')
  return `Por pagar a proveedores: ${lista}${cuentas.length > 4 ? '…' : ''}. Total: $${(ctx.cxp?.total_por_pagar ?? 0).toLocaleString('es-MX')}.`
}

export function looksLikeDetalleCompraProveedorQuery(query: string): boolean {
  const q = norm(query)
  const hasProveedor = q.includes('proveedor') || q.includes('productor')
  const hasDetalle =
    q.includes('detalle') ||
    q.includes('desglose') ||
    q.includes('desglosa') ||
    q.includes('desglosar')
  const hasShow =
    q.includes('muestrame') || q.includes('muéstrame') || q.includes('mostrar')
  if (hasDetalle && hasProveedor) return true
  if (hasShow && hasProveedor && parseCategoriaLiquidoFromQuery(query) != null) return true
  return false
}

type OcLine = {
  numero: string
  proveedor: string
  producto: string
  pendiente: number
  ordenada: number
  recibida: number
  costoUnitario: number
}

function collectOcLines(
  ctx: DistributorAgentContext,
  opts?: { categoria?: CategoriaLiquido | null; proveedor?: string | null }
): OcLine[] {
  const lines: OcLine[] = []
  for (const o of ctx.ordenes_compra_pendientes ?? []) {
    if (opts?.proveedor && norm(o.proveedor_nombre) !== norm(opts.proveedor)) continue
    for (const it of o.items) {
      const pendiente = ocItemPendiente(it)
      if (pendiente <= 0) continue
      if (
        opts?.categoria &&
        !ocItemMatchesCategoria(it.producto_nombre, opts.categoria)
      ) {
        continue
      }
      lines.push({
        numero: o.numero_orden,
        proveedor: o.proveedor_nombre,
        producto: it.producto_nombre,
        pendiente,
        ordenada: it.cantidad_ordenada,
        recibida: it.cantidad_recibida ?? 0,
        costoUnitario: it.costo_unitario,
      })
    }
  }
  return lines
}

function sumByCategoria(
  skus: DistributorAgentContext['skus'],
  categoria: CategoriaLiquido
): { disponible: number; items: DistributorAgentContext['skus'] } {
  const items = skus.filter(s => s.categoria_liquido === categoria)
  return {
    items,
    disponible: items.reduce((s, x) => s + x.stock_disponible, 0),
  }
}

export function formatEstadoBodegaResumen(ctx: DistributorAgentContext): string {
  const parts: string[] = []

  const categorias: CategoriaLiquido[] = [
    'cerveza',
    'vino',
    'mezcal',
    'gin',
    'destilado',
    'otro',
  ]
  const enBodega = categorias
    .map(cat => {
      const { disponible } = sumByCategoria(ctx.skus, cat)
      if (disponible <= 0) return null
      return `${disponible.toLocaleString('es-MX')} ${categoriaLiquidoLabel(cat).toLowerCase()}`
    })
    .filter(Boolean)

  if (enBodega.length > 0) {
    parts.push(`En bodega: ${enBodega.join(' · ')}.`)
  } else if (ctx.skus.length === 0) {
    parts.push(
      'Bodega física vacía (0 SKUs con stock). Eso es distinto de una orden de compra o un pago al proveedor.'
    )
  } else {
    parts.push('Sin unidades disponibles en bodega ahora mismo.')
  }

  const ocLines = collectOcLines(ctx)
  if (ocLines.length > 0) {
    const ocResumen = ocLines
      .slice(0, 3)
      .map(
        l =>
          `${l.pendiente.toLocaleString('es-MX')} u. ${l.producto} (${l.numero} · ${l.proveedor})`
      )
      .join('; ')
    parts.push(
      `Pendiente de ingreso: ${ocResumen}${ocLines.length > 3 ? '…' : ''}. Confirma recepción para sumar a bodega.`
    )
  } else if (ctx.skus.length === 0 && (ctx.cxp?.total_por_pagar ?? 0) <= 0) {
    parts.push(
      'No hay compras pendientes de ingreso. Si ya pagaste al proveedor pero no ves stock, falta confirmar la llegada de la mercancía.'
    )
  }

  const cxp = ctx.cxp?.total_por_pagar ?? 0
  if (cxp > 0) {
    parts.push(`$${cxp.toLocaleString('es-MX')} por pagar a proveedor.`)
  }

  const criticos = ctx.skus_stock_critico?.length ?? 0
  if (criticos > 0) {
    parts.push(`${criticos} SKU${criticos === 1 ? '' : 's'} en stock crítico.`)
  }

  const sinPrecio = ctx.skus.filter(s => s.stock_disponible > 0 && s.precio_venta <= 0)
  if (sinPrecio.length > 0) {
    parts.push(
      `Sin precio de venta: ${sinPrecio
        .slice(0, 2)
        .map(s => s.nombre)
        .join(', ')}${sinPrecio.length > 2 ? '…' : ''}.`
    )
  }

  return parts.join(' ')
}

export function formatDetalleCompraProveedor(
  query: string,
  ctx: DistributorAgentContext
): string | null {
  const categoria = parseCategoriaLiquidoFromQuery(query)
  const proveedorHint = resolveProveedorHint(query, ctx)
  const { items: skusCat, disponible } = categoria
    ? sumByCategoria(ctx.skus, categoria)
    : { items: ctx.skus, disponible: ctx.skus.reduce((s, x) => s + x.stock_disponible, 0) }

  const ocLines = collectOcLines(ctx, {
    categoria: categoria ?? undefined,
    proveedor: proveedorHint ?? undefined,
  })

  const label = categoria ? categoriaLiquidoLabel(categoria).toLowerCase() : 'producto'
  const parts: string[] = []

  if (disponible > 0) {
    const lista = skusCat
      .filter(s => s.stock_disponible > 0)
      .slice(0, 4)
      .map(s => `${s.nombre}: ${s.stock_disponible.toLocaleString('es-MX')} disp.`)
      .join('; ')
    parts.push(`En bodega (${label}): ${lista}.`)
  } else {
    parts.push(`Sin ${label} en bodega física ahora mismo.`)
  }

  if (ocLines.length > 0) {
    const detalle = ocLines
      .slice(0, 4)
      .map(l => {
        const costo = l.costoUnitario > 0 ? ` · $${l.costoUnitario.toLocaleString('es-MX')}/u` : ''
        return `${l.numero} · ${l.proveedor}: ${l.pendiente.toLocaleString('es-MX')} u. de ${l.producto} (${l.recibida}/${l.ordenada} recibidas)${costo}`
      })
      .join('; ')
    parts.push(`Compra pendiente de ingreso: ${detalle}.`)
    parts.push(
      'Para sumar a bodega, confirma recepción (ej. "llegó la ' +
        ocLines[0]!.numero +
        '" o "confirmar llegada de ' +
        ocLines[0]!.pendiente.toLocaleString('es-MX') +
        ' unidades de ' +
        ocLines[0]!.producto +
        '").'
    )
  }

  const cuentas = (ctx.cxp?.cuentas ?? []).filter(c => {
    if (c.saldo_pendiente <= 0) return false
    if (proveedorHint && norm(c.proveedor_nombre) !== norm(proveedorHint)) return false
    return true
  })
  if (cuentas.length > 0) {
    const lista = cuentas
      .slice(0, 3)
      .map(c => `${c.proveedor_nombre}: $${c.saldo_pendiente.toLocaleString('es-MX')}`)
      .join('; ')
    parts.push(`Por pagar: ${lista}.`)
  }

  if (disponible === 0 && ocLines.length === 0 && cuentas.length === 0) {
    return null
  }

  return parts.join(' ')
}

export function formatCategoriaBodegaConCompras(
  ctx: DistributorAgentContext,
  categoria: CategoriaLiquido,
  bodegaLabel: string | null,
  skusScope?: DistributorAgentContext['skus']
): { mensaje: string } {
  const skus = skusScope ?? ctx.skus
  const label = categoriaLiquidoLabel(categoria)
  const { items, disponible } = sumByCategoria(skus, categoria)
  const ocLines = collectOcLines(ctx, { categoria })
  const pendienteOc = ocLines.reduce((s, l) => s + l.pendiente, 0)

  if (disponible === 0 && pendienteOc === 0) {
    return {
      mensaje: `No tienes ${label.toLowerCase()}${bodegaLabel ? ` en ${bodegaLabel}` : ' en bodega'} ahora mismo.`,
    }
  }

  const parts: string[] = []

  if (disponible > 0) {
    const lista = items
      .filter(s => s.stock_disponible > 0)
      .slice(0, 6)
      .map(s => {
        const precio =
          s.precio_venta > 0
            ? ` ($${s.precio_venta.toLocaleString('es-MX')}/u)`
            : ' (sin precio)'
        return `${s.nombre}: ${s.stock_disponible.toLocaleString('es-MX')} disp.${precio}`
      })
      .join('; ')
    parts.push(
      `${label}s${bodegaLabel ? ` en ${bodegaLabel}` : ' en bodega'}: ${lista}${items.length > 6 ? '…' : ''}.`
    )
  }

  if (pendienteOc > 0) {
    const ocResumen = ocLines
      .slice(0, 3)
      .map(l => `${l.pendiente.toLocaleString('es-MX')} u. ${l.producto} (${l.numero})`)
      .join('; ')
    parts.push(
      `Pendiente de ingreso: ${ocResumen}. Aún no está en bodega hasta confirmar recepción.`
    )
  }

  return { mensaje: parts.join(' ') }
}
