import type { CorridaRow, LoteRow, ProductoViajeRow, ViajeRow } from '@/lib/proof/destilador-types'

export type DistillerAgentContext = {
  perfil: 'destilador'
  query?: string
  selectedLoteId?: string | null
  resumen: {
    lotesTotal: number
    litrosGranelTotal: number
    porAgave: { tipo_agave: string; litros_disponibles: number; lotes: number }[]
    saldoPalenquerosPendiente: number
    corridasActivas: number
    viajesActivos: number
  }
  lotes: {
    id: string
    numero_lote: string
    tipo_agave: string
    litros_disponibles_granel: number
    litros_recibidos: number
    estado: string
    fecha_embotellado_programada: string | null
  }[]
  viajesActivos: {
    id: string
    estado: string
    palenquero: string
    region: string
    productos: {
      tipo_agave: string
      litros_acordados: number
      saldo_pendiente: number
    }[]
  }[]
  corridasActivas: {
    id: string
    lote_id: string
    numero_lote: string | null
    tipo_agave: string | null
    litros_asignados: number
    formato_botella: string
    estado: string
    fecha_embotellado: string | null
  }[]
  lotesMeta: {
    id: string
    numero_lote: string
    tipo_agave: string
    precio_venta: number | null
    nota: string | null
    fecha_embotellado_programada: string | null
  }[]
}

function normAgave(tipo: string): string {
  return tipo.trim().toLowerCase()
}

export function buildDistillerAgentContext(
  lotes: LoteRow[],
  viajes: ViajeRow[],
  productosViaje: ProductoViajeRow[],
  corridas: CorridaRow[],
  opts?: { selectedId?: string | null; query?: string | null }
): DistillerAgentContext {
  const activos = viajes.filter(v => v.estado !== 'recibido')
  const productosByViaje = new Map<string, ProductoViajeRow[]>()
  for (const p of productosViaje) {
    const list = productosByViaje.get(p.viaje_id) ?? []
    list.push(p)
    productosByViaje.set(p.viaje_id, list)
  }

  const porAgaveMap = new Map<string, { litros: number; lotes: number; label: string }>()
  let litrosGranelTotal = 0
  for (const l of lotes) {
    const granel = Number(l.litros_disponibles_granel)
    litrosGranelTotal += granel
    const key = normAgave(l.tipo_agave)
    const cur = porAgaveMap.get(key) ?? { litros: 0, lotes: 0, label: l.tipo_agave }
    cur.litros += granel
    cur.lotes += 1
    porAgaveMap.set(key, cur)
  }

  const saldoPalenquerosPendiente = productosViaje
    .filter(p => activos.some(v => v.id === p.viaje_id))
    .reduce((s, p) => s + Number(p.saldo_pendiente ?? 0), 0)

  return {
    perfil: 'destilador',
    query: opts?.query ?? undefined,
    selectedLoteId: opts?.selectedId ?? null,
    resumen: {
      lotesTotal: lotes.length,
      litrosGranelTotal,
      porAgave: [...porAgaveMap.values()]
        .map(v => ({
          tipo_agave: v.label,
          litros_disponibles: Math.round(v.litros * 10) / 10,
          lotes: v.lotes,
        }))
        .sort((a, b) => b.litros_disponibles - a.litros_disponibles),
      saldoPalenquerosPendiente,
      corridasActivas: corridas.length,
      viajesActivos: activos.length,
    },
    lotes: lotes.map(l => ({
      id: l.id,
      numero_lote: l.numero_lote,
      tipo_agave: l.tipo_agave,
      litros_disponibles_granel: Number(l.litros_disponibles_granel),
      litros_recibidos: Number(l.litros_recibidos),
      estado: l.estado,
      fecha_embotellado_programada:
        (l as { fecha_embotellado_programada?: string | null }).fecha_embotellado_programada ??
        null,
    })),
    viajesActivos: activos.map(v => ({
      id: v.id,
      estado: v.estado,
      palenquero: v.palenquero_nombre,
      region: v.region,
      productos: (productosByViaje.get(v.id) ?? []).map(p => ({
        tipo_agave: p.tipo_agave,
        litros_acordados: Number(p.litros_acordados),
        saldo_pendiente: Number(p.saldo_pendiente ?? 0),
      })),
    })),
    corridasActivas: corridas.map(c => ({
      id: c.id,
      lote_id: c.lote_id,
      numero_lote: c.lotes?.numero_lote ?? null,
      tipo_agave: c.lotes?.tipo_agave ?? null,
      litros_asignados: Number(c.litros_asignados),
      formato_botella: c.formato_botella,
      estado: c.estado,
      fecha_embotellado:
        (c as { fecha_embotellado?: string | null }).fecha_embotellado ?? null,
    })),
    lotesMeta: lotes.map(l => ({
      id: l.id,
      numero_lote: l.numero_lote,
      tipo_agave: l.tipo_agave,
      precio_venta:
        (l as { precio_venta?: number | null }).precio_venta != null
          ? Number((l as { precio_venta?: number }).precio_venta)
          : null,
      nota: (l as { nota?: string | null }).nota ?? null,
      fecha_embotellado_programada:
        (l as { fecha_embotellado_programada?: string | null }).fecha_embotellado_programada ??
        null,
    })),
  }
}
