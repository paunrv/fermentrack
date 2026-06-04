import type { DistillerAgentContext } from '@/lib/proof/distiller-agent-context'
import { looksLikeLoteMutation } from '@/lib/proof/distiller-agent-actions'

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
}

const AGAVE_KEYS = [
  { key: 'espadin', label: 'Espadín' },
  { key: 'tobala', label: 'Tobalá' },
  { key: 'tepeztate', label: 'Tepeztate' },
  { key: 'madrecuixe', label: 'Madrecuixe' },
  { key: 'arroqueno', label: 'Arroqueño' },
  { key: 'mexicano', label: 'Mexicano' },
] as const

function matchAgaveKeyFromQuery(q: string): string | null {
  for (const { key } of AGAVE_KEYS) {
    if (q.includes(key)) return key
  }
  return null
}

function matchAgaveFromQueryOnly(q: string): string | null {
  const key = matchAgaveKeyFromQuery(q)
  if (!key) return null
  return AGAVE_KEYS.find(a => a.key === key)?.label ?? null
}

function resumenRowForAgave(
  porAgave: DistillerAgentContext['resumen']['porAgave'],
  agaveLabel: string
): DistillerAgentContext['resumen']['porAgave'][number] | null {
  const key = norm(agaveLabel)
  return (
    porAgave.find(r => {
      const tipo = norm(r.tipo_agave)
      return tipo === key || tipo.includes(key) || key.includes(tipo)
    }) ?? null
  )
}

function respuestaPorAgave(
  ctx: DistillerAgentContext,
  agaveLabel: string
): { mensaje: string; accionLabel: string; accionHref: string } {
  const enBodega = resumenRowForAgave(ctx.resumen.porAgave, agaveLabel)
  if (enBodega) {
    return {
      mensaje: `Tienes **${enBodega.litros_disponibles.toLocaleString('es-MX')} L** de ${enBodega.tipo_agave} en granel (${enBodega.lotes} lote${enBodega.lotes === 1 ? '' : 's'}).`,
      accionLabel: 'Ver bodega',
      accionHref: '/dashboard',
    }
  }
  const pendiente = pendingLitrosPorAgave(ctx, agaveLabel)
  if (pendiente > 0) {
    return {
      mensaje: `Aún no hay ${agaveLabel} en bodega, pero tienes **${pendiente.toLocaleString('es-MX')} L** en un viaje por recibir. Abre la tarjeta punteada o escribe **confirmar llegada ${agaveLabel}**.`,
      accionLabel: 'Ver bodega',
      accionHref: '/dashboard',
    }
  }
  return {
    mensaje: `No tienes ${agaveLabel} en granel en bodega por ahora.`,
    accionLabel: 'Ver bodega',
    accionHref: '/dashboard',
  }
}

function pendingLitrosPorAgave(ctx: DistillerAgentContext, agaveLabel: string): number {
  const key = norm(agaveLabel)
  let total = 0
  for (const v of ctx.viajesActivos ?? []) {
    for (const p of v.productos) {
      if (norm(p.tipo_agave) === key || norm(p.tipo_agave).includes(key)) {
        total += Number(p.litros_acordados)
      }
    }
  }
  return total
}

function matchAgave(
  query: string,
  porAgave: DistillerAgentContext['resumen']['porAgave']
): DistillerAgentContext['resumen']['porAgave'][number] | null {
  const q = norm(query)
  const askedKey = matchAgaveKeyFromQuery(q)
  if (askedKey) {
    return (
      porAgave.find(r => norm(r.tipo_agave).includes(askedKey)) ?? null
    )
  }
  for (const row of porAgave) {
    const tipo = norm(row.tipo_agave)
    if (tipo.length > 2 && q.includes(tipo)) return row
  }
  return null
}

/** Respuesta determinística desde JSON de bodega (sin LLM). */
export function tryDistillerQuickAnswer(
  query: string,
  datos: Record<string, unknown>
): { mensaje: string; accionLabel: string; accionHref: string } | null {
  const ctx = datos as unknown as DistillerAgentContext
  if (ctx.perfil !== 'destilador' || !ctx.resumen) return null

  const q = norm(query)
  const { resumen, lotes } = ctx

  const looksLikeCompra =
    q.includes('compre') ||
    q.includes('compro') ||
    q.includes('compra') ||
    q.includes('agrega') ||
    q.includes('agregar') ||
    q.includes('vaije') ||
    (q.includes('nuevo') &&
      (q.includes('viaje') || q.includes('vaije') || q.includes('lote'))) ||
    (q.includes('mezcal') &&
      (q.includes('litros') || q.includes('compro') || q.includes('compre')))

  const agaveEnPregunta = matchAgaveFromQueryOnly(q)
  if (
    agaveEnPregunta &&
    !looksLikeCompra &&
    !looksLikeLoteMutation(q) &&
    !q.includes('confirmar') &&
    !(q.includes('nuevo') && (q.includes('viaje') || q.includes('vaije')))
  ) {
    return respuestaPorAgave(ctx, agaveEnPregunta)
  }

  if (looksLikeLoteMutation(q)) {
    const agave = matchAgaveFromQueryOnly(q)
    if (agave) {
      const key = norm(agave)
      const tieneLote = lotes.some(l => {
        const t = norm(l.tipo_agave)
        return t.includes(key) || key.includes(t)
      })
      if (!tieneLote) {
        const pendiente = pendingLitrosPorAgave(ctx, agave)
        if (pendiente > 0) {
          return {
            mensaje: `Primero confirma la llegada de ${agave} (ej. **confirmar llegada ${agave}**); después podrás programar el embotellado.`,
            accionLabel: 'Ver bodega',
            accionHref: '/dashboard',
          }
        }
        return {
          mensaje: `No hay un lote de ${agave} en bodega para programar embotellado.`,
          accionLabel: 'Ver bodega',
          accionHref: '/dashboard',
        }
      }
    }
  }

  if (
    !looksLikeCompra &&
    (q.includes('litro') ||
    q.includes('stock') ||
    q.includes('granel') ||
    q.includes('cuanto') ||
    q.includes('cuanta') ||
    q.includes('tengo'))
  ) {
    const agave = matchAgave(query, resumen.porAgave)
    if (agave) {
      return respuestaPorAgave(ctx, agave.tipo_agave)
    }

    if (resumen.lotesTotal > 0) {
      return {
        mensaje: `En bodega hay **${resumen.litrosGranelTotal.toLocaleString('es-MX')} L** en granel en ${resumen.lotesTotal} lote${resumen.lotesTotal === 1 ? '' : 's'}.`,
        accionLabel: 'Ver bodega',
        accionHref: '/dashboard',
      }
    }
  }

  if (q.includes('lote') && (q.includes('listo') || q.includes('embotell'))) {
    const listos = lotes.filter(
      l =>
        norm(l.estado).includes('listo') ||
        Number(l.litros_disponibles_granel) > 0
    )
    if (listos.length === 0) {
      return {
        mensaje: 'No hay lotes marcados listos para embotellar en este momento.',
        accionLabel: 'Ver bodega',
        accionHref: '/dashboard',
      }
    }
    const names = listos
      .slice(0, 3)
      .map(l => l.numero_lote)
      .join(', ')
    return {
      mensaje: `${listos.length} lote${listos.length === 1 ? '' : 's'} con granel disponible: ${names}${listos.length > 3 ? '…' : ''}.`,
      accionLabel: 'Ver bodega',
      accionHref: '/dashboard',
    }
  }

  if (
    !looksLikeCompra &&
    (q.includes('nuevo viaje') ||
      q.includes('nuevo vaije') ||
      (q.includes('registrar') && q.includes('viaje')) ||
      q.includes('compras/nuevo'))
  ) {
    return {
      mensaje: 'Abre el formulario para registrar palenquero, región y agaves del viaje.',
      accionLabel: 'Nuevo viaje',
      accionHref: '/dashboard/destilador/compras/nuevo',
    }
  }

  if (q.includes('palenquero') || q.includes('debo') || q.includes('deuda')) {
    const monto = resumen.saldoPalenquerosPendiente
    return {
      mensaje:
        monto > 0
          ? `Deuda pendiente con palenqueros: **$${monto.toLocaleString('es-MX')}** MXN.`
          : 'No tienes saldo pendiente registrado con palenqueros en viajes activos.',
      accionLabel: 'Ver viajes',
      accionHref: '/dashboard/destilador/compras',
    }
  }

  if (q.includes('terminado') || q.includes('embotellado')) {
    return {
      mensaje: `**${resumen.litrosGranelTotal.toLocaleString('es-MX')} L** en granel · ${resumen.corridasActivas} corrida${resumen.corridasActivas === 1 ? '' : 's'} activa${resumen.corridasActivas === 1 ? '' : 's'}.`,
      accionLabel: 'Producción',
      accionHref: '/dashboard/destilador/produccion',
    }
  }

  const agavePendiente = matchAgaveFromQueryOnly(q)
  const viajePendiente =
    agavePendiente &&
    (ctx.viajesActivos ?? []).find(v =>
      v.productos.some(p => norm(p.tipo_agave).includes(norm(agavePendiente)))
    )
  if (
    viajePendiente &&
    (q.includes('estado') ||
      q.includes('bodega') ||
      q.includes('llego') ||
      q.includes('recib') ||
      q.includes('transito') ||
      q.includes('en_bodega'))
  ) {
    return {
      mensaje: `Para pasar ${agavePendiente} a bodega, escribe por ejemplo: **confirmar llegada ${agavePendiente}** (o abre la tarjeta punteada en el canvas).`,
      accionLabel: 'Ver bodega',
      accionHref: '/dashboard',
    }
  }

  return null
}
