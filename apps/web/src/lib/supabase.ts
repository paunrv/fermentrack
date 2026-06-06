import type { SupabaseClient } from '@supabase/supabase-js'

export const SUPER_USER_EMAIL = 'phsho007@gmail.com'

// — PROOF Distribuidor (skus, pedidos, recepciones, crédito) —
export type {
  CategoriaSku,
  EstadoSku,
  Rotacion30d,
  EstadoPedido,
  EstadoRecepcion,
  CondicionItemRecepcion,
  TipoDiscrepancia,
  TipoDeudaProductor,
  EstadoDeudaProductor,
  EstadoCuentaCliente,
  SkuRow,
  ClientEtiquetaRow,
  PedidoRow,
  ItemPedidoRow,
  PedidoWithItems,
  RemisionDistribuidorRow,
  RecepcionRow,
  OrdenCompraRow,
  ItemOrdenCompraRow,
  OrdenCompraWithItems,
  OrdenCompraDistribuidorRow,
  ItemOrdenCompraDistribuidorRow,
  OrdenCompraDistribuidorWithItems,
  EstadoOrdenCompraDistribuidor,
  NuevoItemOrdenCompraInput,
  ConfirmarLlegadaOcLinea,
  CuentaPorPagarRow,
  PagoProveedorRow,
  OrdenCompraConCxP,
  EstadoCuentaPorPagar,
  MetodoPagoProveedor,
  EstadoOrdenCompra,
  ItemRecepcionRow,
  DiscrepanciaRow,
  DeudaProductorRow,
  CuentaClienteRow,
  SkuStockPayload,
  SKU,
  Pedido,
  ItemPedido,
  Recepcion,
  ItemRecepcion,
  Discrepancia,
  DeudaProductor,
  CuentaCliente,
} from './supabase/distribuidor'

export {
  rpcConfirmarPedido,
  rpcCancelarPedido,
  rpcEntregarPedido,
  rpcConfirmarRecepcion,
  rpcSyncAllSkusForScope,
  rpcProofNextCodigo,
  fetchSkus,
  fetchClientEtiquetas,
  fetchPedidos,
  fetchPedidoWithItems,
  fetchRemisionByPedidoId,
  createPedidoBorrador,
  replacePedidoItems,
  subscribeSkuStock,
  createRecepcionDraft,
  updateRecepcionDraft,
  clearRecepcionLineItems,
  insertItemsRecepcion,
  insertDiscrepancias,
  fetchOrdenesCompraAbiertas,
  fetchOrdenCompraWithItems,
  itemsOrdenToExpected,
  fetchDeudasProductores,
  fetchCuentasClientes,
  fetchCreditoResumen,
  marcarDeudaPagada,
  fetchAlertasCreditoCriticas,
  fetchSkusByProductor,
  fetchDeudasByProductor,
  fetchOrdenesCompraByProductor,
  fetchOrdenesCompraDistribuidorPendientes,
  fetchOrdenCompraDistribuidorWithItems,
  createOrdenCompraDistribuidor,
  confirmarLlegadaOrdenCompraDistribuidor,
  fetchCuentasPorPagarActivas,
  fetchOrdenesCompraConCxPendiente,
  rpcRegistrarPagoProveedor,
  fetchRecepcionesRemision,
  fetchRecepcionRemisionDetalle,
  type RecepcionRemisionListRow,
  type RecepcionRemisionDetalle,
  type CreditoResumen,
  type CuentaClienteWithClient,
  type AlertaCreditoCritica,
} from './supabase/distribuidor'

export type ProfileType = 'brewer' | 'winemaker' | 'distiller' | 'distributor'
export type ExtraProfile = 'brewer' | 'winemaker' | 'distiller' | 'distributor'

export interface Profile {
  id?: string
  clerk_id: string
  username: string | null
  profile_type: ProfileType | null
  profile_type_v2: ExtraProfile
  onboarding_complete: boolean
  is_super_user: boolean
  extra_profiles: ExtraProfile[]
  email: string | null
  created_at?: string
  updated_at?: string
}

export interface ProfileScope {
  clerk_id: string
  profile_type_v2: ExtraProfile
}

export type BatchStatus = 'active' | 'warn' | 'idle'

export interface Batch {
  id: string
  name: string
  type: string
  volume: number
  yeast: string | null
  density: number | null
  ph: number | null
  temp: number | null
  day: number
  progress: number
  status: BatchStatus
  alert: string | null
  created_at: string
  updated_at: string
}

export interface Sample {
  id: string
  batch_id: string
  type: string | null
  notes: string | null
  ph: number | null
  density: number | null
  img_url: string | null
  analysis: string | null
  created_at: string
}

export interface Activity {
  id: string
  batch_id: string | null
  time_label: string | null
  text: string
  sub: string | null
  color: string | null
  created_at: string
}

export async function fetchBatches(
  sb: SupabaseClient,
  scope?: ProfileScope
): Promise<Batch[]> {
  let query = sb
    .from('batches')
    .select('*')
    .order('created_at', { ascending: false })
  if (scope) {
    query = query.eq('clerk_id', scope.clerk_id).eq('profile_type_v2', scope.profile_type_v2)
  }
  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function fetchSamples(
  sb: SupabaseClient,
  scope?: ProfileScope
): Promise<Sample[]> {
  let query = sb
    .from('samples')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(30)
  if (scope) {
    query = query.eq('clerk_id', scope.clerk_id).eq('profile_type_v2', scope.profile_type_v2)
  }
  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function createBatch(
  sb: SupabaseClient,
  batch: Omit<Batch, 'created_at' | 'updated_at'>
): Promise<void> {
  const { error } = await sb.from('batches').insert(batch)
  if (error) throw error
}

export async function updateBatch(
  sb: SupabaseClient,
  id: string,
  updates: Partial<Batch>
): Promise<void> {
  const { error } = await sb
    .from('batches')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function createSample(
  sb: SupabaseClient,
  sample: Omit<Sample, 'id' | 'created_at'>
): Promise<void> {
  const { error } = await sb.from('samples').insert(sample)
  if (error) throw error
}

export async function logActivity(
  sb: SupabaseClient,
  batchId: string | null,
  text: string,
  sub: string,
  color = 'var(--green)'
): Promise<void> {
  const timeLabel = new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
  await sb.from('activity').insert({ batch_id: batchId, time_label: timeLabel, text, sub, color })
}

export interface BottlingMaterial {
  qty: number
  unit_cost: number
}

export interface BottlingMaterials {
  containers: BottlingMaterial
  labels: BottlingMaterial
  corks: BottlingMaterial
  capsules: BottlingMaterial
  boxes: BottlingMaterial
}

export interface Bottling {
  id: string
  batch_id: string
  unit_type: 'botella' | 'lata'
  materials: BottlingMaterials
  total_units: number
  notes: string | null
  created_at: string
}

export type ProductionCostCategory =
  | 'materia_prima'
  | 'mano_obra'
  | 'equipo'
  | 'energia'
  | 'limpieza'
  | 'analisis'
  | 'otro'

export interface ProductionCost {
  id: string
  batch_id: string
  category: ProductionCostCategory
  description: string
  amount: number
  currency: string
  cost_date: string
  created_at: string
}

export interface WarehouseExit {
  id: string
  batch_id: string
  units: number
  price_per_unit: number
  notes: string | null
  created_at: string
}

export async function fetchBottling(
  sb: SupabaseClient,
  scope?: ProfileScope
): Promise<Bottling[]> {
  let query = sb
    .from('bottling')
    .select('*')
    .order('created_at', { ascending: false })
  if (scope) {
    query = query.eq('clerk_id', scope.clerk_id).eq('profile_type_v2', scope.profile_type_v2)
  }
  const { data, error } = await query
  if (error) throw error
  return (data || []) as Bottling[]
}

export async function createBottling(
  sb: SupabaseClient,
  record: Omit<Bottling, 'id' | 'created_at'>
): Promise<void> {
  const { error } = await sb.from('bottling').insert(record)
  if (error) throw error
}

export async function fetchProductionCosts(
  sb: SupabaseClient,
  batchId: string,
  scope?: ProfileScope
): Promise<ProductionCost[]> {
  let query = sb
    .from('production_costs')
    .select('*')
    .eq('batch_id', batchId)
    .order('cost_date', { ascending: false })
  if (scope) {
    query = query.eq('clerk_id', scope.clerk_id).eq('profile_type_v2', scope.profile_type_v2)
  }
  const { data, error } = await query
  if (error) throw error
  return (data || []) as ProductionCost[]
}

export async function createProductionCost(
  sb: SupabaseClient,
  record: Omit<ProductionCost, 'id' | 'created_at'>
): Promise<void> {
  const { error } = await sb.from('production_costs').insert(record)
  if (error) throw error
}

export async function fetchWarehouseExits(
  sb: SupabaseClient,
  scope?: ProfileScope
): Promise<WarehouseExit[]> {
  let query = sb
    .from('warehouse_exits')
    .select('*')
    .order('created_at', { ascending: false })
  if (scope) {
    query = query.eq('clerk_id', scope.clerk_id).eq('profile_type_v2', scope.profile_type_v2)
  }
  const { data, error } = await query
  if (error) throw error
  return (data || []) as WarehouseExit[]
}

export async function createWarehouseExit(
  sb: SupabaseClient,
  record: Omit<WarehouseExit, 'id' | 'created_at'>
): Promise<void> {
  const { error } = await sb.from('warehouse_exits').insert(record)
  if (error) throw error
}

export type ClientType = 'restaurante' | 'bar' | 'tienda' | 'sub-distribuidor'
export type PriceTier = 'regular' | 'mayoreo' | 'especial'

export interface Client {
  id: string
  name: string
  type: ClientType
  contact_name: string | null
  phone: string | null
  email: string | null
  address: string | null
  price_tier: PriceTier
  notes: string | null
  created_at: string
}

export async function fetchClients(
  sb: SupabaseClient,
  scope?: ProfileScope
): Promise<Client[]> {
  let query = sb
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false })
  if (scope) {
    query = query.eq('clerk_id', scope.clerk_id).eq('profile_type_v2', scope.profile_type_v2)
  }
  const { data, error } = await query
  if (error) throw error
  return (data || []) as Client[]
}

export async function createClient(
  sb: SupabaseClient,
  record: Omit<Client, 'id' | 'created_at'>
): Promise<void> {
  const { error } = await sb.from('clients').insert(record)
  if (error) throw error
}

export type ProductCategory = 'cerveza' | 'vino' | 'destilado'
export type ProductOrigin = 'local' | 'importado'
export type ProductUnitType = 'botella' | 'lata'

export interface DistProduct {
  id: string
  name: string
  category: ProductCategory
  producer: string | null
  origin: ProductOrigin
  unit_type: ProductUnitType
  bottles_per_case: number
  cost_per_unit: number
  price_regular: number
  price_mayoreo: number
  price_especial: number
  currency: string
  notes: string | null
  created_at: string
  image_url?: string | null
  clerk_id?: string | null
  profile_type_v2?: ExtraProfile | null
}

export async function fetchDistProducts(
  sb: SupabaseClient,
  scope?: ProfileScope
): Promise<DistProduct[]> {
  let query = sb
    .from('dist_products')
    .select('*')
    .order('created_at', { ascending: false })
  if (scope) {
    query = query.eq('clerk_id', scope.clerk_id).eq('profile_type_v2', scope.profile_type_v2)
  }
  const { data, error } = await query
  if (error) throw error
  return (data || []) as DistProduct[]
}

export async function fetchDistProductById(
  sb: SupabaseClient,
  id: string
): Promise<DistInventoryRow | null> {
  const { data, error } = await sb
    .from('dist_products')
    .select('*, dist_inventory(*)')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  const row = data as any
  const inv = Array.isArray(row.dist_inventory) ? row.dist_inventory[0] : row.dist_inventory
  const { dist_inventory, ...product } = row
  return { ...(product as DistProduct), inventory: (inv as DistInventory) || null }
}

export async function createDistProduct(
  sb: SupabaseClient,
  record: Omit<DistProduct, 'id' | 'created_at'>
): Promise<void> {
  const { error } = await sb.from('dist_products').insert(record)
  if (error) throw error
}

export interface DistInventory {
  product_id: string
  cases: number
  loose_units: number
  max_units: number
  updated_at: string
}

export interface DistInventoryRow extends DistProduct {
  inventory: DistInventory | null
}

export type MovementType = 'entrada' | 'venta' | 'donacion' | 'merma' | 'muestra'

export interface DistMovement {
  id: string
  product_id: string
  movement_type: MovementType
  cases: number
  loose_units: number
  movement_date: string
  notes: string | null
  created_at: string
  client_id?: string | null
  recipient?: string | null
  reason?: string | null
  event?: string | null
  unit_price?: number | null
  total_amount?: number | null
  currency?: string | null
}

export interface DistMovementWithRefs extends DistMovement {
  dist_products: {
    name: string
    category: ProductCategory
    bottles_per_case: number
    currency: string
  } | null
  clients: { name: string } | null
}

export async function fetchDistInventory(
  sb: SupabaseClient,
  scope?: ProfileScope
): Promise<DistInventoryRow[]> {
  let query = sb
    .from('dist_products')
    .select('*, dist_inventory(*)')
    .order('created_at', { ascending: false })
  if (scope) {
    query = query.eq('clerk_id', scope.clerk_id).eq('profile_type_v2', scope.profile_type_v2)
  }
  const { data, error } = await query
  if (error) throw error
  return (data || []).map((row: any) => {
    const inv = Array.isArray(row.dist_inventory) ? row.dist_inventory[0] : row.dist_inventory
    const { dist_inventory, ...product } = row
    return { ...(product as DistProduct), inventory: (inv as DistInventory) || null }
  })
}

export async function createDistMovement(
  sb: SupabaseClient,
  record: Omit<DistMovement, 'id' | 'created_at'>
): Promise<void> {
  const { error } = await sb.from('dist_movements').insert(record)
  if (error) throw error
}

export async function fetchDistMovements(
  sb: SupabaseClient,
  options?: {
    date?: string
    limit?: number
    productId?: string
    scope?: ProfileScope
  }
): Promise<DistMovementWithRefs[]> {
  let query = sb
    .from('dist_movements')
    .select(
      '*, dist_products(name, category, bottles_per_case, currency), clients(name)'
    )
    .order('created_at', { ascending: false })

  if (options?.date) {
    query = query.eq('movement_date', options.date)
  }
  if (options?.productId) {
    query = query.eq('product_id', options.productId)
  }
  if (options?.limit) {
    query = query.limit(options.limit)
  }
  if (options?.scope) {
    query = query
      .eq('clerk_id', options.scope.clerk_id)
      .eq('profile_type_v2', options.scope.profile_type_v2)
  }

  const { data, error } = await query
  if (error) throw error
  return (data || []) as DistMovementWithRefs[]
}

export async function updateDistInventory(
  sb: SupabaseClient,
  productId: string,
  deltaCases: number,
  deltaLooseUnits: number,
  bottlesPerCase: number
): Promise<void> {
  const { data: existing, error: fetchError } = await sb
    .from('dist_inventory')
    .select('*')
    .eq('product_id', productId)
    .maybeSingle()
  if (fetchError) throw fetchError

  const currentCases = existing?.cases ?? 0
  const currentLoose = existing?.loose_units ?? 0
  const currentMax = existing?.max_units ?? 0

  const newCases = Math.max(0, currentCases + deltaCases)
  const newLoose = Math.max(0, currentLoose + deltaLooseUnits)
  const newTotal = newCases * bottlesPerCase + newLoose
  const newMax = Math.max(currentMax, newTotal)

  const { error } = await sb.from('dist_inventory').upsert({
    product_id: productId,
    cases: newCases,
    loose_units: newLoose,
    max_units: newMax,
    updated_at: new Date().toISOString(),
  })
  if (error) throw error
}

function normalizeProfile(row: any): Profile {
  return {
    ...row,
    extra_profiles: (row.extra_profiles || []) as ExtraProfile[],
    is_super_user: Boolean(row.is_super_user),
    onboarding_complete: Boolean(row.onboarding_complete),
  } as Profile
}

export async function fetchProfiles(
  sb: SupabaseClient,
  clerkId: string
): Promise<Profile[]> {
  const { data, error } = await sb
    .from('profiles')
    .select('*')
    .eq('clerk_id', clerkId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data || []).map(normalizeProfile)
}

export async function fetchActiveProfile(
  sb: SupabaseClient,
  clerkId: string,
  profileType: ExtraProfile
): Promise<Profile | null> {
  const { data, error } = await sb
    .from('profiles')
    .select('*')
    .eq('clerk_id', clerkId)
    .eq('profile_type_v2', profileType)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  return normalizeProfile(data)
}

export async function upsertProfile(
  sb: SupabaseClient,
  data: Partial<Profile> & { clerk_id: string; profile_type_v2: ExtraProfile }
): Promise<void> {
  const isSuper =
    Boolean(data.is_super_user) ||
    (data.email?.toLowerCase() === SUPER_USER_EMAIL.toLowerCase())

  const record = {
    ...data,
    is_super_user: isSuper,
    extra_profiles: data.extra_profiles || [],
    updated_at: new Date().toISOString(),
  }

  const { error } = await sb
    .from('profiles')
    .upsert(record, { onConflict: 'clerk_id,profile_type_v2' })
  if (error) throw error
}

export async function deleteProfile(
  sb: SupabaseClient,
  clerkId: string,
  profileType: ExtraProfile
): Promise<void> {
  const { error } = await sb
    .from('profiles')
    .delete()
    .eq('clerk_id', clerkId)
    .eq('profile_type_v2', profileType)
  if (error) throw error
}
