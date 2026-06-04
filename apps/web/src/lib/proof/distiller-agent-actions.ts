import type { SupabaseClient } from '@supabase/supabase-js'
import type { ConfirmarLlegadaLinea } from '@/lib/proof/destilador-types'
import {
  confirmarLlegadaDestilador,
  createViajeDestilador,
  fetchProductosViaje,
} from '@/lib/supabase/destilador'

export type DistillerAgentActionType =
  | 'update_fecha_embotellado'
  | 'update_precio_venta'
  | 'update_nota_lote'
  | 'create_compra_recibida'
  | 'confirmar_llegada_viaje'

export type DistillerAgentAction =
  | {
      type: 'update_fecha_embotellado'
      lote_id: string
      fecha: string
    }
  | { type: 'update_precio_venta'; lote_id: string; precio: number }
  | { type: 'update_nota_lote'; lote_id: string; nota: string }
  | {
      type: 'create_compra_recibida'
      tipo_agave: string
      region: string
      litros: number
      precio_por_litro: number
    }
  | {
      type: 'confirmar_llegada_viaje'
      viaje_id: string
      lineas: ConfirmarLlegadaLinea[]
    }

export type ViajeRefForAgent = { id: string; estado: string }
export type ProductoViajeRefForAgent = {
  id: string
  viaje_id: string
  tipo_agave: string
  litros_acordados: number
}

const AGAVE_CANONICAL: { key: string; label: string }[] = [
  { key: 'espadin', label: 'Espadín' },
  { key: 'tobala', label: 'Tobalá' },
  { key: 'mexicano', label: 'Mexicano' },
  { key: 'tepeztate', label: 'Tepeztate' },
  { key: 'madrecuixe', label: 'Madrecuixe' },
  { key: 'arroqueno', label: 'Arroqueño' },
]

const MESES: Record<string, number> = {
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  setiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
}

function normQ(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
}

export function looksLikeLoteMutation(q: string): boolean {
  const n = normQ(q)
  if (n.includes('precio') && (n.includes('venta') || n.includes('vender'))) return true
  if (n.includes('nota') || n.includes('anotar') || n.includes('comentario')) return true
  if (n.includes('embotell') || n.includes('embotel')) {
    return (
      Boolean(parseSpanishDateFromQuery(n)) ||
      n.includes('embotellar para') ||
      n.includes('programa') ||
      n.includes('agenda') ||
      n.includes('dia') ||
      (n.includes('fecha') && (n.includes('embotell') || n.includes('embotel')))
    )
  }
  return false
}

/** Detecta intención de acción en español (sin LLM). */
export function parseDistillerActionIntent(
  query: string,
  lotes: { id: string; numero_lote: string; tipo_agave: string }[],
  viajes: ViajeRefForAgent[] = [],
  productosViaje: ProductoViajeRefForAgent[] = [],
  opts?: { selectedLoteId?: string | null }
): DistillerAgentAction | null {
  const q = normQ(query)

  const compra = parseCreateCompraIntent(q)
  if (compra) return compra

  let type: DistillerAgentActionType | null = null
  const fechaEmbotellado = parseSpanishDateFromQuery(q)
  if (
    (q.includes('embotell') || q.includes('embotel')) &&
    (fechaEmbotellado ||
      q.includes('embotellar para') ||
      q.includes('programa') ||
      q.includes('agenda') ||
      (q.includes('dia') && (q.includes('embotell') || q.includes('embotel'))) ||
      (q.includes('fecha') && (q.includes('embotell') || q.includes('embotel'))))
  ) {
    type = 'update_fecha_embotellado'
  } else if (q.includes('precio') && (q.includes('venta') || q.includes('vender'))) {
    type = 'update_precio_venta'
  } else if (q.includes('nota') || q.includes('anotar') || q.includes('comentario')) {
    type = 'update_nota_lote'
  }

  if (type) {
    const lote = resolveLoteFromQuery(q, lotes, opts?.selectedLoteId)
    if (!lote) return null

    if (type === 'update_fecha_embotellado') {
      if (!fechaEmbotellado) return null
      return { type, lote_id: lote.id, fecha: fechaEmbotellado }
    }

    if (type === 'update_precio_venta') {
      const precio = parsePrecioFromQuery(q)
      if (precio == null) return null
      return { type, lote_id: lote.id, precio }
    }

    const notaMatch = query.match(/(?:nota|anotar|comentario)[:\s]+(.+)/i)
    const nota = notaMatch?.[1]?.trim() || query.trim()
    if (!nota) return null
    return { type, lote_id: lote.id, nota }
  }

  const llegada = parseConfirmarLlegadaIntent(q, viajes, productosViaje)
  if (llegada) return llegada

  return null
}

function parseConfirmarLlegadaIntent(
  q: string,
  viajes: ViajeRefForAgent[],
  productos: ProductoViajeRefForAgent[]
): DistillerAgentAction | null {
  const hasAgave = AGAVE_CANONICAL.some(a => q.includes(a.key))
  const wantsConfirm =
    (q.includes('confirmar') &&
      (q.includes('llegada') ||
        q.includes('llego') ||
        q.includes('recib') ||
        hasAgave)) ||
    (q.includes('marcar') &&
      (q.includes('bodega') || q.includes('recibido') || q.includes('llego'))) ||
    q.includes('en_bodega_crudo') ||
    q.includes('bodega crudo') ||
    (q.includes('actualiza') && q.includes('estado')) ||
    (q.includes('cambiar') && q.includes('estado')) ||
    q.includes('ya lleg') ||
    q.includes('ya recib') ||
    ((q.includes('llego') || q.includes('recibi') || q.includes('recibio')) &&
      (hasAgave || q.includes('viaje')))

  if (!wantsConfirm) return null

  const resolved = resolveViajeForConfirm(q, viajes, productos)
  if (!resolved) return null

  return {
    type: 'confirmar_llegada_viaje',
    viaje_id: resolved.viajeId,
    lineas: resolved.lineas,
  }
}

function resolveViajeForConfirm(
  q: string,
  viajes: ViajeRefForAgent[],
  productos: ProductoViajeRefForAgent[]
): { viajeId: string; lineas: ConfirmarLlegadaLinea[] } | null {
  const pendientes = viajes.filter(
    v => v.estado === 'confirmado' || v.estado === 'en_transito'
  )
  if (pendientes.length === 0) return null

  const uuidFrag = q.match(/\b([a-f0-9]{8,32})\b/i)
  if (uuidFrag?.[1]) {
    const frag = uuidFrag[1].toLowerCase()
    const byId = pendientes.find(
      v => v.id.toLowerCase().startsWith(frag) || v.id.toLowerCase().includes(frag)
    )
    if (byId) return lineasForViaje(byId.id, productos)
  }

  for (const { key } of AGAVE_CANONICAL) {
    if (!q.includes(key)) continue
    const matches = pendientes.filter(v =>
      productos.some(
        p => p.viaje_id === v.id && normQ(p.tipo_agave).includes(key)
      )
    )
    if (matches.length === 1) return lineasForViaje(matches[0]!.id, productos)
    if (matches.length > 1) {
      const pick = matches.find(v => v.estado === 'en_transito') ?? matches[0]!
      return lineasForViaje(pick.id, productos)
    }
  }

  if (pendientes.length === 1) return lineasForViaje(pendientes[0]!.id, productos)
  return null
}

function lineasForViaje(
  viajeId: string,
  productos: ProductoViajeRefForAgent[]
): { viajeId: string; lineas: ConfirmarLlegadaLinea[] } | null {
  const prods = productos.filter(p => p.viaje_id === viajeId)
  if (prods.length === 0) return null
  return {
    viajeId,
    lineas: prods.map(p => ({
      producto_viaje_id: p.id,
      litros_salida: Number(p.litros_acordados),
      litros_recibidos: Number(p.litros_acordados),
    })),
  }
}

function matchAgaveKeyFromQuery(q: string): string | null {
  for (const { key } of AGAVE_CANONICAL) {
    if (q.includes(key)) return key
  }
  return null
}

function resolveLoteFromQuery(
  q: string,
  lotes: { id: string; numero_lote: string; tipo_agave: string }[],
  selectedLoteId?: string | null
): { id: string } | null {
  if (selectedLoteId) {
    const selected = lotes.find(l => l.id === selectedLoteId)
    if (selected) {
      const askedKey = matchAgaveKeyFromQuery(q)
      if (!askedKey || normQ(selected.tipo_agave).includes(askedKey)) {
        return selected
      }
    }
  }

  const loteNum = q.match(/lote[-\s]?(\d+)/i)
  const loteDigits = loteNum?.[1]
  if (loteDigits) {
    const num = `LOTE-${loteDigits.padStart(3, '0')}`
    const byNum = lotes.find(
      l =>
        l.numero_lote.toUpperCase() === num ||
        l.numero_lote.toUpperCase().includes(loteDigits)
    )
    if (byNum) return byNum
  }

  for (const { key } of AGAVE_CANONICAL) {
    if (!q.includes(key)) continue
    const hit = lotes.find(l =>
      normQ(l.tipo_agave).includes(key)
    )
    if (hit) return hit
    return null
  }

  for (const l of lotes) {
    const agave = normQ(l.tipo_agave)
    if (agave.length > 2 && q.includes(agave)) return l
  }

  return null
}

function parseSpanishDateFromQuery(q: string): string | null {
  const iso = q.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`

  const dmy = q.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/)
  if (dmy?.[1] && dmy[2]) {
    const yPart = dmy[3]
    const year = yPart
      ? yPart.length === 2
        ? `20${yPart}`
        : yPart
      : String(new Date().getFullYear())
    const day = dmy[1].padStart(2, '0')
    const month = dmy[2].padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const verbalMatches = [...q.matchAll(/(\d{1,2})\s+de\s+([a-z]+)(?:\s+de\s+(\d{4}))?/g)]
  const verbal = verbalMatches.at(-1)
  if (verbal?.[1] && verbal[2]) {
    const day = verbal[1].padStart(2, '0')
    const monthName = verbal[2]
    const month = MESES[monthName]
    if (!month) return null
    const year = verbal[3] ?? String(new Date().getFullYear())
    return `${year}-${String(month).padStart(2, '0')}-${day}`
  }

  const monthFirst = q.match(
    /(?:para\s+)?(?:el\s+)?([a-z]+)\s+(\d{1,2})(?:\s+de\s+(\d{4}))?/
  )
  if (monthFirst?.[1] && monthFirst[2]) {
    const month = MESES[monthFirst[1]]
    if (month) {
      const day = monthFirst[2].padStart(2, '0')
      const year = monthFirst[3] ?? String(new Date().getFullYear())
      return `${year}-${String(month).padStart(2, '0')}-${day}`
    }
  }

  return null
}

function parsePrecioFromQuery(q: string): number | null {
  const m = q.match(/\$?\s*([\d,]+(?:\.\d{1,2})?)/)
  if (!m?.[1]) return null
  const n = Number(m[1].replace(/,/g, ''))
  return Number.isFinite(n) && n > 0 ? n : null
}

function parsePrecioPorLitroFromQuery(q: string): number | null {
  const porLitro = q.match(/\$?\s*([\d,]+(?:\.\d{1,2})?)\s*(?:el\s+)?litro/)
  if (porLitro?.[1]) {
    const n = Number(porLitro[1].replace(/,/g, ''))
    if (Number.isFinite(n) && n > 0) return n
  }
  const despuesLitro = q.match(
    /(?:el\s+)?litro\s+(?:me\s+)?(?:costo|costo|cuesta)\s+\$?\s*([\d,]+(?:\.\d{1,2})?)/
  )
  if (despuesLitro?.[1]) {
    const n = Number(despuesLitro[1].replace(/,/g, ''))
    if (Number.isFinite(n) && n > 0) return n
  }
  return parsePrecioFromQuery(q)
}

function parseLitrosFromQuery(q: string): number | null {
  const m = q.match(/(\d[\d,]*)\s*(?:litros|l\b)/)
  if (!m?.[1]) return null
  const n = Number(m[1].replace(/,/g, ''))
  return Number.isFinite(n) && n > 0 ? n : null
}

function parseAgaveFromQuery(q: string): string | null {
  for (const { key, label } of AGAVE_CANONICAL) {
    if (q.includes(key)) return label
  }
  const mezcal = q.match(/mezcal\s+([a-z]{4,})/)
  if (mezcal?.[1]) {
    const raw = mezcal[1]
    const hit = AGAVE_CANONICAL.find(a => raw.includes(a.key) || a.key.includes(raw))
    if (hit) return hit.label
    return raw.charAt(0).toUpperCase() + raw.slice(1)
  }
  return null
}

function parseRegionFromQuery(q: string): string | null {
  const deLa = q.match(/(?:de la|del)\s+region\s+([^,]+?)(?:,|\s+se\s+|\s+compro|\s+compre|\s+el\s+litro|$)/)
  if (deLa?.[1]) return titleCase(deLa[1].trim())
  const region = q.match(/(?:region|zona)\s+([^,]+?)(?:,|\s+se\s+|\s+compro|\s+compre|\s+el\s+litro|$)/)
  if (region?.[1]) return titleCase(region[1].trim())
  return null
}

function titleCase(s: string): string {
  return s
    .split(/\s+/)
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function parseCreateCompraIntent(q: string): DistillerAgentAction | null {
  const mentionsViaje =
    q.includes('viaje') || q.includes('vaije') || q.includes('lote')
  const wantsCreate =
    (q.includes('agrega') ||
      q.includes('agregar') ||
      q.includes('nuevo') ||
      q.includes('vaije') ||
      q.includes('registra') ||
      q.includes('registrar') ||
      q.includes('compra') ||
      q.includes('compro') ||
      q.includes('compre')) &&
    (mentionsViaje || q.includes('mezcal') || q.includes('agave'))

  if (!wantsCreate) return null

  const litros = parseLitrosFromQuery(q)
  const precio_por_litro = parsePrecioPorLitroFromQuery(q)
  const tipo_agave = parseAgaveFromQuery(q)
  const region = parseRegionFromQuery(q)

  if (!litros || !precio_por_litro || !tipo_agave || !region) return null

  return { type: 'create_compra_recibida', tipo_agave, region, litros, precio_por_litro }
}

export async function executeDistillerAgentAction(
  sb: SupabaseClient,
  clerkId: string,
  action: DistillerAgentAction
): Promise<{ ok: true; message: string; loteId: string }> {
  if (action.type === 'confirmar_llegada_viaje') {
    const { data: viaje, error: viajeErr } = await sb
      .from('viajes')
      .select('id, estado, region, palenquero_nombre')
      .eq('id', action.viaje_id)
      .eq('clerk_id', clerkId)
      .maybeSingle()
    if (viajeErr) throw viajeErr
    if (!viaje) throw new Error('Viaje no encontrado o no pertenece a tu cuenta')
    if (viaje.estado === 'recibido') {
      throw new Error('Este viaje ya fue recibido en bodega')
    }
    if (!['confirmado', 'en_transito'].includes(viaje.estado)) {
      throw new Error(`No se puede confirmar llegada con estado "${viaje.estado}"`)
    }

    const results = await confirmarLlegadaDestilador(sb, action.viaje_id, action.lineas)
    const created = results[0]
    if (!created?.lote_id) throw new Error('No se generó el lote en bodega')

    const litros = action.lineas.reduce((s, l) => s + l.litros_recibidos, 0)
    return {
      ok: true,
      loteId: created.lote_id,
      message: `${created.tipo_agave ?? 'Mezcal'} ${created.numero_lote} en bodega: ${litros.toLocaleString('es-MX')} L recibidos ✓`,
    }
  }

  if (action.type === 'create_compra_recibida') {
    const today = new Date().toISOString().slice(0, 10)
    const { viajeId } = await createViajeDestilador(sb, clerkId, {
      fecha: today,
      region: action.region,
      comunidad: action.region,
      palenquero_nombre: 'Por registrar',
      palenquero_contacto: '',
      costo_flete: 0,
      estado: 'confirmado',
      productos: [
        {
          tipo_agave: action.tipo_agave,
          litros_acordados: action.litros,
          precio_por_litro: action.precio_por_litro,
          anticipo_pagado: 0,
        },
      ],
    })

    const productos = await fetchProductosViaje(sb, [viajeId])
    const pv = productos[0]
    if (!pv) throw new Error('No se creó el producto del viaje')

    const results = await confirmarLlegadaDestilador(sb, viajeId, [
      {
        producto_viaje_id: pv.id,
        litros_salida: action.litros,
        litros_recibidos: action.litros,
      },
    ])

    const created = results[0]
    if (!created) throw new Error('No se generó el lote en bodega')

    return {
      ok: true,
      loteId: created.lote_id,
      message: `${action.tipo_agave} ${created.numero_lote} registrado: ${action.litros.toLocaleString('es-MX')} L · ${action.region} · $${action.precio_por_litro}/L ✓`,
    }
  }

  const { data: lote, error: loteErr } = await sb
    .from('lotes')
    .select('id, numero_lote, tipo_agave')
    .eq('clerk_id', clerkId)
    .eq('id', action.lote_id)
    .maybeSingle()
  if (loteErr) throw loteErr
  if (!lote) throw new Error('Lote no encontrado o no pertenece a tu cuenta')

  switch (action.type) {
    case 'update_fecha_embotellado': {
      if (!action.fecha) throw new Error('Fecha requerida')
      const { error: upErr } = await sb
        .from('lotes')
        .update({
          fecha_embotellado_programada: action.fecha,
          updated_at: new Date().toISOString(),
        })
        .eq('id', action.lote_id)
        .eq('clerk_id', clerkId)
      if (upErr) {
        const msg = upErr.message ?? ''
        if (
          msg.includes('fecha_embotellado_programada') &&
          (msg.includes('schema cache') || msg.includes('PGRST204'))
        ) {
          throw new Error(
            'Falta la columna fecha_embotellado_programada en Supabase. Aplica la migración 20250603000000_destilador_agent_lote_fields.sql'
          )
        }
        throw upErr
      }
      const fechaLabel = new Date(action.fecha + 'T12:00:00').toLocaleDateString('es-MX', {
        day: 'numeric',
        month: 'long',
      })
      return {
        ok: true,
        loteId: action.lote_id,
        message: `${lote.tipo_agave} programado para embotellar el ${fechaLabel} ✓`,
      }
    }
    case 'update_precio_venta': {
      if (action.precio == null) throw new Error('Precio requerido')
      const { error: upErr } = await sb
        .from('lotes')
        .update({
          precio_venta: action.precio,
          updated_at: new Date().toISOString(),
        })
        .eq('id', action.lote_id)
        .eq('clerk_id', clerkId)
      if (upErr) throw upErr
      return {
        ok: true,
        loteId: action.lote_id,
        message: `Precio de venta de ${lote.numero_lote} actualizado a $${action.precio.toLocaleString('es-MX')} ✓`,
      }
    }
    case 'update_nota_lote': {
      if (!action.nota?.trim()) throw new Error('Nota requerida')
      const { error: upErr } = await sb
        .from('lotes')
        .update({
          nota: action.nota.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', action.lote_id)
        .eq('clerk_id', clerkId)
      if (upErr) throw upErr
      return {
        ok: true,
        loteId: action.lote_id,
        message: `Nota de ${lote.numero_lote} guardada ✓`,
      }
    }
  }
}
