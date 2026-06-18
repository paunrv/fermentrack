import type { AgentQuickAnswer } from '@/lib/proof/agent-intent-parser'
import type { WinemakerAgentContext } from '@/lib/proof/winemaker-agent-context'
import { fmtMoney } from '@/lib/proof/format'
import { buildTicketUploadMessage } from '@/lib/proof/winemaker-ticket-vision'
import type { WmTicketVisionStatus } from '@/lib/proof/winemaker-ticket-vision'

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
}

function uploadQuickAnswer(
  d: NonNullable<WinemakerAgentContext['uploadedDocument']>
): AgentQuickAnswer {
  const classified =
    Boolean(d.supplier_id) ||
    d.lines.some(l => l.supply_kind !== 'otro' || Boolean(l.varietal?.trim()))

  const lineText =
    d.lines.length > 0 ? d.lines.map(l => l.supply_label).join(', ') : 'sin líneas clasificadas'
  const total = d.total != null && d.total > 0 ? ` Total: ${fmtMoney(d.total)}.` : ''

  const { mensaje, agentQuery: _agentQuery } = buildTicketUploadMessage({
    filename: d.original_filename || d.vendor || 'documento',
    contentType:
      d.vision_status === 'skipped_pdf'
        ? 'application/pdf'
        : d.vision_status
          ? 'image/png'
          : 'application/octet-stream',
    visionStatus: (d.vision_status || (classified ? 'ok' : 'parse_error')) as WmTicketVisionStatus,
    classified,
    supplierName: d.vendor || null,
    summaryLabel: lineText,
    total,
  })

  return {
    mensaje,
    accionLabel: 'Ver documentos',
    accionHref: '/dashboard/winemaker/documentos',
  }
}

export function tryWinemakerQuickAnswer(
  query: string,
  ctx: WinemakerAgentContext
): AgentQuickAnswer | null {
  const q = norm(query)
  if (!q) return null

  const r = ctx.resumen

  if (q.includes('pedido') || (q.includes('entreg') && q.includes('marcar'))) {
    return {
      mensaje:
        'En bodega no hay pedidos de entrega como en distribución. Si acabas de subir un ticket, dime proveedor e insumos; si es una venta, aún no tenemos ese flujo en winemaker.',
      accionLabel: 'Ver documentos',
      accionHref: '/dashboard/winemaker/documentos',
    }
  }

  if (
    ctx.uploadedDocument &&
    (q.includes('subi') || q.includes('detectaste') || q.includes('registro') || q.includes('como lo registro'))
  ) {
    return uploadQuickAnswer(ctx.uploadedDocument)
  }

  if (q.includes('proveedor') && ctx.proveedores.length > 0) {
    const names = ctx.proveedores
      .slice(0, 5)
      .map(p => (p.insumos.length ? `${p.name} (${p.insumos.join(', ')})` : p.name))
      .join(' · ')
    return {
      mensaje: `Tienes ${ctx.proveedores.length} proveedor${ctx.proveedores.length === 1 ? '' : 'es'}: ${names}.`,
      accionLabel: 'Ver proveedores',
      accionHref: '/dashboard/winemaker/proveedores',
    }
  }

  if (
    (q.includes('gast') || q.includes('costo') || q.includes('pague')) &&
    (q.includes('mes') || q.includes('este mes') || q.includes('del mes'))
  ) {
    return {
      mensaje: `Este mes llevas ${fmtMoney(r.gastosMesMxn)} en gastos registrados (lotes y bodega).`,
      accionLabel: 'Ver gastos',
      accionHref: '/dashboard/winemaker/gastos',
    }
  }

  if (q.includes('bodega') && (q.includes('gast') || q.includes('overhead') || q.includes('sin lote'))) {
    return {
      mensaje: `Gastos de bodega (sin lote asignado): ${fmtMoney(r.gastosBodegaMxn)}.`,
      accionLabel: 'Ver gastos',
      accionHref: '/dashboard/winemaker/gastos',
    }
  }

  if (
    q.includes('documento') ||
    q.includes('ticket') ||
    q.includes('factura') ||
    (q.includes('cuant') && q.includes('ticket'))
  ) {
    const n = r.documentosTotal
    const recent = ctx.documentosRecientes[0]
    const extra = recent
      ? ` El más reciente: ${recent.vendor || recent.original_filename || recent.document_type}.`
      : ''
    return {
      mensaje: `Tienes ${n} documento${n === 1 ? '' : 's'} guardado${n === 1 ? '' : 's'}.${extra}`,
      accionLabel: 'Ver documentos',
      accionHref: '/dashboard/winemaker/documentos',
    }
  }

  if (q.includes('semana') || q.includes('pendiente') || q.includes('agenda')) {
    return {
      mensaje: `${r.lotesActivos} lotes activos · revisa barrica y embotellado en la agenda.`,
      accionLabel: 'Ver calendario',
      accionHref: '/dashboard/winemaker/agenda',
    }
  }

  if (q.includes('embotell') || (q.includes('listo') && q.includes('lote'))) {
    const ready = ctx.resumen.porEstado.find(e => e.status === 'ready')
    const n = ready?.count ?? 0
    return {
      mensaje:
        n > 0
          ? `${n} lote${n === 1 ? '' : 's'} listo${n === 1 ? '' : 's'} para embotellar.`
          : 'Ningún lote marcado como listo aún.',
      accionLabel: 'Ver lotes',
      accionHref: '/dashboard/winemaker/lotes',
    }
  }

  if (q.includes('barrica') || q.includes('envejec')) {
    const aging = ctx.resumen.porEstado.find(e => e.status === 'aging')
    const n = aging?.count ?? 0
    return {
      mensaje:
        n > 0
          ? `${n} lote${n === 1 ? '' : 's'} en envejecimiento.`
          : 'Aún no hay lotes en barrica registrados.',
      accionLabel: 'Ver agenda',
      accionHref: '/dashboard/winemaker/agenda',
    }
  }

  if (
    q.includes('lote') ||
    q.includes('ferment') ||
    q.includes('vino') ||
    q.includes('litro')
  ) {
    const litros = r.litrosEnProceso
    return {
      mensaje: `${r.lotesActivos} lote${r.lotesActivos === 1 ? '' : 's'} activo${r.lotesActivos === 1 ? '' : 's'} · ~${litros.toLocaleString('es-MX')} L en proceso.`,
      accionLabel: 'Ver lotes',
      accionHref: '/dashboard/winemaker/lotes',
    }
  }

  if (q.includes('resumen') || q.includes('como voy') || q.includes('estado')) {
    return {
      mensaje: `${r.lotesActivos} lotes activos · ${r.documentosTotal} documentos · ${fmtMoney(r.gastosMesMxn)} gastados este mes.`,
      accionLabel: 'Ver lotes',
      accionHref: '/dashboard/winemaker/lotes',
    }
  }

  return null
}
