import type {
  CuentaPorCobrarRow,
  CuentaPorPagarRow,
  OrdenCompraDistribuidorWithItems,
  PedidoRow,
  SkuRow,
} from '@/lib/supabase/distribuidor'
import { resolveSkuCategoriaLiquido } from '@/lib/proof/categoria-liquido'

const CRITICO_ESTADOS = new Set(['bajo', 'quiebre', 'sobrevendido'])

export type DistributorAgentContext = {
  perfil: 'distribuidor'
  query?: string
  selectedSkuId?: string | null
  /** Imagen adjunta en base64 (para SET_SKU_IMAGE) */
  image?: string | null
  resumen: {
    skusTotal: number
    stockDisponibleTotal: number
    bajoStock: number
    quiebre: number
    pedidosActivos: number
    total_por_cobrar: number
    clientes_con_saldo: number
    clientes_vencidos: number
    pedidos_confirmados_pendientes: number
  }
  credito: {
    total_por_cobrar: number
    clientes_vencidos: number
    cuentas: {
      id: string
      pedido_id: string
      cliente_nombre: string
      saldo_pendiente: number
      monto_total: number
      estado: string
      fecha_vencimiento: string | null
    }[]
  }
  pedidos_pendientes_entrega: {
    id: string
    numero: string
    estado: string
    total: number
    fecha_entrega: string | null
  }[]
  skus_stock_critico: {
    id: string
    codigo: string
    nombre: string
    bodega: string
    stock_disponible: number
    stock_reservado: number
    stock_total: number
    estado: string
    categoria_liquido: string
  }[]
  skus: {
    id: string
    codigo: string
    nombre: string
    productor: string
    bodega: string
    stock_disponible: number
    stock_reservado: number
    stock_total: number
    estado: string
    precio_venta: number
    notas: string | null
    categoria_liquido: string
  }[]
  pedidos: {
    id: string
    numero: string
    estado: string
    total: number
    fecha_entrega: string | null
    clients_id: string
    cliente_id: string | null
    etiqueta_nombre: string | null
    notas: string | null
  }[]
  ordenes_compra_pendientes: {
    id: string
    numero_orden: string
    proveedor_nombre: string
    estado: string
    fecha_estimada: string | null
    items: {
      id: string
      producto_nombre: string
      cantidad_ordenada: number
      cantidad_recibida: number | null
      costo_unitario: number
    }[]
  }[]
  ultima_orden_ingresada: {
    id: string
    numero_orden: string
    proveedor_nombre: string
    estado: string
    fecha_recepcion: string | null
    items: {
      producto_nombre: string
      cantidad_recibida: number | null
      cantidad_ordenada: number
    }[]
  } | null
  cxp: {
    total_por_pagar: number
    proveedores_con_saldo: number
    cuentas: {
      id: string
      proveedor_nombre: string
      saldo_pendiente: number
      monto_total: number
      orden_compra_id: string
      estado: string
    }[]
  }
  /** Cuenta de depósito y constancia fiscal del distribuidor (para cobros a clientes). */
  mi_informacion: {
    titular_cuenta: string | null
    cuenta_deposito: string | null
    banco_deposito: string | null
    tiene_constancia_fiscal: boolean
  }
}

export function isSkuStockCritico(estado: string): boolean {
  return CRITICO_ESTADOS.has(estado)
}

export function buildDistributorAgentContext(
  skus: SkuRow[],
  pedidos: PedidoRow[],
  cuentasPorCobrar: CuentaPorCobrarRow[],
  ordenesCompra: OrdenCompraDistribuidorWithItems[] = [],
  cuentasPorPagar: CuentaPorPagarRow[] = [],
  opts?: {
    selectedId?: string | null
    query?: string | null
    ultimaOrdenIngresada?: OrdenCompraDistribuidorWithItems | null
    miInformacion?: {
      titular_cuenta?: string | null
      cuenta_deposito?: string | null
      banco_deposito?: string | null
      constancia_fiscal_path?: string | null
    }
  }
): DistributorAgentContext {
  const activos = pedidos.filter(p =>
    ['confirmado', 'preparando', 'en_ruta', 'borrador'].includes(p.estado)
  )
  const pendientesEntrega = pedidos.filter(p =>
    ['confirmado', 'preparando', 'en_ruta', 'parcial'].includes(p.estado)
  )
  const cuentasConSaldo = cuentasPorCobrar.filter(c => Number(c.saldo_pendiente) > 0)
  const totalPorCobrar = cuentasConSaldo.reduce(
    (s, c) => s + Number(c.saldo_pendiente),
    0
  )
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })
  const clientesVencidos = cuentasConSaldo.filter(
    c =>
      c.estado === 'vencida' ||
      (c.fecha_vencimiento != null && c.fecha_vencimiento < today)
  ).length
  const criticos = skus.filter(s => isSkuStockCritico(s.estado))
  const cxpActivas = cuentasPorPagar.filter(c => Number(c.saldo_pendiente) > 0)
  const totalPorPagar = cxpActivas.reduce((s, c) => s + Number(c.saldo_pendiente), 0)

  return {
    perfil: 'distribuidor',
    query: opts?.query ?? undefined,
    selectedSkuId: opts?.selectedId ?? null,
    resumen: {
      skusTotal: skus.length,
      stockDisponibleTotal: skus.reduce((s, x) => s + x.stock_disponible, 0),
      bajoStock: skus.filter(s => s.estado === 'bajo').length,
      quiebre: skus.filter(s => s.estado === 'quiebre').length,
      pedidosActivos: activos.length,
      total_por_cobrar: totalPorCobrar,
      clientes_con_saldo: cuentasConSaldo.length,
      clientes_vencidos: clientesVencidos,
      pedidos_confirmados_pendientes: pendientesEntrega.length,
    },
    credito: {
      total_por_cobrar: totalPorCobrar,
      clientes_vencidos: clientesVencidos,
      cuentas: cuentasConSaldo.slice(0, 40).map(c => ({
        id: c.id,
        pedido_id: c.pedido_id,
        cliente_nombre: c.cliente_nombre,
        saldo_pendiente: Number(c.saldo_pendiente),
        monto_total: Number(c.monto_total),
        estado: c.estado,
        fecha_vencimiento: c.fecha_vencimiento,
      })),
    },
    pedidos_pendientes_entrega: pendientesEntrega.slice(0, 20).map(p => ({
      id: p.id,
      numero: p.numero,
      estado: p.estado,
      total: Number(p.total),
      fecha_entrega: p.fecha_entrega,
    })),
    skus_stock_critico: criticos.slice(0, 25).map(s => ({
      id: s.id,
      codigo: s.codigo,
      nombre: s.nombre,
      bodega: s.bodega || 'Principal',
      stock_disponible: s.stock_disponible,
      stock_reservado: s.stock_reservado,
      stock_total: s.stock_total,
      estado: s.estado,
      categoria_liquido: resolveSkuCategoriaLiquido({
        nombre: s.nombre,
        productor: s.productor,
        categoria_liquido: s.categoria_liquido,
      }),
    })),
    skus: skus.map(s => ({
      id: s.id,
      codigo: s.codigo,
      nombre: s.nombre,
      productor: s.productor,
      bodega: s.bodega || 'Principal',
      stock_disponible: s.stock_disponible,
      stock_reservado: s.stock_reservado,
      stock_total: s.stock_total,
      estado: s.estado,
      precio_venta: Number(s.precio_venta),
      notas: s.notas ?? null,
      categoria_liquido: resolveSkuCategoriaLiquido({
        nombre: s.nombre,
        productor: s.productor,
        categoria_liquido: s.categoria_liquido,
      }),
    })),
    pedidos: pedidos.slice(0, 30).map(p => ({
      id: p.id,
      numero: p.numero,
      estado: p.estado,
      total: Number(p.total),
      fecha_entrega: p.fecha_entrega,
      clients_id: p.clients_id,
      cliente_id: p.cliente_id,
      etiqueta_nombre: p.etiqueta_nombre,
      notas: p.notas ?? null,
    })),
    ordenes_compra_pendientes: ordenesCompra
      .filter(o => o.estado === 'pendiente' || o.estado === 'parcial')
      .slice(0, 20)
      .map(o => ({
        id: o.id,
        numero_orden: o.numero_orden,
        proveedor_nombre: o.proveedor_nombre,
        estado: o.estado,
        fecha_estimada: o.fecha_estimada,
        items: (o.items_orden_compra_distribuidor ?? []).map(it => ({
          id: it.id,
          producto_nombre: it.producto_nombre,
          cantidad_ordenada: it.cantidad_ordenada,
          cantidad_recibida: it.cantidad_recibida,
          costo_unitario: Number(it.costo_unitario),
        })),
      })),
    ultima_orden_ingresada: opts?.ultimaOrdenIngresada
      ? {
          id: opts.ultimaOrdenIngresada.id,
          numero_orden: opts.ultimaOrdenIngresada.numero_orden,
          proveedor_nombre: opts.ultimaOrdenIngresada.proveedor_nombre,
          estado: opts.ultimaOrdenIngresada.estado,
          fecha_recepcion: opts.ultimaOrdenIngresada.fecha_recepcion,
          items: (opts.ultimaOrdenIngresada.items_orden_compra_distribuidor ?? []).map(it => ({
            producto_nombre: it.producto_nombre,
            cantidad_recibida: it.cantidad_recibida,
            cantidad_ordenada: it.cantidad_ordenada,
          })),
        }
      : null,
    cxp: {
      total_por_pagar: totalPorPagar,
      proveedores_con_saldo: cxpActivas.length,
      cuentas: cxpActivas.slice(0, 40).map(c => ({
        id: c.id,
        proveedor_nombre: c.proveedor_nombre,
        saldo_pendiente: Number(c.saldo_pendiente),
        monto_total: Number(c.monto_total),
        orden_compra_id: c.orden_compra_id,
        estado: c.estado,
      })),
    },
    mi_informacion: {
      titular_cuenta: opts?.miInformacion?.titular_cuenta?.trim() || null,
      cuenta_deposito: opts?.miInformacion?.cuenta_deposito?.trim() || null,
      banco_deposito: opts?.miInformacion?.banco_deposito?.trim() || null,
      tiene_constancia_fiscal: Boolean(opts?.miInformacion?.constancia_fiscal_path),
    },
  }
}
