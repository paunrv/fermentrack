import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  BodegaRow,
  ConfirmarLlegadaLinea,
  ConfirmarLlegadaResult,
  CorridaRow,
  CreateCorridaInput,
  CreateViajeInput,
  DestFormatoBotella,
  DestLoteEstado,
  DestMembresia,
  DestViajeEstado,
  LoteRow,
  ProductoViajeRow,
  StockBotellaRow,
  StockEtiquetaRow,
  ViajeRow,
} from '@/lib/proof/destilador-types'

export const FORMATO_LITROS: Record<DestFormatoBotella, number> = {
  '750ml': 0.75,
  '500ml': 0.5,
  '200ml': 0.2,
}

export function isDestSchemaMissingError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return (
    msg.includes('does not exist') ||
    msg.includes('PGRST204') ||
    msg.includes('PGRST205') ||
    msg.includes('schema cache') ||
    msg.includes('relation')
  )
}

type ProductoViajeEmbed = {
  precio_por_litro: number
  flete_proporcional: number | null
  litros_acordados: number
  saldo_pendiente?: number
  merma_litros?: number | null
}

function normalizeProductoViajeEmbed(
  raw: ProductoViajeEmbed | ProductoViajeEmbed[] | null | undefined
): LoteRow['productos_viaje'] {
  if (!raw) return null
  const row = Array.isArray(raw) ? raw[0] : raw
  if (!row) return null
  return {
    precio_por_litro: Number(row.precio_por_litro),
    flete_proporcional:
      row.flete_proporcional != null ? Number(row.flete_proporcional) : null,
    litros_acordados: Number(row.litros_acordados),
    saldo_pendiente:
      row.saldo_pendiente != null ? Number(row.saldo_pendiente) : undefined,
    merma_litros:
      row.merma_litros != null ? Number(row.merma_litros) : null,
  }
}

function normalizeLoteRow(raw: Record<string, unknown>): LoteRow {
  const { productos_viaje, ...rest } = raw
  return {
    ...(rest as unknown as Omit<LoteRow, 'productos_viaje'>),
    productos_viaje: normalizeProductoViajeEmbed(
      productos_viaje as ProductoViajeEmbed | ProductoViajeEmbed[] | null
    ),
  }
}

function normalizeCorridaRow(raw: Record<string, unknown>): CorridaRow {
  const { lotes, ...rest } = raw
  let loteEmbed: CorridaRow['lotes'] = null
  if (lotes && typeof lotes === 'object') {
    const row = Array.isArray(lotes) ? lotes[0] : lotes
    if (row && typeof row === 'object') {
      loteEmbed = row as CorridaRow['lotes']
    }
  }
  return {
    ...(rest as unknown as Omit<CorridaRow, 'lotes'>),
    lotes: loteEmbed,
  }
}

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

const LOTES_SELECT_BASE = `id, numero_lote, viaje_id, producto_viaje_id, tipo_agave, maestro, comunidad,
       litros_disponibles_granel, litros_recibidos, estado, bodega_id, fecha_recepcion,
       productos_viaje ( precio_por_litro, flete_proporcional, litros_acordados )`

const LOTES_SELECT_WITH_FECHA = `id, numero_lote, viaje_id, producto_viaje_id, tipo_agave, maestro, comunidad,
       litros_disponibles_granel, litros_recibidos, estado, bodega_id, fecha_recepcion,
       fecha_embotellado_programada,
       productos_viaje ( precio_por_litro, flete_proporcional, litros_acordados )`

function isSchemaCacheColumnError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return (
    msg.includes('fecha_embotellado_programada') &&
    (msg.includes('schema cache') || msg.includes('PGRST204'))
  )
}

export async function fetchLotes(
  supabase: SupabaseClient,
  clerkId: string,
  opts?: { estado?: DestLoteEstado; limit?: number }
): Promise<LoteRow[]> {
  for (const select of [LOTES_SELECT_WITH_FECHA, LOTES_SELECT_BASE]) {
    let q = supabase
      .from('lotes')
      .select(select)
      .eq('clerk_id', clerkId)
      .order('fecha_recepcion', { ascending: false })
    if (opts?.estado) q = q.eq('estado', opts.estado)
    if (opts?.limit) q = q.limit(opts.limit)
    const { data, error } = await q
    if (!error) {
      return (data ?? []).map(row =>
        normalizeLoteRow(row as unknown as Record<string, unknown>)
      )
    }
    if (select === LOTES_SELECT_WITH_FECHA && isSchemaCacheColumnError(error)) {
      continue
    }
    throw error
  }
  return []
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

/** Promedio $/L en últimas 3 compras recibidas (ponderado por litros recibidos). */
export async function fetchCostoPromedioLitroUltimasCompras(
  supabase: SupabaseClient,
  clerkId: string
): Promise<number | null> {
  const viajes = await fetchViajes(supabase, clerkId, { estado: 'recibido', limit: 3 })
  if (viajes.length === 0) return null

  const productos = await fetchProductosViaje(
    supabase,
    viajes.map(v => v.id)
  )

  let totalLitros = 0
  let totalCosto = 0
  for (const p of productos) {
    const litros = Number(p.litros_recibidos ?? p.litros_acordados)
    if (litros <= 0) continue
    const flete = Number(p.flete_proporcional ?? 0)
    const precio = Number(p.precio_por_litro)
    totalLitros += litros
    totalCosto += litros * precio + flete
  }
  if (totalLitros <= 0) return null
  return totalCosto / totalLitros
}

export async function fetchLoteById(
  supabase: SupabaseClient,
  clerkId: string,
  loteId: string
): Promise<LoteRow | null> {
  const selects = [
    `id, numero_lote, viaje_id, producto_viaje_id, tipo_agave, maestro, comunidad, abv,
       litros_disponibles_granel, litros_recibidos, estado, bodega_id, fecha_recepcion,
       fecha_embotellado_programada,
       productos_viaje ( precio_por_litro, flete_proporcional, litros_acordados, saldo_pendiente, merma_litros )`,
    `id, numero_lote, viaje_id, producto_viaje_id, tipo_agave, maestro, comunidad, abv,
       litros_disponibles_granel, litros_recibidos, estado, bodega_id, fecha_recepcion,
       productos_viaje ( precio_por_litro, flete_proporcional, litros_acordados, saldo_pendiente, merma_litros )`,
  ]
  for (const select of selects) {
    const { data, error } = await supabase
      .from('lotes')
      .select(select)
      .eq('clerk_id', clerkId)
      .eq('id', loteId)
      .maybeSingle()
    if (!error) return data ? normalizeLoteRow(data as unknown as Record<string, unknown>) : null
    if (select === selects[0] && isSchemaCacheColumnError(error)) continue
    throw error
  }
  return null
}

export interface MovimientoInventarioRow {
  id: string
  tipo: string
  timestamp: string
  notas: string | null
  metodo: string
}

export async function fetchMovimientosInventarioByLote(
  supabase: SupabaseClient,
  clerkId: string,
  loteId: string,
  limit = 30
): Promise<MovimientoInventarioRow[]> {
  const { data: cajas, error: cajasErr } = await supabase
    .from('cajas')
    .select('id')
    .eq('clerk_id', clerkId)
    .eq('lote_id', loteId)
  if (cajasErr) {
    if (isDestSchemaMissingError(cajasErr)) return []
    throw cajasErr
  }
  const cajaIds = (cajas ?? []).map(c => c.id as string)
  if (cajaIds.length === 0) return []

  const { data, error } = await supabase
    .from('movimientos_inventario')
    .select('id, tipo, timestamp, notas, metodo')
    .eq('clerk_id', clerkId)
    .in('caja_id', cajaIds)
    .order('timestamp', { ascending: false })
    .limit(limit)
  if (error) {
    if (isDestSchemaMissingError(error)) return []
    throw error
  }
  return (data ?? []) as MovimientoInventarioRow[]
}

export async function fetchCorridasByLote(
  supabase: SupabaseClient,
  clerkId: string,
  loteId: string
): Promise<CorridaRow[]> {
  const { data, error } = await supabase
    .from('corridas_embotellado')
    .select('*')
    .eq('clerk_id', clerkId)
    .eq('lote_id', loteId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(row => normalizeCorridaRow(row as Record<string, unknown>))
}

export async function fetchCorridas(
  supabase: SupabaseClient,
  clerkId: string,
  opts?: { estado?: 'activa' | 'completada'; limit?: number }
): Promise<CorridaRow[]> {
  let q = supabase
    .from('corridas_embotellado')
    .select('*, lotes ( numero_lote, tipo_agave )')
    .eq('clerk_id', clerkId)
    .order('created_at', { ascending: false })
  if (opts?.estado) q = q.eq('estado', opts.estado)
  if (opts?.limit) q = q.limit(opts.limit)
  const { data, error } = await q
  if (error) throw error
  return (data ?? []).map(row => normalizeCorridaRow(row as Record<string, unknown>))
}

export async function fetchLotesCrudo(
  supabase: SupabaseClient,
  clerkId: string
): Promise<LoteRow[]> {
  return fetchLotes(supabase, clerkId, { estado: 'en_bodega_crudo', limit: 100 })
}

export async function fetchBodegas(
  supabase: SupabaseClient,
  clerkId: string
): Promise<BodegaRow[]> {
  const { data, error } = await supabase
    .from('bodegas')
    .select('id, nombre, es_embotellado')
    .eq('clerk_id', clerkId)
    .order('es_embotellado', { ascending: false })
  if (error) throw error
  return (data ?? []) as BodegaRow[]
}

export async function fetchStockBotellas(
  supabase: SupabaseClient,
  clerkId: string
): Promise<StockBotellaRow[]> {
  const { data, error } = await supabase
    .from('stock_botellas_vacias')
    .select('formato, cantidad_disponible')
    .eq('clerk_id', clerkId)
  if (error) throw error
  return (data ?? []) as StockBotellaRow[]
}

export async function fetchStockEtiquetas(
  supabase: SupabaseClient,
  clerkId: string
): Promise<StockEtiquetaRow[]> {
  const { data, error } = await supabase
    .from('stock_etiquetas')
    .select('nombre, tipo, cantidad_disponible')
    .eq('clerk_id', clerkId)
  if (error) throw error
  return (data ?? []) as StockEtiquetaRow[]
}

export function estimateBotellas(litros: number, formato: DestFormatoBotella): number {
  const per = FORMATO_LITROS[formato]
  return per > 0 ? Math.floor(litros / per) : 0
}

export async function iniciarCorridaDestilador(
  supabase: SupabaseClient,
  clerkId: string,
  input: CreateCorridaInput
): Promise<{ corridaId: string }> {
  const lote = await fetchLoteById(supabase, clerkId, input.lote_id)
  if (!lote) throw new Error('Lote no encontrado')
  if (lote.estado !== 'en_bodega_crudo') {
    throw new Error('Solo lotes en bodega crudo pueden embotellarse')
  }
  if (input.litros_asignados > Number(lote.litros_disponibles_granel)) {
    throw new Error('Litros asignados superan el granel disponible')
  }

  const stock = await fetchStockBotellas(supabase, clerkId)
  const row = stock.find(s => s.formato === input.formato_botella)
  const estimadas = estimateBotellas(input.litros_asignados, input.formato_botella)
  if (!row || row.cantidad_disponible < estimadas) {
    throw new Error(
      `Stock insuficiente de botellas ${input.formato_botella} (necesitas ~${estimadas})`
    )
  }

  const nuevoGranel = Number(lote.litros_disponibles_granel) - input.litros_asignados

  const { error: loteErr } = await supabase
    .from('lotes')
    .update({
      estado: 'en_produccion',
      litros_disponibles_granel: nuevoGranel,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.lote_id)
    .eq('clerk_id', clerkId)
  if (loteErr) throw loteErr

  const insert: Record<string, unknown> = {
    clerk_id: clerkId,
    lote_id: input.lote_id,
    bodega_id: input.bodega_id,
    formato_botella: input.formato_botella,
    litros_asignados: input.litros_asignados,
    modo: input.modo,
    estado: 'activa',
  }
  if (input.modo === 'equipo') {
    insert.costo_corrida = input.costo_corrida ?? 0
  } else {
    insert.personas = input.personas ?? 1
    insert.horas_estimadas = input.horas_estimadas ?? 0
    insert.tarifa_hora = input.tarifa_hora ?? 0
  }

  const { data: corrida, error: corridaErr } = await supabase
    .from('corridas_embotellado')
    .insert(insert)
    .select('id')
    .single()

  if (corridaErr) {
    await supabase
      .from('lotes')
      .update({
        estado: 'en_bodega_crudo',
        litros_disponibles_granel: lote.litros_disponibles_granel,
      })
      .eq('id', input.lote_id)
    throw corridaErr
  }

  return { corridaId: corrida.id as string }
}

export async function cerrarCorridaDestilador(
  supabase: SupabaseClient,
  corridaId: string,
  botellasProducidas: number,
  botellasDefectuosas: number
): Promise<{
  corrida_id: string
  lote_id: string
  numero_lote: string
  costo_real_por_botella: number
  cajas_generadas: number
}> {
  const { data, error } = await supabase.rpc('cerrar_corrida_destilador', {
    p_corrida_id: corridaId,
    p_botellas_producidas: botellasProducidas,
    p_botellas_defectuosas: botellasDefectuosas,
  })
  if (error) throw error
  const row = (data as Record<string, unknown>[] | null)?.[0]
  if (!row) throw new Error('Sin respuesta al cerrar corrida')
  return row as {
    corrida_id: string
    lote_id: string
    numero_lote: string
    costo_real_por_botella: number
    cajas_generadas: number
  }
}
