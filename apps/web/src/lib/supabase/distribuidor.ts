import type { SupabaseClient } from '@supabase/supabase-js'
import type { ProfileScope } from '../supabase'

// =============================================================================
// Enums (alineados con PostgreSQL public.*)
// =============================================================================

export type CategoriaSku =
  | 'tequila'
  | 'vino'
  | 'mezcal'
  | 'cerveza'
  | 'destilado'
  | 'gin'
  | 'otro'

export type EstadoSku =
  | 'sano'
  | 'bajo'
  | 'quiebre'
  | 'muerto'
  | 'en_transito'
  | 'consignacion'
  | 'sobrevendido'

export type Rotacion30d = 'muy_alta' | 'alta' | 'media' | 'baja' | 'ninguna'

export type EstadoPedido =
  | 'borrador'
  | 'confirmado'
  | 'preparando'
  | 'en_ruta'
  | 'entregado'
  | 'parcial'
  | 'cancelado'

export type EstadoRecepcion = 'pendiente' | 'en_revision' | 'confirmada' | 'con_discrepancias'

export type CondicionItemRecepcion = 'ok' | 'roto' | 'incompleto'

export type TipoDiscrepancia =
  | 'faltante'
  | 'lote_diferente'
  | 'roto'
  | 'sku_incorrecto'
  | 'excedente'

export type TipoDeudaProductor = 'credito' | 'consignacion' | 'acuerdo_verbal'

export type EstadoDeudaProductor =
  | 'al_corriente'
  | 'proximo'
  | 'vencido'
  | 'en_negociacion'
  | 'pagado'

export type EstadoCuentaCliente =
  | 'vigente'
  | 'en_riesgo'
  | 'vencido'
  | 'bloqueado'
  | 'incobrable'

// =============================================================================
// Row types (snake_case = columnas DB)
// =============================================================================

export interface SkuRow {
  id: string
  codigo: string
  nombre: string
  productor: string
  categoria: CategoriaSku
  bodega: string
  botellas_por_caja: number
  stock_total: number
  stock_reservado: number
  stock_disponible: number
  stock_minimo: number
  costo_unitario: number
  precio_venta: number
  margen_porcentaje: number
  lote: string
  dias_sin_movimiento: number
  rotacion_30d: Rotacion30d
  deuda_asociada: number
  estado: EstadoSku
  en_transito: boolean
  en_consignacion: boolean
  ultimo_movimiento: string | null
  dist_product_id: string | null
  cliente_id: string | null
  etiqueta_id: string | null
  imagen_url: string | null
  notas: string | null
  clerk_id: string
  profile_type_v2: string
  created_at: string
  updated_at: string
}

export interface ClientEtiquetaRow {
  id: string
  client_id: string
  nombre: string
  clerk_id: string
  profile_type_v2: string
  created_at: string
}

export interface PedidoRow {
  id: string
  numero: string
  cliente_id: string
  etiqueta_id: string | null
  etiqueta_nombre: string | null
  fecha_creacion: string
  fecha_entrega: string
  condicion_pago: string
  estado: EstadoPedido
  total: number
  ticket_exportado: boolean
  notas: string | null
  anticipo: boolean
  clerk_id: string
  profile_type_v2: string
  created_at: string
  updated_at: string
}

export interface ItemPedidoRow {
  id: string
  pedido_id: string
  sku_id: string
  nombre: string
  cantidad: number
  precio_unitario: number
  subtotal: number
  disponible_al_crear: number
  created_at: string
}

export interface PedidoWithItems extends PedidoRow {
  items_pedido: ItemPedidoRow[]
  clients?: {
    id: string
    name: string
    phone: string | null
    price_tier: string
    address?: string | null
  } | null
}

export interface RemisionDistribuidorRow {
  id: string
  clerk_id: string
  profile_type_v2: string
  pedido_id: string
  numero_remision: string
  fecha_entrega: string
  pdf_url: string | null
  created_at: string
}

export type EstadoOrdenCompra = 'borrador' | 'enviada' | 'recibida' | 'parcial'

export interface OrdenCompraRow {
  id: string
  clerk_id: string
  profile_type_v2: string
  productor_id: string
  estado: EstadoOrdenCompra
  fecha_esperada: string | null
  notas: string | null
  created_at: string
  updated_at: string
}

export interface ItemOrdenCompraRow {
  id: string
  orden_compra_id: string
  sku_id: string
  cantidad_esperada: number
  precio_unitario: number
  created_at: string
  skus?: { id: string; nombre: string; productor: string } | null
}

export interface OrdenCompraWithItems extends OrdenCompraRow {
  items_orden_compra: ItemOrdenCompraRow[]
}

export interface RecepcionRow {
  id: string
  codigo: string
  productor: string
  bodega_destino: string
  orden_compra_id: string | null
  costo_total: number
  deuda_registrada: number
  estado: EstadoRecepcion
  fecha_recepcion: string
  foto_urls: string[]
  clerk_id: string
  profile_type_v2: string
  created_at: string
  updated_at: string
}

export interface ItemRecepcionRow {
  id: string
  recepcion_id: string
  sku_id: string | null
  cantidad_esperada: number
  cantidad_recibida: number
  lote: string
  condicion: CondicionItemRecepcion
  created_at: string
}

export interface DiscrepanciaRow {
  id: string
  recepcion_id: string
  sku_id: string | null
  tipo: TipoDiscrepancia
  descripcion: string
  cantidad_afectada: number
  created_at: string
}

export interface DeudaProductorRow {
  id: string
  productor: string
  monto: number
  tipo: TipoDeudaProductor
  fecha_vencimiento: string
  estado: EstadoDeudaProductor
  skus_asociados: string[]
  notas: string | null
  clerk_id: string
  profile_type_v2: string
  created_at: string
  updated_at: string
}

export interface CuentaClienteRow {
  id: string
  cliente_id: string
  saldo_pendiente: number
  pedidos_asociados: string[]
  fecha_ultima_factura: string | null
  fecha_vencimiento: string | null
  dias_vencido: number
  pedido_activo_hoy: boolean
  estado: EstadoCuentaCliente
  clerk_id: string
  profile_type_v2: string
  created_at: string
  updated_at: string
}

/** Payload NOTIFY / Realtime stock */
export interface SkuStockPayload {
  id: string
  clerk_id: string
  stock_total: number
  stock_reservado: number
  stock_disponible: number
  estado: EstadoSku
}

// =============================================================================
// Domain aliases (spec / UI)
// =============================================================================

export type SKU = SkuRow
export type Pedido = PedidoRow
export type ItemPedido = ItemPedidoRow
export type Recepcion = RecepcionRow
export type ItemRecepcion = ItemRecepcionRow
export type Discrepancia = DiscrepanciaRow
export type DeudaProductor = DeudaProductorRow
export type CuentaCliente = CuentaClienteRow

// =============================================================================
// RPC helpers
// =============================================================================

function throwIfError(error: { message: string } | null) {
  if (error) throw new Error(error.message)
}

export async function rpcConfirmarPedido(
  sb: SupabaseClient,
  pedidoId: string
): Promise<PedidoRow> {
  const { data, error } = await sb.rpc('confirmar_pedido', { p_pedido_id: pedidoId })
  throwIfError(error)
  return data as PedidoRow
}

export async function rpcCancelarPedido(
  sb: SupabaseClient,
  pedidoId: string
): Promise<PedidoRow> {
  const { data, error } = await sb.rpc('cancelar_pedido', { p_pedido_id: pedidoId })
  throwIfError(error)
  return data as PedidoRow
}

export async function rpcEntregarPedido(
  sb: SupabaseClient,
  pedidoId: string,
  parcial = false
): Promise<PedidoRow> {
  const { data, error } = await sb.rpc('entregar_pedido', {
    p_pedido_id: pedidoId,
    p_parcial: parcial,
  })
  throwIfError(error)
  return data as PedidoRow
}

export async function rpcConfirmarRecepcion(
  sb: SupabaseClient,
  recepcionId: string,
  registrarDeuda = true
): Promise<RecepcionRow> {
  const { data, error } = await sb.rpc('confirmar_recepcion', {
    p_recepcion_id: recepcionId,
    p_registrar_deuda: registrarDeuda,
  })
  throwIfError(error)
  return data as RecepcionRow
}

export async function rpcSyncAllSkusForScope(
  sb: SupabaseClient,
  clerkId: string,
  profileTypeV2 = 'distributor'
): Promise<number> {
  const { data, error } = await sb.rpc('sync_all_skus_for_scope', {
    p_clerk_id: clerkId,
    p_profile_type_v2: profileTypeV2,
  })
  throwIfError(error)
  return data as number
}

export async function rpcProofNextCodigo(
  sb: SupabaseClient,
  clerkId: string,
  profileTypeV2: string,
  kind: 'sku' | 'pedido' | 'recepcion' | 'oc'
): Promise<string> {
  const { data, error } = await sb.rpc('proof_next_codigo', {
    p_clerk_id: clerkId,
    p_profile_type_v2: profileTypeV2,
    p_kind: kind,
  })
  throwIfError(error)
  return data as string
}

// =============================================================================
// Queries
// =============================================================================

function scopeFilter<T extends { eq: (c: string, v: string) => T }>(
  q: T,
  scope?: ProfileScope
): T {
  if (!scope) return q
  return q.eq('clerk_id', scope.clerk_id).eq('profile_type_v2', scope.profile_type_v2)
}

export async function fetchClientEtiquetas(
  sb: SupabaseClient,
  scope: ProfileScope,
  clientId: string
): Promise<ClientEtiquetaRow[]> {
  let q = sb
    .from('client_etiquetas')
    .select('*')
    .eq('client_id', clientId)
    .order('nombre', { ascending: true })
  q = scopeFilter(q, scope)
  const { data, error } = await q
  throwIfError(error)
  return (data || []) as ClientEtiquetaRow[]
}

export async function fetchSkus(
  sb: SupabaseClient,
  scope?: ProfileScope
): Promise<SkuRow[]> {
  let q = sb.from('skus').select('*').order('nombre', { ascending: true })
  q = scopeFilter(q, scope)
  const { data, error } = await q
  throwIfError(error)
  return (data || []) as SkuRow[]
}

export async function fetchSkuById(
  sb: SupabaseClient,
  scope: ProfileScope,
  skuId: string
): Promise<SkuRow | null> {
  let q = sb.from('skus').select('*').eq('id', skuId)
  q = scopeFilter(q, scope)
  const { data, error } = await q.maybeSingle()
  throwIfError(error)
  return (data as SkuRow | null) ?? null
}

export async function fetchPedidos(
  sb: SupabaseClient,
  scope?: ProfileScope,
  options?: { estado?: EstadoPedido; limit?: number }
): Promise<PedidoRow[]> {
  let q = sb
    .from('pedidos')
    .select('*, clients(name)')
    .order('fecha_creacion', { ascending: false })
  q = scopeFilter(q, scope)
  if (options?.estado) q = q.eq('estado', options.estado)
  if (options?.limit) q = q.limit(options.limit)
  const { data, error } = await q
  throwIfError(error)
  return (data || []) as (PedidoRow & { clients?: { name: string } | null })[]
}

export async function fetchPedidoWithItems(
  sb: SupabaseClient,
  pedidoId: string
): Promise<PedidoWithItems | null> {
  const { data, error } = await sb
    .from('pedidos')
    .select('*, items_pedido(*), clients(id, name, phone, price_tier, address)')
    .eq('id', pedidoId)
    .maybeSingle()
  throwIfError(error)
  if (!data) return null
  const row = data as PedidoWithItems & { items_pedido: ItemPedidoRow[] }
  row.items_pedido = Array.isArray(row.items_pedido) ? row.items_pedido : []
  return row
}

export async function fetchRemisionByPedidoId(
  sb: SupabaseClient,
  pedidoId: string,
  scope?: ProfileScope
): Promise<RemisionDistribuidorRow | null> {
  let q = sb.from('remisiones_distribuidor').select('*').eq('pedido_id', pedidoId)
  q = scopeFilter(q, scope)
  const { data, error } = await q.maybeSingle()
  throwIfError(error)
  return (data as RemisionDistribuidorRow | null) ?? null
}

export async function createPedidoBorrador(
  sb: SupabaseClient,
  input: {
    numero: string
    cliente_id: string
    etiqueta_id: string
    etiqueta_nombre: string
    fecha_entrega: string
    condicion_pago: string
    anticipo?: boolean
    notas?: string | null
    clerk_id: string
    profile_type_v2: string
  }
): Promise<PedidoRow> {
  const { data, error } = await sb
    .from('pedidos')
    .insert({
      ...input,
      anticipo: input.anticipo ?? false,
      estado: 'borrador',
      total: 0,
      ticket_exportado: false,
    })
    .select()
    .single()
  throwIfError(error)
  return data as PedidoRow
}

export async function replacePedidoItems(
  sb: SupabaseClient,
  pedidoId: string,
  items: Array<{
    sku_id: string
    nombre: string
    cantidad: number
    precio_unitario: number
    disponible_al_crear: number
    unidad?: string
  }>
): Promise<ItemPedidoRow[]> {
  const { error: delErr } = await sb.from('items_pedido').delete().eq('pedido_id', pedidoId)
  throwIfError(delErr)

  if (items.length === 0) {
    await sb.from('pedidos').update({ total: 0, updated_at: new Date().toISOString() }).eq('id', pedidoId)
    return []
  }

  const rows = items.map(it => ({
    pedido_id: pedidoId,
    sku_id: it.sku_id,
    nombre: it.nombre,
    cantidad: it.cantidad,
    precio_unitario: it.precio_unitario,
    subtotal: it.cantidad * it.precio_unitario,
    disponible_al_crear: it.disponible_al_crear,
    ...(it.unidad ? { unidad: it.unidad } : {}),
  }))

  const { data, error } = await sb.from('items_pedido').insert(rows).select()
  throwIfError(error)

  const total = rows.reduce((a, r) => a + r.subtotal, 0)
  await sb
    .from('pedidos')
    .update({ total, updated_at: new Date().toISOString() })
    .eq('id', pedidoId)

  return (data || []) as ItemPedidoRow[]
}

export function subscribeSkuStock(
  sb: SupabaseClient,
  scope: ProfileScope,
  onPayload: (payload: SkuStockPayload) => void
) {
  const channel = sb
    .channel(`sku-stock-${scope.clerk_id}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'skus',
        filter: `clerk_id=eq.${scope.clerk_id}`,
      },
      payload => {
        const n = payload.new as SkuRow
        onPayload({
          id: n.id,
          clerk_id: n.clerk_id,
          stock_total: n.stock_total,
          stock_reservado: n.stock_reservado,
          stock_disponible: n.stock_disponible,
          estado: n.estado,
        })
      }
    )
    .subscribe()

  return () => {
    void sb.removeChannel(channel)
  }
}

// =============================================================================
// Recepciones
// =============================================================================

export async function createRecepcionDraft(
  sb: SupabaseClient,
  input: {
    codigo: string
    productor: string
    bodega_destino?: string
    orden_compra_id?: string | null
    costo_total?: number
    deuda_registrada?: number
    foto_urls?: string[]
    clerk_id: string
    profile_type_v2: string
  }
): Promise<RecepcionRow> {
  const { data, error } = await sb
    .from('recepciones')
    .insert({
      codigo: input.codigo,
      productor: input.productor,
      bodega_destino: input.bodega_destino ?? 'Principal',
      orden_compra_id: input.orden_compra_id ?? null,
      costo_total: input.costo_total ?? 0,
      deuda_registrada: input.deuda_registrada ?? 0,
      foto_urls: input.foto_urls ?? [],
      estado: 'en_revision',
      clerk_id: input.clerk_id,
      profile_type_v2: input.profile_type_v2,
    })
    .select()
    .single()
  throwIfError(error)
  return data as RecepcionRow
}

export async function insertItemsRecepcion(
  sb: SupabaseClient,
  items: Array<{
    recepcion_id: string
    sku_id: string | null
    cantidad_esperada: number
    cantidad_recibida: number
    lote: string
    condicion: CondicionItemRecepcion
  }>
): Promise<ItemRecepcionRow[]> {
  if (!items.length) return []
  const { data, error } = await sb.from('items_recepcion').insert(items).select()
  throwIfError(error)
  return (data || []) as ItemRecepcionRow[]
}

export async function insertDiscrepancias(
  sb: SupabaseClient,
  rows: Array<{
    recepcion_id: string
    sku_id: string | null
    tipo: TipoDiscrepancia
    descripcion: string
    cantidad_afectada: number
  }>
): Promise<void> {
  if (!rows.length) return
  const { error } = await sb.from('discrepancias').insert(rows)
  throwIfError(error)
}

export async function updateRecepcionDraft(
  sb: SupabaseClient,
  recepcionId: string,
  patch: {
    productor?: string
    orden_compra_id?: string | null
    costo_total?: number
    deuda_registrada?: number
    foto_urls?: string[]
  }
): Promise<RecepcionRow> {
  const { data, error } = await sb
    .from('recepciones')
    .update(patch)
    .eq('id', recepcionId)
    .select()
    .single()
  throwIfError(error)
  return data as RecepcionRow
}

export async function clearRecepcionLineItems(sb: SupabaseClient, recepcionId: string): Promise<void> {
  const { error: e1 } = await sb.from('items_recepcion').delete().eq('recepcion_id', recepcionId)
  throwIfError(e1)
  const { error: e2 } = await sb.from('discrepancias').delete().eq('recepcion_id', recepcionId)
  throwIfError(e2)
}

// =============================================================================
// Órdenes de compra
// =============================================================================

export async function fetchOrdenesCompraAbiertas(
  sb: SupabaseClient,
  scope?: ProfileScope
): Promise<OrdenCompraRow[]> {
  let q = sb
    .from('ordenes_compra')
    .select('*')
    .in('estado', ['borrador', 'enviada'])
    .order('fecha_esperada', { ascending: true, nullsFirst: false })
  q = scopeFilter(q, scope)
  const { data, error } = await q
  throwIfError(error)
  return (data || []) as OrdenCompraRow[]
}

export async function fetchOrdenCompraWithItems(
  sb: SupabaseClient,
  ordenId: string
): Promise<OrdenCompraWithItems | null> {
  const { data, error } = await sb
    .from('ordenes_compra')
    .select('*, items_orden_compra(*, skus(id, nombre, productor))')
    .eq('id', ordenId)
    .maybeSingle()
  throwIfError(error)
  return data as OrdenCompraWithItems | null
}

export function itemsOrdenToExpected(
  items: ItemOrdenCompraRow[]
): Array<{ skuId: string; nombre: string; cantidadEsperada: number }> {
  return items.map(it => ({
    skuId: it.sku_id,
    nombre: it.skus?.nombre || it.sku_id,
    cantidadEsperada: it.cantidad_esperada,
  }))
}

// =============================================================================
// Órdenes de compra distribuidor (entrada de producto)
// =============================================================================

export type EstadoOrdenCompraDistribuidor = 'pendiente' | 'parcial' | 'recibida' | 'cancelada'

export interface OrdenCompraDistribuidorRow {
  id: string
  clerk_id: string
  profile_type_v2: string
  numero_orden: string
  proveedor_nombre: string
  estado: EstadoOrdenCompraDistribuidor
  fecha_estimada: string | null
  fecha_recepcion: string | null
  total_acordado: number
  created_at: string
  updated_at: string
}

export interface ItemOrdenCompraDistribuidorRow {
  id: string
  orden_id: string
  producto_nombre: string
  sku_id: string | null
  cantidad_ordenada: number
  cantidad_recibida: number | null
  costo_unitario: number
  subtotal: number
  created_at: string
}

export interface OrdenCompraDistribuidorWithItems extends OrdenCompraDistribuidorRow {
  items_orden_compra_distribuidor: ItemOrdenCompraDistribuidorRow[]
}

export type NuevoItemOrdenCompraInput = {
  producto_nombre: string
  cantidad_ordenada: number
  costo_unitario: number
  sku_id?: string | null
}

export type ConfirmarLlegadaOcLinea = {
  item_id: string
  cantidad_recibida: number
}

export async function fetchOrdenesCompraDistribuidorPendientes(
  sb: SupabaseClient,
  scope?: ProfileScope
): Promise<OrdenCompraDistribuidorWithItems[]> {
  let q = sb
    .from('ordenes_compra_distribuidor')
    .select('*, items_orden_compra_distribuidor(*)')
    .in('estado', ['pendiente', 'parcial'])
    .order('fecha_estimada', { ascending: true, nullsFirst: false })
  q = scopeFilter(q, scope)
  const { data, error } = await q
  throwIfError(error)
  return (data || []) as OrdenCompraDistribuidorWithItems[]
}

export async function fetchOrdenCompraDistribuidorWithItems(
  sb: SupabaseClient,
  ordenId: string
): Promise<OrdenCompraDistribuidorWithItems | null> {
  const { data, error } = await sb
    .from('ordenes_compra_distribuidor')
    .select('*, items_orden_compra_distribuidor(*)')
    .eq('id', ordenId)
    .maybeSingle()
  throwIfError(error)
  return data as OrdenCompraDistribuidorWithItems | null
}

export async function createOrdenCompraDistribuidor(
  sb: SupabaseClient,
  scope: ProfileScope,
  input: {
    proveedor_nombre: string
    fecha_estimada?: string | null
    items: NuevoItemOrdenCompraInput[]
  }
): Promise<OrdenCompraDistribuidorWithItems> {
  if (input.items.length === 0) {
    throw new Error('Agrega al menos un producto a la orden')
  }

  const numeroOrden = await rpcProofNextCodigo(
    sb,
    scope.clerk_id,
    scope.profile_type_v2,
    'oc'
  )

  const { data: orden, error: ordenErr } = await sb
    .from('ordenes_compra_distribuidor')
    .insert({
      clerk_id: scope.clerk_id,
      profile_type_v2: scope.profile_type_v2,
      numero_orden: numeroOrden,
      proveedor_nombre: input.proveedor_nombre.trim(),
      fecha_estimada: input.fecha_estimada || null,
      estado: 'pendiente',
    })
    .select()
    .single()
  throwIfError(ordenErr)

  const itemRows = input.items.map(it => ({
    orden_id: orden.id,
    producto_nombre: it.producto_nombre.trim(),
    sku_id: it.sku_id ?? null,
    cantidad_ordenada: it.cantidad_ordenada,
    costo_unitario: it.costo_unitario,
  }))

  const { error: itemsErr } = await sb.from('items_orden_compra_distribuidor').insert(itemRows)
  throwIfError(itemsErr)

  const full = await fetchOrdenCompraDistribuidorWithItems(sb, orden.id)
  if (!full) throw new Error('No se pudo cargar la orden creada')
  return full
}

export async function confirmarLlegadaOrdenCompraDistribuidor(
  sb: SupabaseClient,
  ordenId: string,
  lineas: ConfirmarLlegadaOcLinea[]
): Promise<OrdenCompraDistribuidorRow> {
  const { data, error } = await sb.rpc('confirmar_llegada_orden_compra_distribuidor', {
    p_orden_id: ordenId,
    p_lineas: lineas,
  })
  throwIfError(error)
  return data as OrdenCompraDistribuidorRow
}

// =============================================================================
// Cuentas por pagar (CxP)
// =============================================================================

export type EstadoCuentaPorPagar = 'pendiente' | 'parcial' | 'pagada'
export type MetodoPagoProveedor = 'efectivo' | 'transferencia' | 'cheque'

export interface CuentaPorPagarRow {
  id: string
  clerk_id: string
  profile_type_v2: string
  orden_compra_id: string
  proveedor_nombre: string
  monto_total: number
  monto_pagado: number
  saldo_pendiente: number
  estado: EstadoCuentaPorPagar
  fecha_vencimiento: string | null
  created_at: string
  updated_at: string
}

export interface PagoProveedorRow {
  id: string
  clerk_id: string
  profile_type_v2: string
  cuenta_por_pagar_id: string
  monto: number
  metodo: MetodoPagoProveedor
  referencia: string | null
  fecha_pago: string
  nota: string | null
  created_at: string
}

export type OrdenCompraConCxP = OrdenCompraDistribuidorWithItems & {
  cxp: {
    id: string
    saldo_pendiente: number
    monto_total: number
    monto_pagado: number
    proveedor_nombre: string
    pagos?: PagoProveedorRow[]
  }
}

export async function fetchCuentasPorPagarActivas(
  sb: SupabaseClient,
  scope?: ProfileScope
): Promise<CuentaPorPagarRow[]> {
  let q = sb
    .from('cuentas_por_pagar')
    .select('*')
    .in('estado', ['pendiente', 'parcial'])
    .order('created_at', { ascending: false })
  q = scopeFilter(q, scope)
  const { data, error } = await q
  throwIfError(error)
  return (data || []) as CuentaPorPagarRow[]
}

export async function fetchOrdenesCompraConCxPendiente(
  sb: SupabaseClient,
  scope?: ProfileScope
): Promise<OrdenCompraConCxP[]> {
  let q = sb
    .from('cuentas_por_pagar')
    .select(
      'id, saldo_pendiente, monto_total, monto_pagado, proveedor_nombre, ordenes_compra_distribuidor(*, items_orden_compra_distribuidor(*))'
    )
    .in('estado', ['pendiente', 'parcial'])
    .order('created_at', { ascending: false })
  q = scopeFilter(q, scope)
  const { data, error } = await q
  throwIfError(error)
  type CxpJoinRow = {
    id: string
    saldo_pendiente: number
    monto_total: number
    monto_pagado: number
    proveedor_nombre: string
    ordenes_compra_distribuidor: OrdenCompraDistribuidorWithItems | OrdenCompraDistribuidorWithItems[] | null
  }
  const rows = (data || []) as unknown as CxpJoinRow[]
  return rows
    .map(r => {
      const orden = Array.isArray(r.ordenes_compra_distribuidor)
        ? r.ordenes_compra_distribuidor[0]
        : r.ordenes_compra_distribuidor
      if (!orden) return null
      return {
        ...orden,
        cxp: {
          id: r.id,
          saldo_pendiente: Number(r.saldo_pendiente),
          monto_total: Number(r.monto_total),
          monto_pagado: Number(r.monto_pagado),
          proveedor_nombre: r.proveedor_nombre,
        },
      }
    })
    .filter((r): r is OrdenCompraConCxP => r != null)
}

export async function fetchPagosProveedorByCuentaIds(
  sb: SupabaseClient,
  cuentaIds: string[],
  scope?: ProfileScope
): Promise<PagoProveedorRow[]> {
  if (cuentaIds.length === 0) return []
  let q = sb
    .from('pagos_proveedor')
    .select('*')
    .in('cuenta_por_pagar_id', cuentaIds)
    .order('fecha_pago', { ascending: true })
  q = scopeFilter(q, scope)
  const { data, error } = await q
  throwIfError(error)
  return (data || []) as PagoProveedorRow[]
}

export async function rpcRegistrarPagoProveedor(
  sb: SupabaseClient,
  cuentaId: string,
  monto: number,
  metodo: MetodoPagoProveedor = 'transferencia'
): Promise<CuentaPorPagarRow> {
  const { data, error } = await sb.rpc('registrar_pago_proveedor', {
    p_cuenta_id: cuentaId,
    p_monto: monto,
    p_metodo: metodo,
    p_referencia: null,
    p_nota: null,
  })
  throwIfError(error)
  return data as CuentaPorPagarRow
}

// =============================================================================
// Cuentas por cobrar (CxC)
// =============================================================================

export type EstadoCuentaPorCobrar = 'pendiente' | 'parcial' | 'pagada' | 'vencida'
export type MetodoPagoCliente = 'efectivo' | 'transferencia' | 'cheque'

export interface CuentaPorCobrarRow {
  id: string
  clerk_id: string
  profile_type_v2: string
  pedido_id: string
  cliente_nombre: string
  monto_total: number
  monto_pagado: number
  saldo_pendiente: number
  estado: EstadoCuentaPorCobrar
  fecha_vencimiento: string | null
  created_at: string
  updated_at: string
}

export interface PagoClienteRow {
  id: string
  clerk_id: string
  profile_type_v2: string
  cuenta_por_cobrar_id: string
  monto: number
  metodo: MetodoPagoCliente
  referencia: string | null
  fecha_pago: string
  nota: string | null
  created_at: string
}

export type PedidoConCxC = PedidoRow & {
  clients?: { name: string } | null
  cxc: {
    id: string
    saldo_pendiente: number
    monto_total: number
    cliente_nombre: string
    estado: EstadoCuentaPorCobrar
    fecha_vencimiento: string | null
  }
}

export async function fetchCuentasPorCobrarActivas(
  sb: SupabaseClient,
  scope?: ProfileScope
): Promise<CuentaPorCobrarRow[]> {
  let q = sb
    .from('cuentas_por_cobrar')
    .select('*')
    .in('estado', ['pendiente', 'parcial', 'vencida'])
    .order('created_at', { ascending: false })
  q = scopeFilter(q, scope)
  const { data, error } = await q
  throwIfError(error)
  return (data || []) as CuentaPorCobrarRow[]
}

export async function fetchCuentaPorCobrarByPedidoId(
  sb: SupabaseClient,
  pedidoId: string,
  scope?: ProfileScope
): Promise<CuentaPorCobrarRow | null> {
  let q = sb.from('cuentas_por_cobrar').select('*').eq('pedido_id', pedidoId)
  q = scopeFilter(q, scope)
  const { data, error } = await q.maybeSingle()
  throwIfError(error)
  return (data as CuentaPorCobrarRow | null) ?? null
}

export async function fetchPedidosConCxCPendiente(
  sb: SupabaseClient,
  scope?: ProfileScope
): Promise<PedidoConCxC[]> {
  let q = sb
    .from('cuentas_por_cobrar')
    .select(
      'id, saldo_pendiente, monto_total, cliente_nombre, estado, fecha_vencimiento, pedidos(*, clients(name))'
    )
    .in('estado', ['pendiente', 'parcial', 'vencida'])
    .order('created_at', { ascending: false })
  q = scopeFilter(q, scope)
  const { data, error } = await q
  throwIfError(error)
  type CxcJoinRow = {
    id: string
    saldo_pendiente: number
    monto_total: number
    cliente_nombre: string
    estado: EstadoCuentaPorCobrar
    fecha_vencimiento: string | null
    pedidos: (PedidoRow & { clients?: { name: string } | null }) | (PedidoRow & { clients?: { name: string } | null })[] | null
  }
  const rows = (data || []) as unknown as CxcJoinRow[]
  return rows
    .map(r => {
      const pedido = Array.isArray(r.pedidos) ? r.pedidos[0] : r.pedidos
      if (!pedido) return null
      return {
        ...pedido,
        cxc: {
          id: r.id,
          saldo_pendiente: Number(r.saldo_pendiente),
          monto_total: Number(r.monto_total),
          cliente_nombre: r.cliente_nombre,
          estado: r.estado,
          fecha_vencimiento: r.fecha_vencimiento,
        },
      }
    })
    .filter((r): r is PedidoConCxC => r != null)
}

export async function rpcRegistrarPagoCliente(
  sb: SupabaseClient,
  cuentaId: string,
  monto: number,
  metodo: MetodoPagoCliente = 'transferencia'
): Promise<CuentaPorCobrarRow> {
  const { data, error } = await sb.rpc('registrar_pago_cliente', {
    p_cuenta_id: cuentaId,
    p_monto: monto,
    p_metodo: metodo,
    p_referencia: null,
    p_nota: null,
  })
  throwIfError(error)
  return data as CuentaPorCobrarRow
}

function todayMexicoIso(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })
}

function mesInicioMexicoIso(): string {
  const today = todayMexicoIso()
  return `${today.slice(0, 8)}01`
}

function isCuentaVencida(c: CuentaPorCobrarRow, today: string): boolean {
  return c.estado === 'vencida' || (c.fecha_vencimiento != null && c.fecha_vencimiento < today)
}

export interface CreditoCxCResumen {
  totalPorCobrar: number
  clientesVencidos: number
  cobradoEsteMes: number
}

export interface DeudaClienteAgregada {
  cliente_nombre: string
  monto_total: number
  saldo_pendiente: number
  fecha_vencimiento: string | null
  estado: 'al_dia' | 'vencido'
  cuentas_count: number
}

export type CuentaPorCobrarConPedido = CuentaPorCobrarRow & {
  pedidos: Pick<PedidoRow, 'id' | 'numero' | 'estado' | 'total' | 'fecha_entrega'> | null
}

export interface ClienteCreditoDetalle {
  cliente_nombre: string
  cuentas: CuentaPorCobrarConPedido[]
  pagos: PagoClienteRow[]
}

export async function fetchCreditoCxCResumen(
  sb: SupabaseClient,
  scope?: ProfileScope
): Promise<CreditoCxCResumen> {
  const cuentas = await fetchCuentasPorCobrarActivas(sb, scope)
  const activas = cuentas.filter(c => Number(c.saldo_pendiente) > 0)
  const today = todayMexicoIso()
  const totalPorCobrar = activas.reduce((s, c) => s + Number(c.saldo_pendiente), 0)
  const clientesVencidos = new Set(
    activas.filter(c => isCuentaVencida(c, today)).map(c => c.cliente_nombre || 'Cliente')
  ).size

  let q = sb
    .from('pagos_cliente')
    .select('monto')
    .gte('fecha_pago', mesInicioMexicoIso())
  q = scopeFilter(q, scope)
  const { data, error } = await q
  if (
    error &&
    (error.code === 'PGRST205' ||
      error.message.includes('pagos_cliente') ||
      error.message.includes('schema cache'))
  ) {
    return { totalPorCobrar, clientesVencidos, cobradoEsteMes: 0 }
  }
  throwIfError(error)
  const cobradoEsteMes = (data || []).reduce((s, p) => s + Number(p.monto), 0)

  return { totalPorCobrar, clientesVencidos, cobradoEsteMes }
}

export async function fetchDeudasPorCliente(
  sb: SupabaseClient,
  scope?: ProfileScope
): Promise<DeudaClienteAgregada[]> {
  const cuentas = await fetchCuentasPorCobrarActivas(sb, scope)
  const activas = cuentas.filter(c => Number(c.saldo_pendiente) > 0)
  const today = todayMexicoIso()
  const byCliente = new Map<string, CuentaPorCobrarRow[]>()

  for (const c of activas) {
    const key = c.cliente_nombre || 'Cliente'
    const list = byCliente.get(key) ?? []
    list.push(c)
    byCliente.set(key, list)
  }

  return Array.from(byCliente.entries())
    .map(([cliente_nombre, rows]) => {
      const monto_total = rows.reduce((s, c) => s + Number(c.monto_total), 0)
      const saldo_pendiente = rows.reduce((s, c) => s + Number(c.saldo_pendiente), 0)
      const fechas = rows
        .map(c => c.fecha_vencimiento)
        .filter((f): f is string => f != null)
        .sort()
      const vencido = rows.some(c => isCuentaVencida(c, today))
      return {
        cliente_nombre,
        monto_total,
        saldo_pendiente,
        fecha_vencimiento: fechas[0] ?? null,
        estado: vencido ? ('vencido' as const) : ('al_dia' as const),
        cuentas_count: rows.length,
      }
    })
    .sort((a, b) => {
      if (a.estado !== b.estado) return a.estado === 'vencido' ? -1 : 1
      return b.saldo_pendiente - a.saldo_pendiente
    })
}

export async function fetchDetalleClienteCredito(
  sb: SupabaseClient,
  clienteNombre: string,
  scope?: ProfileScope
): Promise<ClienteCreditoDetalle> {
  let q = sb
    .from('cuentas_por_cobrar')
    .select('*, pedidos(id, numero, estado, total, fecha_entrega)')
    .eq('cliente_nombre', clienteNombre)
    .in('estado', ['pendiente', 'parcial', 'vencida'])
    .order('fecha_vencimiento', { ascending: true })
  q = scopeFilter(q, scope)
  const { data: cuentasRaw, error } = await q
  throwIfError(error)

  type JoinRow = CuentaPorCobrarRow & {
    pedidos:
      | Pick<PedidoRow, 'id' | 'numero' | 'estado' | 'total' | 'fecha_entrega'>
      | Pick<PedidoRow, 'id' | 'numero' | 'estado' | 'total' | 'fecha_entrega'>[]
      | null
  }
  const cuentas = ((cuentasRaw || []) as JoinRow[]).map(r => {
    const pedido = Array.isArray(r.pedidos) ? r.pedidos[0] : r.pedidos
    const { pedidos: _p, ...rest } = r
    return { ...rest, pedidos: pedido ?? null }
  })

  const cuentaIds = cuentas.map(c => c.id)
  let pagos: PagoClienteRow[] = []
  if (cuentaIds.length > 0) {
    let pq = sb
      .from('pagos_cliente')
      .select('*')
      .in('cuenta_por_cobrar_id', cuentaIds)
      .order('fecha_pago', { ascending: false })
    pq = scopeFilter(pq, scope)
    const { data: pagosData, error: pagosError } = await pq
    throwIfError(pagosError)
    pagos = (pagosData || []) as PagoClienteRow[]
  }

  return { cliente_nombre: clienteNombre, cuentas, pagos }
}

// =============================================================================
// Crédito
// =============================================================================

export interface CuentaClienteWithClient extends CuentaClienteRow {
  clients: { id: string; name: string; phone: string | null; email: string | null } | null
}

export interface CreditoResumen {
  meDeben: number
  lesDebo: number
  posicionNeta: number
  venceSemana: number
  cobrosEsperadosSemana: number
}

export interface AlertaCreditoCritica {
  cuenta_id: string
  cliente_id: string
  cliente_nombre: string
  saldo_pendiente: number
  dias_vencido: number
  pedido_id: string | null
  pedido_numero: string | null
}

export async function fetchDeudasProductores(
  sb: SupabaseClient,
  scope?: ProfileScope
): Promise<DeudaProductorRow[]> {
  let q = sb
    .from('deudas_productores')
    .select('*')
    .neq('estado', 'pagado')
    .order('fecha_vencimiento', { ascending: true })
  q = scopeFilter(q, scope)
  const { data, error } = await q
  throwIfError(error)
  return (data || []) as DeudaProductorRow[]
}

export async function fetchCuentasClientes(
  sb: SupabaseClient,
  scope?: ProfileScope
): Promise<CuentaClienteWithClient[]> {
  let q = sb
    .from('cuentas_clientes')
    .select('*, clients(id, name, phone, email)')
    .order('dias_vencido', { ascending: false })
  q = scopeFilter(q, scope)
  const { data, error } = await q
  if (
    error &&
    (error.code === 'PGRST205' ||
      error.message.includes('cuentas_clientes') ||
      error.message.includes('schema cache'))
  ) {
    return []
  }
  throwIfError(error)
  return (data || []) as CuentaClienteWithClient[]
}

export async function fetchCreditoResumen(
  sb: SupabaseClient,
  scope: ProfileScope
): Promise<CreditoResumen> {
  const [deudas, cuentas] = await Promise.all([
    fetchDeudasProductores(sb, scope),
    sb
      .from('cuentas_clientes')
      .select('saldo_pendiente')
      .eq('clerk_id', scope.clerk_id)
      .eq('profile_type_v2', scope.profile_type_v2),
  ])

  throwIfError(cuentas.error)

  const lesDebo = deudas.reduce((a, d) => a + Number(d.monto), 0)
  const meDeben = (cuentas.data || []).reduce((a, c) => a + Number(c.saldo_pendiente), 0)

  const weekEnd = new Date()
  weekEnd.setDate(weekEnd.getDate() + 7)
  const weekEndIso = weekEnd.toISOString().slice(0, 10)

  const venceSemana = deudas
    .filter(d => d.fecha_vencimiento <= weekEndIso && d.estado !== 'pagado')
    .reduce((a, d) => a + Number(d.monto), 0)

  const cobrosEsperadosSemana = meDeben * 0.35

  return {
    meDeben,
    lesDebo,
    posicionNeta: meDeben - lesDebo,
    venceSemana,
    cobrosEsperadosSemana,
  }
}

export async function marcarDeudaPagada(sb: SupabaseClient, deudaId: string): Promise<void> {
  const { error } = await sb
    .from('deudas_productores')
    .update({ estado: 'pagado', updated_at: new Date().toISOString() })
    .eq('id', deudaId)
  throwIfError(error)
}

export async function fetchAlertasCreditoCriticas(
  sb: SupabaseClient,
  scope: ProfileScope
): Promise<AlertaCreditoCritica[]> {
  const { data: cuentas, error } = await sb
    .from('cuentas_clientes')
    .select('*, clients(id, name)')
    .eq('clerk_id', scope.clerk_id)
    .eq('profile_type_v2', scope.profile_type_v2)
    .gt('dias_vencido', 0)
    .eq('pedido_activo_hoy', true)
  throwIfError(error)

  const out: AlertaCreditoCritica[] = []

  for (const c of cuentas || []) {
    const cuenta = c as CuentaClienteWithClient & {
      clients: { id: string; name: string } | null
    }
    const { data: pedidos } = await sb
      .from('pedidos')
      .select('id, numero')
      .eq('cliente_id', cuenta.cliente_id)
      .eq('clerk_id', scope.clerk_id)
      .eq('fecha_entrega', new Date().toISOString().slice(0, 10))
      .in('estado', ['confirmado', 'preparando', 'en_ruta', 'parcial'])
      .limit(1)

    const p = pedidos?.[0]
    out.push({
      cuenta_id: cuenta.id,
      cliente_id: cuenta.cliente_id,
      cliente_nombre: cuenta.clients?.name || 'Cliente',
      saldo_pendiente: Number(cuenta.saldo_pendiente),
      dias_vencido: cuenta.dias_vencido,
      pedido_id: p?.id ?? null,
      pedido_numero: p?.numero ?? null,
    })
  }

  return out
}

// =============================================================================
// Productores (agregado desde skus + deudas)
// =============================================================================

function productorFilter<T>(q: T, productor: string): T {
  if (productor === 'Sin productor') {
    return (q as { or: (f: string) => T }).or('productor.eq.,productor.is.null')
  }
  return (q as { eq: (c: string, v: string) => T }).eq('productor', productor)
}

export async function fetchSkusByProductor(
  sb: SupabaseClient,
  scope: ProfileScope,
  productor: string
): Promise<SkuRow[]> {
  let q = productorFilter(
    sb.from('skus').select('*').order('nombre', { ascending: true }),
    productor
  )
  q = scopeFilter(q, scope)
  const { data, error } = await q
  throwIfError(error)
  return (data || []) as SkuRow[]
}

export async function fetchDeudasByProductor(
  sb: SupabaseClient,
  scope: ProfileScope,
  productor: string
): Promise<DeudaProductorRow[]> {
  let q = productorFilter(
    sb.from('deudas_productores').select('*').neq('estado', 'pagado'),
    productor
  )
    .order('fecha_vencimiento', { ascending: true })
  q = scopeFilter(q, scope)
  const { data, error } = await q
  throwIfError(error)
  return (data || []) as DeudaProductorRow[]
}

export async function fetchOrdenesCompraByProductor(
  sb: SupabaseClient,
  scope: ProfileScope,
  productor: string
): Promise<OrdenCompraRow[]> {
  let q = sb
    .from('ordenes_compra')
    .select('*')
    .in('estado', ['borrador', 'enviada', 'parcial'])
  if (productor === 'Sin productor') {
    q = q.or('productor_id.eq.,productor_id.is.null')
  } else {
    q = q.eq('productor_id', productor)
  }
  q = q.order('fecha_esperada', { ascending: true, nullsFirst: false })
  q = scopeFilter(q, scope)
  const { data, error } = await q
  throwIfError(error)
  return (data || []) as OrdenCompraRow[]
}

// =============================================================================
// Remisiones (recepciones confirmadas)
// =============================================================================

export interface RecepcionRemisionListRow extends RecepcionRow {
  items_count: number
  discrepancias_count: number
  botellas_recibidas: number
}

export interface RecepcionRemisionDetalle extends RecepcionRow {
  items_recepcion: Array<
    ItemRecepcionRow & { skus: { id: string; nombre: string } | null }
  >
  discrepancias: DiscrepanciaRow[]
}

export async function fetchRecepcionesRemision(
  sb: SupabaseClient,
  scope?: ProfileScope
): Promise<RecepcionRemisionListRow[]> {
  let q = sb
    .from('recepciones')
    .select('*, items_recepcion(cantidad_recibida), discrepancias(id)')
    .in('estado', ['confirmada', 'con_discrepancias'])
    .order('fecha_recepcion', { ascending: false })
  q = scopeFilter(q, scope)
  const { data, error } = await q
  throwIfError(error)

  return (data || []).map(row => {
    const items = (row as { items_recepcion?: { cantidad_recibida: number }[] }).items_recepcion || []
    const disc = (row as { discrepancias?: { id: string }[] }).discrepancias || []
    const { items_recepcion: _i, discrepancias: _d, ...rec } = row as RecepcionRow & {
      items_recepcion?: unknown
      discrepancias?: unknown
    }
    return {
      ...(rec as RecepcionRow),
      items_count: items.length,
      discrepancias_count: disc.length,
      botellas_recibidas: items.reduce((a, it) => a + (it.cantidad_recibida || 0), 0),
    }
  })
}

export async function fetchRecepcionRemisionDetalle(
  sb: SupabaseClient,
  recepcionId: string
): Promise<RecepcionRemisionDetalle | null> {
  const { data, error } = await sb
    .from('recepciones')
    .select(
      `
      *,
      items_recepcion(*, skus(id, nombre)),
      discrepancias(*)
    `
    )
    .eq('id', recepcionId)
    .maybeSingle()
  throwIfError(error)
  return data as RecepcionRemisionDetalle | null
}
