import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  ConfirmarLlegadaLinea,
  ConfirmarLlegadaResult,
  CreateViajeInput,
  DestLoteEstado,
  DestMembresia,
  DestViajeEstado,
  LoteRow,
  ProductoViajeRow,
  ViajeRow,
} from '@/lib/proof/destilador-types'

export function destiladorClerkFilter<T extends { eq: (col: string, val: string) => T }>(
  q: T,
  clerkId: string
): T {
  return q.eq('clerk_id', clerkId)
}

export async function fetchDestiladorMembresia(
  supabase: SupabaseClient,
  clerkId: string
): Promise<DestMembresia> {
  const { data } = await supabase
    .from('profiles')
    .select('destilador_membresia')
    .eq('clerk_id', clerkId)
    .eq('profile_type_v2', 'distiller')
    .maybeSingle()
  const m = data?.destilador_membresia as DestMembresia | null
  return m ?? 'basico'
}

export async function fetchViajes(
  supabase: SupabaseClient,
  clerkId: string,
  opts?: { estado?: DestViajeEstado; limit?: number }
): Promise<ViajeRow[]> {
  let q = supabase
    .from('viajes')
    .select('*')
    .eq('clerk_id', clerkId)
    .order('fecha', { ascending: false })
  if (opts?.estado) q = q.eq('estado', opts.estado)
  if (opts?.limit) q = q.limit(opts.limit)
  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as ViajeRow[]
}

export async function fetchProductosViaje(
  supabase: SupabaseClient,
  viajeIds: string[]
): Promise<ProductoViajeRow[]> {
  if (viajeIds.length === 0) return []
  const { data, error } = await supabase
    .from('productos_viaje')
    .select('*')
    .in('viaje_id', viajeIds)
  if (error) throw error
  return (data ?? []) as ProductoViajeRow[]
}

/** Conteos por estado — nunca suma litros entre agaves. */
export async function countViajesByEstado(
  supabase: SupabaseClient,
  clerkId: string
): Promise<Record<DestViajeEstado, number>> {
  const rows = await fetchViajes(supabase, clerkId, { limit: 500 })
  const base: Record<DestViajeEstado, number> = {
    en_negociacion: 0,
    confirmado: 0,
    en_transito: 0,
    recibido: 0,
  }
  for (const v of rows) {
    base[v.estado] = (base[v.estado] ?? 0) + 1
  }
  return base
}

export async function sumSaldosPalenqueros(
  supabase: SupabaseClient,
  clerkId: string
): Promise<number> {
  const viajes = await fetchViajes(supabase, clerkId, { limit: 200 })
  const activos = viajes.filter(v => v.estado !== 'recibido')
  if (activos.length === 0) return 0
  const productos = await fetchProductosViaje(
    supabase,
    activos.map(v => v.id)
  )
  return productos.reduce((s, p) => s + Number(p.saldo_pendiente ?? 0), 0)
}

export async function fetchLotes(
  supabase: SupabaseClient,
  clerkId: string,
  opts?: { estado?: DestLoteEstado; limit?: number }
): Promise<LoteRow[]> {
  let q = supabase
    .from('lotes')
    .select(
      `id, numero_lote, viaje_id, producto_viaje_id, tipo_agave,
       litros_disponibles_granel, litros_recibidos, estado, bodega_id, fecha_recepcion,
       productos_viaje ( precio_por_litro, flete_proporcional, litros_acordados )`
    )
    .eq('clerk_id', clerkId)
    .order('fecha_recepcion', { ascending: false })
  if (opts?.estado) q = q.eq('estado', opts.estado)
  if (opts?.limit) q = q.limit(opts.limit)
  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as LoteRow[]
}

export async function countLotesByEstado(
  supabase: SupabaseClient,
  clerkId: string
): Promise<Record<DestLoteEstado, number>> {
  const rows = await fetchLotes(supabase, clerkId, { limit: 500 })
  const base: Record<DestLoteEstado, number> = {
    en_bodega_crudo: 0,
    en_produccion: 0,
    terminado: 0,
    vendido_parcial: 0,
  }
  for (const l of rows) {
    base[l.estado] = (base[l.estado] ?? 0) + 1
  }
  return base
}

/** Pipeline compras: viajes en tránsito + lotes por etapa (conteos, no litros). */
export async function fetchComprasPipelineCounts(
  supabase: SupabaseClient,
  clerkId: string
): Promise<{
  enTransito: number
  enBodegaCrudo: number
  enProduccion: number
  terminado: number
}> {
  const [viajes, lotesBy] = await Promise.all([
    fetchViajes(supabase, clerkId, { limit: 500 }),
    countLotesByEstado(supabase, clerkId),
  ])
  const enTransito = viajes.filter(v => v.estado === 'en_transito').length
  return {
    enTransito,
    enBodegaCrudo: lotesBy.en_bodega_crudo,
    enProduccion: lotesBy.en_produccion,
    terminado: lotesBy.terminado,
  }
}

export async function fetchViajeById(
  supabase: SupabaseClient,
  clerkId: string,
  viajeId: string
): Promise<ViajeRow | null> {
  const { data, error } = await supabase
    .from('viajes')
    .select('*')
    .eq('clerk_id', clerkId)
    .eq('id', viajeId)
    .maybeSingle()
  if (error) throw error
  return (data as ViajeRow | null) ?? null
}

export async function fetchProductosForViaje(
  supabase: SupabaseClient,
  clerkId: string,
  viajeId: string
): Promise<ProductoViajeRow[]> {
  const { data, error } = await supabase
    .from('productos_viaje')
    .select('*')
    .eq('clerk_id', clerkId)
    .eq('viaje_id', viajeId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as ProductoViajeRow[]
}

export async function createViajeDestilador(
  supabase: SupabaseClient,
  clerkId: string,
  input: CreateViajeInput
): Promise<{ viajeId: string }> {
  const { data: viaje, error: viajeErr } = await supabase
    .from('viajes')
    .insert({
      clerk_id: clerkId,
      fecha: input.fecha,
      region: input.region,
      comunidad: input.comunidad,
      palenquero_nombre: input.palenquero_nombre,
      palenquero_contacto: input.palenquero_contacto,
      costo_flete: input.costo_flete,
      estado: input.estado,
    })
    .select('id')
    .single()
  if (viajeErr) throw viajeErr
  if (!input.productos.length) {
    throw new Error('Agrega al menos un producto (tipo de agave)')
  }

  const rows = input.productos.map(p => ({
    clerk_id: clerkId,
    viaje_id: viaje.id,
    tipo_agave: p.tipo_agave.trim(),
    litros_acordados: p.litros_acordados,
    precio_por_litro: p.precio_por_litro,
    anticipo_pagado: p.anticipo_pagado,
  }))

  const { error: prodErr } = await supabase.from('productos_viaje').insert(rows)
  if (prodErr) {
    await supabase.from('viajes').delete().eq('id', viaje.id)
    throw prodErr
  }

  return { viajeId: viaje.id as string }
}

export async function confirmarLlegadaDestilador(
  supabase: SupabaseClient,
  viajeId: string,
  lineas: ConfirmarLlegadaLinea[]
): Promise<ConfirmarLlegadaResult[]> {
  const payload = lineas.map(l => ({
    producto_viaje_id: l.producto_viaje_id,
    litros_salida: l.litros_salida,
    litros_recibidos: l.litros_recibidos,
    abv: l.abv ?? null,
  }))

  const { data, error } = await supabase.rpc('confirmar_llegada_destilador', {
    p_viaje_id: viajeId,
    p_lineas: payload,
  })
  if (error) throw error
  return (data ?? []) as ConfirmarLlegadaResult[]
}
