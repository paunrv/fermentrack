// ROADMAP — Org tenancy: módulo congelado (epic #3). Ver docs/ORG-TENANCY.md
// Scope actual: user_id + profile_type_v2. No migrar en PRs de winemaker.

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

export type CategoriaLiquido =
  | 'cerveza'
  | 'vino'
  | 'mezcal'
  | 'gin'
  | 'destilado'
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
  categoria_liquido: CategoriaLiquido
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
  origen?: 'local' | 'importado'
  tipo_unidad?: 'botella' | 'lata'
  precio_mayoreo?: number
  precio_especial?: number
  moneda?: string
  user_id: string
  profile_type_v2: string
  created_at: string
  updated_at: string
}

// =============================================================================
// Trabajadores · clientes (cartera distribuidor)
// =============================================================================

export type RolTrabajador = 'patron' | 'manager' | 'bodega'

export interface TrabajadorRow {
  id: string
  user_id: string
  nombre: string
  rol: RolTrabajador
  profile_type_v2: string
  patron_user_id: string
  activo: boolean
  created_at: string
}

export type Trabajador = TrabajadorRow

export interface ClienteRow {
  id: string
  nombre: string
  telefono: string | null
  email: string | null
  direccion: string | null
  dias_credito: number
  notas: string | null
  activo: boolean
  user_id: string
  profile_type_v2: string
  created_at: string
}

export type Cliente = ClienteRow

export interface ClientEtiquetaRow {
  id: string
  client_id: string
  nombre: string
  user_id: string
  profile_type_v2: string
  created_at: string
}

export interface PedidoRow {
  id: string
  numero: string
  /** Legacy · tabla `clients` */
  clients_id: string
  /** Nueva cartera · tabla `clientes` (nullable hasta cutover) */
  cliente_id: string | null
  etiqueta_id: string | null
  etiqueta_nombre: string | null
  fecha_creacion: string
  fecha_entrega: string
  condicion_pago: string
  estado: EstadoPedido
  total: number
  ticket_exportado: boolean
  notas: string | null
  nota: string | null
  imagen_origen_url: string | null
  anticipo: boolean
  anticipo_monto: number | null
  user_id: string
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
  user_id: string
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
  user_id: string
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
  orden_compra_distribuidor_id: string | null
  costo_total: number
  deuda_registrada: number
  estado: EstadoRecepcion
  fecha_recepcion: string
  foto_urls: string[]
  user_id: string
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
  user_id: string
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
  user_id: string
  profile_type_v2: string
  created_at: string
  updated_at: string
}

/** Payload NOTIFY / Realtime stock */
export interface SkuStockPayload {
  id: string
  user_id: string
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

export async function rpcActualizarEstadoPedido(
  sb: SupabaseClient,
  pedidoId: string,
  estado: Extract<EstadoPedido, 'preparando' | 'en_ruta'>
): Promise<PedidoRow> {
  const { data, error } = await sb.rpc('actualizar_estado_pedido', {
    p_pedido_id: pedidoId,
    p_estado: estado,
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
  userId: string,
  profileTypeV2 = 'distributor'
): Promise<number> {
  const { data, error } = await sb.rpc('sync_all_skus_for_scope', {
    p_user_id: userId,
    p_profile_type_v2: profileTypeV2,
  })
  throwIfError(error)
  return data as number
}

export async function rpcProofNextCodigo(
  sb: SupabaseClient,
  userId: string,
  profileTypeV2: string,
  kind: 'sku' | 'pedido' | 'recepcion' | 'oc'
): Promise<string> {
  const { data, error } = await sb.rpc('proof_next_codigo', {
    p_user_id: userId,
    p_profile_type_v2: profileTypeV2,
    p_kind: kind,
  })
  throwIfError(error)
  return data as string
}

// =============================================================================
// Scope (patrón / trabajadores)
// =============================================================================

/** user_id de organización para datos distributor (patrón o staff → patron_user_id). */
export async function resolveDistribuidorScopeUserId(
  sb: SupabaseClient,
  authUserId: string
): Promise<string> {
  const { data, error } = await sb
    .from('trabajadores')
    .select('patron_user_id, user_id, rol')
    .eq('user_id', authUserId)
    .eq('profile_type_v2', 'distributor')
    .eq('activo', true)
    .maybeSingle()

  if (error) {
    console.warn('[distribuidor] resolveScopeUserId', error.message)
    return authUserId
  }

  const orgUserId = data?.patron_user_id ?? authUserId
  if (orgUserId !== authUserId) {
    console.log('[distribuidor] scope user_id', { authUserId, orgUserId })
  }
  return orgUserId
}


/** @deprecated Use resolveDistribuidorScopeUserId */
export const resolveDistribuidorScopeClerkId = resolveDistribuidorScopeUserId

export async function resolveDistribuidorScope(
  sb: SupabaseClient,
  authUserId: string
): Promise<ProfileScope> {
  return {
    user_id: await resolveDistribuidorScopeUserId(sb, authUserId),
    profile_type_v2: 'distributor',
  }
}

// =============================================================================
// Queries
// =============================================================================

function scopeFilter<T extends { eq: (c: string, v: string) => T }>(
  q: T,
  scope?: ProfileScope
): T {
  if (!scope) return q
  return q.eq('user_id', scope.user_id).eq('profile_type_v2', scope.profile_type_v2)
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
  if (error) {
    console.error('[distribuidor] fetchSkus', {
      user_id: scope?.user_id,
      profile_type_v2: scope?.profile_type_v2,
      error: error.message,
    })
    throwIfError(error)
  }
  const rows = (data || []) as SkuRow[]
  if (scope && rows.length === 0) {
    console.log('[distribuidor] fetchSkus 0 rows', {
      user_id: scope.user_id,
      profile_type_v2: scope.profile_type_v2,
    })
  }
  return rows
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

export type RegistrarMovimientoSkuInput = {
  skuId: string
  tipo: 'entrada' | 'venta' | 'donacion' | 'merma' | 'muestra'
  cantidad: number
  fecha?: string
  notas?: string | null
  clientId?: string | null
  recipient?: string | null
  reason?: string | null
  event?: string | null
  precioUnitario?: number | null
  total?: number | null
  moneda?: string | null
  distMovementId?: string | null
}

export async function fetchMovimientosSku(
  sb: SupabaseClient,
  options?: {
    date?: string
    limit?: number
    skuId?: string
    scope?: ProfileScope
  }
): Promise<
  Array<{
    id: string
    sku_id: string
    tipo: RegistrarMovimientoSkuInput['tipo']
    cantidad: number
    fecha: string
    notas: string | null
    client_id: string | null
    recipient: string | null
    reason: string | null
    event: string | null
    precio_unitario: number | null
    total: number | null
    moneda: string | null
    created_at: string
    skus: { nombre: string; botellas_por_caja: number; categoria: CategoriaSku } | null
    clients: { name: string } | null
  }>
> {
  let q = sb
    .from('movimientos_sku')
    .select(
      'id, sku_id, tipo, cantidad, fecha, notas, client_id, recipient, reason, event, precio_unitario, total, moneda, created_at, skus(nombre, botellas_por_caja, categoria), clients(name)'
    )
    .order('created_at', { ascending: false })

  if (options?.date) q = q.eq('fecha', options.date)
  if (options?.skuId) q = q.eq('sku_id', options.skuId)
  if (options?.limit) q = q.limit(options.limit)
  if (options?.scope) {
    q = q.eq('user_id', options.scope.user_id)
  }

  const { data, error } = await q
  throwIfError(error)
  return (data || []) as Awaited<ReturnType<typeof fetchMovimientosSku>>
}

export async function registrarMovimientoSku(
  sb: SupabaseClient,
  input: RegistrarMovimientoSkuInput
): Promise<void> {
  const { error } = await sb.rpc('registrar_movimiento_sku', {
    p_sku_id: input.skuId,
    p_tipo: input.tipo,
    p_cantidad: input.cantidad,
    p_fecha: input.fecha ?? undefined,
    p_notas: input.notas ?? undefined,
    p_client_id: input.clientId ?? undefined,
    p_recipient: input.recipient ?? undefined,
    p_reason: input.reason ?? undefined,
    p_event: input.event ?? undefined,
    p_precio_unitario: input.precioUnitario ?? undefined,
    p_total: input.total ?? undefined,
    p_moneda: input.moneda ?? undefined,
    p_dist_movement_id: input.distMovementId ?? undefined,
  })
  throwIfError(error)
}

export type CreateSkuCatalogInput = {
  nombre: string
  categoria: CategoriaSku
  productor?: string | null
  origen?: 'local' | 'importado'
  tipo_unidad?: 'botella' | 'lata'
  botellas_por_caja?: number
  costo_unitario?: number
  precio_venta?: number
  precio_mayoreo?: number
  precio_especial?: number
  moneda?: string
  notas?: string | null
  imagen_url?: string | null
  stock_total?: number
}

async function resolveDistribuidorClerkId(
  sb: SupabaseClient,
  scopeUserId: string
): Promise<string> {
  const { data: skuRow } = await sb
    .from('skus')
    .select('clerk_id')
    .eq('user_id', scopeUserId)
    .limit(1)
    .maybeSingle()
  if (skuRow?.clerk_id) return skuRow.clerk_id

  const { data: worker } = await sb
    .from('trabajadores')
    .select('clerk_id')
    .eq('user_id', scopeUserId)
    .eq('profile_type_v2', 'distributor')
    .limit(1)
    .maybeSingle()
  if (worker?.clerk_id) return worker.clerk_id

  return scopeUserId
}

export async function createSkuCatalog(
  sb: SupabaseClient,
  scope: ProfileScope,
  input: CreateSkuCatalogInput
): Promise<SkuRow> {
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const clerkId = await resolveDistribuidorClerkId(sb, scope.user_id)
  const codigo = await rpcProofNextCodigo(
    sb,
    scope.user_id,
    scope.profile_type_v2,
    'sku'
  )

  const { data, error } = await sb
    .from('skus')
    .insert({
      codigo,
      nombre: input.nombre,
      productor: input.productor?.trim() || '',
      categoria: input.categoria,
      botellas_por_caja: input.botellas_por_caja ?? 12,
      stock_total: input.stock_total ?? 0,
      costo_unitario: input.costo_unitario ?? 0,
      precio_venta: input.precio_venta ?? 0,
      origen: input.origen ?? 'local',
      tipo_unidad: input.tipo_unidad ?? 'botella',
      precio_mayoreo: input.precio_mayoreo ?? 0,
      precio_especial: input.precio_especial ?? 0,
      moneda: input.moneda ?? 'MXN',
      notas: input.notas ?? null,
      imagen_url: input.imagen_url ?? null,
      user_id: user.id,
      clerk_id: clerkId,
      profile_type_v2: scope.profile_type_v2,
    })
    .select('*')
    .single()

  throwIfError(error)
  return data as SkuRow
}

export async function updateSkuImagenUrl(
  sb: SupabaseClient,
  skuId: string,
  imagenUrl: string
): Promise<void> {
  const { error } = await sb
    .from('skus')
    .update({ imagen_url: imagenUrl, updated_at: new Date().toISOString() })
    .eq('id', skuId)
  throwIfError(error)
}

export async function createSkuCartera(
  sb: SupabaseClient,
  scope: ProfileScope,
  input: SkuFormInput
): Promise<SkuRow> {
  const nombre = input.nombre.trim()
  if (!nombre) throw new Error('Escribe el nombre del SKU')

  const codigo = await rpcProofNextCodigo(
    sb,
    scope.user_id,
    scope.profile_type_v2,
    'sku'
  )

  const { data, error } = await sb
    .from('skus')
    .insert({
      codigo,
      nombre,
      categoria_liquido: input.categoria_liquido ?? 'otro',
      precio_venta: input.precio_venta ?? 0,
      productor: input.productor?.trim() || '',
      user_id: scope.user_id,
      profile_type_v2: scope.profile_type_v2,
    })
    .select('*')
    .single()

  throwIfError(error)
  return data as SkuRow
}

export async function updateSkuCartera(
  sb: SupabaseClient,
  scope: ProfileScope,
  id: string,
  input: Partial<SkuFormInput>
): Promise<SkuRow> {
  const patch: Record<string, unknown> = {}

  if (input.nombre !== undefined) {
    const nombre = input.nombre.trim()
    if (!nombre) throw new Error('Escribe el nombre del SKU')
    patch.nombre = nombre
  }
  if (input.categoria_liquido !== undefined) {
    patch.categoria_liquido = input.categoria_liquido
  }
  if (input.precio_venta !== undefined) {
    patch.precio_venta = input.precio_venta
  }
  if (input.productor !== undefined) {
    patch.productor = input.productor?.trim() || ''
  }

  let q = sb.from('skus').update(patch).eq('id', id)
  q = scopeFilter(q, scope)
  const { data, error } = await q.select('*').single()
  throwIfError(error)
  return data as SkuRow
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
    clients_id: string
    etiqueta_id: string
    etiqueta_nombre: string
    fecha_entrega: string
    condicion_pago: string
    anticipo?: boolean
    anticipo_monto?: number | null
    notas?: string | null
    user_id: string
    profile_type_v2: string
  }
): Promise<PedidoRow> {
  const { data, error } = await sb
    .from('pedidos')
    .insert({
      ...input,
      anticipo: input.anticipo ?? false,
      anticipo_monto: input.anticipo_monto ?? null,
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
    .channel(`sku-stock-${scope.user_id}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'skus',
        filter: `user_id=eq.${scope.user_id}`,
      },
      payload => {
        const n = payload.new as SkuRow
        onPayload({
          id: n.id,
          user_id: n.user_id,
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
    orden_compra_distribuidor_id?: string | null
    costo_total?: number
    deuda_registrada?: number
    foto_urls?: string[]
    user_id: string
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
      orden_compra_distribuidor_id: input.orden_compra_distribuidor_id ?? null,
      costo_total: input.costo_total ?? 0,
      deuda_registrada: input.deuda_registrada ?? 0,
      foto_urls: input.foto_urls ?? [],
      estado: 'en_revision',
      user_id: input.user_id,
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
    orden_compra_distribuidor_id?: string | null
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
  user_id: string
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
  skus?: {
    id: string
    nombre: string
    productor: string | null
    categoria_liquido: CategoriaLiquido
  } | null
}

export const ITEMS_OC_DISTRIBUIDOR_SELECT =
  'items_orden_compra_distribuidor(*, skus(id, nombre, productor, categoria_liquido))'

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

export type OrdenCompraItemCantidad = {
  id: string
  cantidad_ordenada: number
  cantidad_recibida?: number | null
}

/** Unidades aún no ingresadas a bodega para una OC. */
export function pendienteIngresoUnidades(items: OrdenCompraItemCantidad[]): number {
  return items.reduce(
    (s, it) => s + Math.max(it.cantidad_ordenada - (it.cantidad_recibida ?? 0), 0),
    0
  )
}

/** Marca recepción completa (cantidad acumulada = ordenada) por ítem. */
export function lineasRecepcionCompleta(
  items: OrdenCompraItemCantidad[]
): ConfirmarLlegadaOcLinea[] {
  return items.map(it => ({
    item_id: it.id,
    cantidad_recibida: it.cantidad_ordenada,
  }))
}

export async function fetchOrdenesCompraDistribuidorPendientes(
  sb: SupabaseClient,
  scope?: ProfileScope
): Promise<OrdenCompraDistribuidorWithItems[]> {
  let q = sb
    .from('ordenes_compra_distribuidor')
    .select(`*, ${ITEMS_OC_DISTRIBUIDOR_SELECT}`)
    .in('estado', ['pendiente', 'parcial'])
    .order('fecha_estimada', { ascending: true, nullsFirst: false })
  q = scopeFilter(q, scope)
  const { data, error } = await q
  throwIfError(error)
  return (data || []) as OrdenCompraDistribuidorWithItems[]
}

export async function fetchUltimaOrdenCompraIngresada(
  sb: SupabaseClient,
  scope?: ProfileScope
): Promise<OrdenCompraDistribuidorWithItems | null> {
  let q = sb
    .from('ordenes_compra_distribuidor')
    .select(`*, ${ITEMS_OC_DISTRIBUIDOR_SELECT}`)
    .in('estado', ['recibida', 'parcial'])
    .not('fecha_recepcion', 'is', null)
    .order('fecha_recepcion', { ascending: false })
    .limit(1)
  if (scope) {
    q = q.eq('user_id', scope.user_id).eq('profile_type_v2', scope.profile_type_v2)
  }
  const { data, error } = await q.maybeSingle()
  throwIfError(error)
  return data as OrdenCompraDistribuidorWithItems | null
}

export async function fetchOrdenCompraDistribuidorWithItems(
  sb: SupabaseClient,
  ordenId: string
): Promise<OrdenCompraDistribuidorWithItems | null> {
  const { data, error } = await sb
    .from('ordenes_compra_distribuidor')
    .select(`*, ${ITEMS_OC_DISTRIBUIDOR_SELECT}`)
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
    scope.user_id,
    scope.profile_type_v2,
    'oc'
  )

  const { data: orden, error: ordenErr } = await sb
    .from('ordenes_compra_distribuidor')
    .insert({
      user_id: scope.user_id,
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
  user_id: string
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
  user_id: string
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
      `id, saldo_pendiente, monto_total, monto_pagado, proveedor_nombre, ordenes_compra_distribuidor(*, ${ITEMS_OC_DISTRIBUIDOR_SELECT})`
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

export async function fetchCuentaPorPagarByOrdenId(
  sb: SupabaseClient,
  ordenId: string
): Promise<{ cuenta: CuentaPorPagarRow; pagos: PagoProveedorRow[] } | null> {
  const { data, error } = await sb
    .from('cuentas_por_pagar')
    .select('*')
    .eq('orden_compra_id', ordenId)
    .maybeSingle()
  throwIfError(error)
  if (!data) return null
  const cuenta = data as CuentaPorPagarRow
  const pagos = await fetchPagosProveedorByCuentaIds(sb, [cuenta.id])
  return { cuenta, pagos }
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
  user_id: string
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
  user_id: string
  profile_type_v2: string
  cuenta_por_cobrar_id: string
  monto: number
  metodo: MetodoPagoCliente
  referencia: string | null
  fecha_pago: string
  nota: string | null
  created_at: string
}

// =============================================================================
// Pagos · cartera clientes (tablas pagos / pagos_pedidos)
// =============================================================================

export type EstadoPago = 'pendiente' | 'pagado' | 'vencido' | 'pago_parcial'

export interface PagoRow {
  id: string
  cliente_id: string
  monto: number
  fecha_pago: string
  fecha_vencimiento: string | null
  estado: EstadoPago
  referencia: string | null
  banco_origen: string | null
  banco_destino: string | null
  imagen_comprobante_url: string | null
  user_id: string
  profile_type_v2: string
  created_at: string
}

export interface PagoPedidoRow {
  id: string
  pago_id: string
  pedido_id: string
  monto_aplicado: number
}

export type Pago = PagoRow
export type PagoPedido = PagoPedidoRow

export interface ClienteFormInput {
  nombre: string
  telefono?: string | null
  email?: string | null
  direccion?: string | null
  dias_credito: number
  notas?: string | null
}

export interface SkuFormInput {
  nombre: string
  categoria_liquido: CategoriaLiquido
  precio_venta: number
  productor?: string | null
}

export interface ClienteConSaldo extends ClienteRow {
  saldo_pendiente: number
  tiene_deuda_vencida: boolean
}

export interface PagoConPedido extends PagoRow {
  pedidos_vinculados: Array<{
    pedido_id: string
    monto_aplicado: number
    pedido_numero: string | null
  }>
}

export interface ClienteDetalle extends ClienteRow {
  saldo_pendiente: number
  tiene_deuda_vencida: boolean
  pedidos: PedidoRow[]
  pagos: PagoConPedido[]
}

const ESTADOS_PAGO_PENDIENTE: EstadoPago[] = ['pendiente', 'vencido']

function aggregateSaldoPendiente(
  pagos: Pick<PagoRow, 'cliente_id' | 'monto' | 'estado'>[]
): Map<string, { saldo: number; vencida: boolean }> {
  const map = new Map<string, { saldo: number; vencida: boolean }>()
  for (const p of pagos) {
    if (!ESTADOS_PAGO_PENDIENTE.includes(p.estado)) continue
    const prev = map.get(p.cliente_id) ?? { saldo: 0, vencida: false }
    prev.saldo += Number(p.monto)
    if (p.estado === 'vencido') prev.vencida = true
    map.set(p.cliente_id, prev)
  }
  return map
}

export async function fetchClientesCartera(
  sb: SupabaseClient,
  scope: ProfileScope
): Promise<ClienteConSaldo[]> {
  let q = sb
    .from('clientes')
    .select('*')
    .eq('activo', true)
    .order('nombre', { ascending: true })
  q = scopeFilter(q, scope)
  const { data: clientes, error } = await q
  throwIfError(error)
  const rows = (clientes || []) as ClienteRow[]

  let pq = sb
    .from('pagos')
    .select('cliente_id, monto, estado')
    .in('estado', ESTADOS_PAGO_PENDIENTE)
  pq = scopeFilter(pq, scope)
  const { data: pagos, error: pagosErr } = await pq
  throwIfError(pagosErr)

  const saldos = aggregateSaldoPendiente((pagos || []) as PagoRow[])

  return rows.map(c => {
    const agg = saldos.get(c.id)
    return {
      ...c,
      saldo_pendiente: agg?.saldo ?? 0,
      tiene_deuda_vencida: agg?.vencida ?? false,
    }
  })
}

export async function fetchClienteCarteraById(
  sb: SupabaseClient,
  scope: ProfileScope,
  clienteId: string
): Promise<ClienteDetalle | null> {
  let cq = sb.from('clientes').select('*').eq('id', clienteId)
  cq = scopeFilter(cq, scope)
  const { data: cliente, error } = await cq.maybeSingle()
  throwIfError(error)
  if (!cliente) return null

  let pq = sb
    .from('pedidos')
    .select('*')
    .eq('cliente_id', clienteId)
    .order('fecha_creacion', { ascending: false })
  pq = scopeFilter(pq, scope)
  const { data: pedidos, error: pedidosErr } = await pq
  throwIfError(pedidosErr)

  let payQ = sb
    .from('pagos')
    .select(
      '*, pagos_pedidos(pedido_id, monto_aplicado, pedidos(numero))'
    )
    .eq('cliente_id', clienteId)
    .order('fecha_vencimiento', { ascending: false, nullsFirst: false })
  payQ = scopeFilter(payQ, scope)
  const { data: pagosRaw, error: pagosErr } = await payQ
  throwIfError(pagosErr)

  const pagos = ((pagosRaw || []) as Array<
    PagoRow & {
      pagos_pedidos?: Array<{
        pedido_id: string
        monto_aplicado: number
        pedidos?: { numero: string } | null
      }>
    }
  >).map(p => ({
    ...p,
    pedidos_vinculados: (p.pagos_pedidos || []).map(pp => ({
      pedido_id: pp.pedido_id,
      monto_aplicado: Number(pp.monto_aplicado),
      pedido_numero: pp.pedidos?.numero ?? null,
    })),
  }))

  const saldos = aggregateSaldoPendiente(pagos)

  return {
    ...(cliente as ClienteRow),
    saldo_pendiente: saldos.get(clienteId)?.saldo ?? 0,
    tiene_deuda_vencida: saldos.get(clienteId)?.vencida ?? false,
    pedidos: (pedidos || []) as PedidoRow[],
    pagos,
  }
}

export async function createClienteCartera(
  sb: SupabaseClient,
  scope: ProfileScope,
  input: ClienteFormInput
): Promise<ClienteRow> {
  const nombre = input.nombre.trim()
  if (!nombre) throw new Error('El nombre es obligatorio')

  const row = {
    nombre,
    telefono: input.telefono?.trim() || null,
    email: input.email?.trim() || null,
    direccion: input.direccion?.trim() || null,
    dias_credito: input.dias_credito,
    notas: input.notas?.trim() || null,
    activo: true,
    user_id: scope.user_id,
    profile_type_v2: scope.profile_type_v2,
  }

  const { data, error } = await sb.from('clientes').insert(row).select('*').single()
  throwIfError(error)
  return data as ClienteRow
}

export async function updateClienteCartera(
  sb: SupabaseClient,
  scope: ProfileScope,
  clienteId: string,
  input: Partial<ClienteFormInput> & { activo?: boolean }
): Promise<ClienteRow> {
  const patch: Record<string, unknown> = {}
  if (input.nombre !== undefined) {
    const nombre = input.nombre.trim()
    if (!nombre) throw new Error('El nombre es obligatorio')
    patch.nombre = nombre
  }
  if (input.telefono !== undefined) patch.telefono = input.telefono?.trim() || null
  if (input.email !== undefined) patch.email = input.email?.trim() || null
  if (input.direccion !== undefined) patch.direccion = input.direccion?.trim() || null
  if (input.dias_credito !== undefined) patch.dias_credito = input.dias_credito
  if (input.notas !== undefined) patch.notas = input.notas?.trim() || null
  if (input.activo !== undefined) patch.activo = input.activo

  let q = sb.from('clientes').update(patch).eq('id', clienteId)
  q = scopeFilter(q, scope)
  const { data, error } = await q.select('*').single()
  throwIfError(error)
  return data as ClienteRow
}

// =============================================================================
// Cajas distribuidor · trazabilidad (cajas_distribuidor / eventos_caja)
// =============================================================================

export type EstadoCajaDistribuidor = 'en_bodega' | 'en_camino' | 'entregado'

export type TipoEventoCaja = 'recepcion' | 'salida_bodega' | 'entrega'

export interface CajaDistribuidor {
  id: string
  qr_code: string
  sku_id: string
  oc_id: string | null
  estado: EstadoCajaDistribuidor
  user_id: string
  profile_type_v2: string
  created_at: string
}

export interface EventoCaja {
  id: string
  caja_id: string
  tipo: TipoEventoCaja
  trabajador_id: string
  pedido_id: string | null
  created_at: string
}

// =============================================================================
// Movimientos de stock (ledger inmutable)
// =============================================================================

export type TipoMovimientoStock = 'venta' | 'compra' | 'ajuste' | 'cancelacion'

/** Entero con signo: positivo = entrada · negativo = salida */
export type CantidadMovimientoStock = number

export interface MovimientoStock {
  id: string
  sku_id: string
  tipo: TipoMovimientoStock
  cantidad: CantidadMovimientoStock
  pedido_id: string | null
  oc_id: string | null
  trabajador_id: string | null
  user_id: string
  profile_type_v2: string
  timestamp: string
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
      .eq('user_id', scope.user_id)
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
    .eq('user_id', scope.user_id)
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
      .eq('user_id', scope.user_id)
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
