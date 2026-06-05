import type { SupabaseClient } from '@supabase/supabase-js'
import type { ProfileScope } from '@/lib/supabase'
import {
  createPedidoBorrador,
  replacePedidoItems,
  rpcConfirmarPedido,
  rpcProofNextCodigo,
  type PedidoRow,
  type SkuRow,
} from '@/lib/supabase/distribuidor'

export type UnidadPedido = 'latas' | 'botellas' | 'cajas'

export type LineaToma = {
  etiqueta: string
  cantidad: number
  unidad: UnidadPedido
}

export type TomaPedidoNotas = {
  lineas: LineaToma[]
  anticipo: boolean
  anticipo_monto?: number | null
}

export function parseTomaPedidoNotas(notas: string | null | undefined): TomaPedidoNotas | null {
  if (!notas?.trim()) return null
  try {
    const parsed = JSON.parse(notas) as TomaPedidoNotas
    if (Array.isArray(parsed.lineas) && parsed.lineas.length > 0) return parsed
  } catch {
    /* notas legacy en texto libre */
  }
  return null
}

const UNIDAD_LABEL: Record<UnidadPedido, string> = {
  latas: 'latas',
  botellas: 'botellas',
  cajas: 'cajas',
}

export function formatLineaToma(l: LineaToma): string {
  return `${l.cantidad} ${UNIDAD_LABEL[l.unidad]}`
}

export async function ensureClientForScope(
  sb: SupabaseClient,
  scope: ProfileScope,
  name: string
): Promise<{ id: string; name: string }> {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('Escribe el nombre del cliente')

  const { data: existing, error: findErr } = await sb
    .from('clients')
    .select('id, name')
    .eq('clerk_id', scope.clerk_id)
    .eq('profile_type_v2', scope.profile_type_v2)
    .ilike('name', trimmed)
    .limit(1)
    .maybeSingle()

  if (findErr) throw new Error(findErr.message)
  if (existing) return { id: existing.id, name: existing.name }

  const { data: created, error: insErr } = await sb
    .from('clients')
    .insert({
      name: trimmed,
      clerk_id: scope.clerk_id,
      profile_type_v2: scope.profile_type_v2,
      type: 'tienda',
      price_tier: 'regular',
    })
    .select('id, name')
    .single()

  if (insErr) throw new Error(insErr.message)
  return { id: created.id, name: created.name }
}

async function ensureEtiquetaForClient(
  sb: SupabaseClient,
  scope: ProfileScope,
  clientId: string,
  nombre: string
): Promise<{ id: string; nombre: string }> {
  const trimmed = nombre.trim()
  if (!trimmed) throw new Error('Escribe la etiqueta o producto')

  const { data: existing, error: findErr } = await sb
    .from('client_etiquetas')
    .select('id, nombre')
    .eq('client_id', clientId)
    .eq('clerk_id', scope.clerk_id)
    .eq('profile_type_v2', scope.profile_type_v2)
    .ilike('nombre', trimmed)
    .limit(1)
    .maybeSingle()

  if (findErr) throw new Error(findErr.message)
  if (existing) return { id: existing.id, nombre: existing.nombre }

  const { data: created, error: insErr } = await sb
    .from('client_etiquetas')
    .insert({
      client_id: clientId,
      nombre: trimmed,
      clerk_id: scope.clerk_id,
      profile_type_v2: scope.profile_type_v2,
    })
    .select('id, nombre')
    .single()

  if (insErr) throw new Error(insErr.message)
  return { id: created.id, nombre: created.nombre }
}

function findSkuForLine(skus: SkuRow[], etiquetaId: string, etiquetaNombre: string): SkuRow | null {
  const byEtiqueta = skus.find(s => s.etiqueta_id === etiquetaId)
  if (byEtiqueta) return byEtiqueta
  const n = etiquetaNombre.trim().toLowerCase()
  return (
    skus.find(s => s.nombre.trim().toLowerCase() === n) ??
    skus.find(s => s.nombre.trim().toLowerCase().includes(n)) ??
    null
  )
}

export async function finalizarTomaPedido(
  sb: SupabaseClient,
  scope: ProfileScope,
  input: {
    clienteName: string
    lineas: LineaToma[]
    fechaEntrega: string
    anticipo: boolean
    anticipoMonto?: number | null
    skus: SkuRow[]
  }
): Promise<{ pedido: PedidoRow; lineas: LineaToma[]; itemsGuardados: number }> {
  const lineas = input.lineas.filter(l => l.etiqueta.trim() && l.cantidad > 0)
  if (lineas.length === 0) throw new Error('Agrega al menos una línea de producto')
  if (input.anticipo && (input.anticipoMonto == null || input.anticipoMonto <= 0)) {
    throw new Error('Escribe el monto del anticipo')
  }

  const cliente = await ensureClientForScope(sb, scope, input.clienteName)

  const etiquetas = await Promise.all(
    lineas.map(l => ensureEtiquetaForClient(sb, scope, cliente.id, l.etiqueta))
  )

  const numero = await rpcProofNextCodigo(sb, scope.clerk_id, scope.profile_type_v2, 'pedido')
  const primary = etiquetas[0]!
  const anticipoMonto = input.anticipo ? (input.anticipoMonto ?? null) : null
  const notas: TomaPedidoNotas = { lineas, anticipo: input.anticipo, anticipo_monto: anticipoMonto }

  const pedido = await createPedidoBorrador(sb, {
    numero,
    cliente_id: cliente.id,
    etiqueta_id: primary.id,
    etiqueta_nombre: lineas.length === 1 ? primary.nombre : `${primary.nombre} +${lineas.length - 1}`,
    fecha_entrega: input.fechaEntrega,
    condicion_pago: input.anticipo
      ? `anticipo${anticipoMonto != null ? ` $${anticipoMonto.toFixed(2)}` : ''}`
      : '30 días crédito',
    anticipo: input.anticipo,
    notas: JSON.stringify(notas),
    clerk_id: scope.clerk_id,
    profile_type_v2: scope.profile_type_v2,
  })

  const itemRows: Array<{
    sku_id: string
    nombre: string
    cantidad: number
    precio_unitario: number
    disponible_al_crear: number
    unidad?: string
  }> = []

  for (let i = 0; i < lineas.length; i++) {
    const line = lineas[i]!
    const et = etiquetas[i]!
    const sku = findSkuForLine(input.skus, et.id, et.nombre)
    if (!sku) continue
    itemRows.push({
      sku_id: sku.id,
      nombre: `${line.etiqueta} (${line.unidad})`,
      cantidad: line.cantidad,
      precio_unitario: Number(sku.precio_venta),
      disponible_al_crear: sku.stock_disponible,
      unidad: line.unidad,
    })
  }

  if (itemRows.length > 0) {
    await replacePedidoItems(sb, pedido.id, itemRows)
  }

  const confirmado = await rpcConfirmarPedido(sb, pedido.id)

  return { pedido: confirmado, lineas, itemsGuardados: itemRows.length }
}
