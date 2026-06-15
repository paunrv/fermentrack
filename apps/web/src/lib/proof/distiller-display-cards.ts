import {
  cardActionsForType,
  type CardItem,
  type DisplayCards,
} from '@/lib/proof/agent-response-types'
import type { DistillerAgentContext } from '@/lib/proof/distiller-agent-context'

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
}

export type DisplayCardsBuildResult = {
  displayCards: DisplayCards | null
  emptyResults: boolean
}

function isDataQuery(q: string): boolean {
  return (
    q.includes('bodega') ||
    q.includes('lote') ||
    q.includes('viaje') ||
    q.includes('corrida') ||
    q.includes('stock') ||
    q.includes('granel') ||
    q.includes('embotell') ||
    q.includes('palenquero') ||
    q.includes('terminado') ||
    q.includes('muéstrame') ||
    q.includes('muestrame') ||
    q.includes('mostrar')
  )
}

export function buildDistillerDisplayCards(
  query: string,
  datos: Record<string, unknown>
): DisplayCardsBuildResult {
  const ctx = datos as unknown as DistillerAgentContext
  if (ctx.perfil !== 'destilador' || !ctx.resumen) {
    return { displayCards: null, emptyResults: false }
  }

  const q = norm(query)
  if (!q || !isDataQuery(q)) {
    return { displayCards: null, emptyResults: false }
  }

  if (
    q.includes('viaje') ||
    q.includes('palenquero') ||
    q.includes('transito') ||
    q.includes('recibir')
  ) {
    const viajes = ctx.viajesActivos ?? []
    if (viajes.length === 0) {
      return { displayCards: null, emptyResults: true }
    }
    const type = 'orders' as const
    const items: CardItem[] = viajes.slice(0, 12).map(v => {
      const litros = v.productos.reduce((s, p) => s + Number(p.litros_acordados), 0)
      const agaves = v.productos.map(p => p.tipo_agave).join(', ') || 'Viaje'
      return {
        id: v.id,
        name: agaves,
        subtitle: v.palenquero,
        status: v.estado === 'en_transito' ? ('warning' as const) : ('ok' as const),
        primaryValue: { label: 'stock', value: `${litros.toLocaleString('es-MX')} L` },
        secondaryValues: [{ label: 'proveedor', value: v.region || v.palenquero }],
        actions: cardActionsForType(type, agaves),
      }
    })
    return {
      displayCards: { type, title: 'Viajes pendientes', items },
      emptyResults: false,
    }
  }

  if (q.includes('corrida') || q.includes('embotell') || q.includes('terminado')) {
    const corridas = ctx.corridasActivas ?? []
    if (corridas.length === 0) {
      return { displayCards: null, emptyResults: true }
    }
    const type = 'inventory' as const
    const items: CardItem[] = corridas.slice(0, 12).map(c => ({
      id: c.id,
      name: c.numero_lote ?? c.tipo_agave ?? 'Corrida',
      subtitle: c.formato_botella,
      status: 'ok' as const,
      primaryValue: {
        label: 'stock',
        value: `${c.litros_asignados.toLocaleString('es-MX')} L`,
      },
      actions: cardActionsForType(type, c.numero_lote ?? 'corrida'),
    }))
    return {
      displayCards: { type, title: 'Corridas activas', items },
      emptyResults: false,
    }
  }

  if (
    q.includes('bodega') ||
    q.includes('lote') ||
    q.includes('stock') ||
    q.includes('granel') ||
    q.includes('litro')
  ) {
    const lotes = ctx.lotes ?? []
    if (lotes.length === 0) {
      return { displayCards: null, emptyResults: true }
    }
    const type = 'inventory' as const
    const items: CardItem[] = lotes.slice(0, 12).map(l => ({
      id: l.id,
      name: l.numero_lote,
      subtitle: l.tipo_agave,
      status:
        Number(l.litros_disponibles_granel) > 0
          ? ('ok' as const)
          : ('warning' as const),
      primaryValue: {
        label: 'stock',
        value: `${l.litros_disponibles_granel.toLocaleString('es-MX')} L`,
      },
      actions: cardActionsForType(type, l.numero_lote),
    }))
    return {
      displayCards: { type, title: 'Bodega', items },
      emptyResults: false,
    }
  }

  return { displayCards: null, emptyResults: false }
}
