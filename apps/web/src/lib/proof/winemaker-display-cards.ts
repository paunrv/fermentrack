import {
  type CardItem,
  type DisplayCards,
} from '@/lib/proof/agent-response-types'
import type { WinemakerAgentContext } from '@/lib/proof/winemaker-agent-context'
import { formatCfdiFolioLabel } from '@/lib/proof/winemaker-cfdi-types'
import { WM_LOT_STATUS_LABEL, type WmWineLotStatus } from '@/lib/proof/winemaker-types'
import { fmtMoney } from '@/lib/proof/format'
import {
  filterBodegaGastos,
  filterGastosByLookback,
  gastosLookbackLabel,
  isBodegaGastosListQuery,
  isGastosListQuery,
  parseGastosLookbackDays,
} from '@/lib/proof/winemaker-gastos-query'
import { isAssignLotIntent, isOverheadBodegaIntent } from '@/lib/proof/winemaker-agent-actions'

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

function winemakerDocumentCardActions(docLabel: string): CardItem['actions'] {
  return [
    {
      label: 'Asignar a lote',
      prompt: `asigna la factura ${docLabel} a un lote de vino`,
    },
    {
      label: 'Gasto de bodega',
      prompt: `registra la factura ${docLabel} como gasto de bodega sin lote`,
    },
    {
      label: 'Ver líneas',
      prompt: `muéstrame el detalle de líneas de la factura ${docLabel}`,
    },
  ]
}

function winemakerCostCardActions(description: string): CardItem['actions'] {
  return [
    {
      label: 'Ver gastos',
      prompt: `muéstrame el detalle del gasto ${description}`,
    },
    {
      label: 'Asignar a lote',
      prompt: `asigna el gasto ${description} a un lote`,
    },
  ]
}

function costToCardItem(c: WinemakerAgentContext['gastosRecientes'][number]): CardItem {
  return {
    id: c.id,
    name: c.description || c.category,
    subtitle: c.lot_id ? 'Lote' : 'Bodega',
    status: c.lot_id ? ('ok' as const) : ('warning' as const),
    primaryValue: { label: 'monto', value: fmtMoney(c.amount) },
    secondaryValues: [
      { label: 'categoría', value: c.category },
      { label: 'factura', value: c.cost_date },
    ],
    actions: winemakerCostCardActions(c.description || c.category),
  }
}

function buildGastosCards(
  query: string,
  ctx: WinemakerAgentContext,
  opts?: { bodegaOnly?: boolean }
): DisplayCardsBuildResult {
  let costs = ctx.gastosRecientes ?? []
  if (opts?.bodegaOnly) costs = filterBodegaGastos(costs)
  costs = filterGastosByLookback(costs, query)

  const days = parseGastosLookbackDays(query)
  const title = opts?.bodegaOnly
    ? `Gastos de bodega · ${gastosLookbackLabel(days)}`
    : `Gastos · ${gastosLookbackLabel(days)}`

  if (costs.length === 0) {
    return { displayCards: null, emptyResults: false }
  }

  return {
    displayCards: {
      type: 'orders',
      title,
      items: costs.slice(0, 12).map(costToCardItem),
    },
    emptyResults: false,
  }
}

function isClassifiedDoc(d: WinemakerAgentContext['documentosRecientes'][number]): boolean {
  return d.classified
}

function documentToCardItem(
  d: WinemakerAgentContext['documentosRecientes'][number]
): CardItem {
  const title = formatCfdiFolioLabel(d.folio, d.vendor || d.original_filename)
  const classified = isClassifiedDoc(d)
  const secondaryValues: CardItem['secondaryValues'] = []

  if (d.folio) secondaryValues.push({ label: 'folio', value: d.folio })
  if (d.document_date) secondaryValues.push({ label: 'fecha', value: d.document_date })
  if (d.line_summary) secondaryValues.push({ label: 'insumos', value: d.line_summary })
  if (d.first_line_description)
    secondaryValues.push({ label: 'concepto', value: d.first_line_description })
  if (d.tax_iva != null && d.tax_iva > 0) {
    const ivaLabel = d.tax_iva_rate ? `IVA ${d.tax_iva_rate}` : 'IVA'
    secondaryValues.push({ label: ivaLabel, value: fmtMoney(d.tax_iva) })
  }
  if (d.supplier_email) secondaryValues.push({ label: 'email', value: d.supplier_email })

  return {
    id: d.id,
    name: title,
    subtitle: d.concept_title || d.payment_method || d.original_filename,
    status: classified ? ('ok' as const) : ('warning' as const),
    devDeletable: true,
    primaryValue:
      d.total_amount != null && d.total_amount > 0
        ? { label: 'total', value: fmtMoney(d.total_amount) }
        : { label: 'fecha', value: d.document_date },
    secondaryValues,
    actions: winemakerDocumentCardActions(title),
  }
}

function isWinemakerActionQuery(q: string): boolean {
  return (
    isOverheadBodegaIntent(q) ||
    isAssignLotIntent(q) ||
    ((q.includes('registra') || q.includes('asigna')) &&
      (q.includes('factura') || q.includes('ticket') || q.includes('gast')))
  )
}

function isDataQuery(q: string): boolean {
  return (
    q.includes('lote') ||
    q.includes('gasto') ||
    q.includes('documento') ||
    q.includes('ticket') ||
    q.includes('factura') ||
    q.includes('bodega') ||
    q.includes('ferment') ||
    q.includes('subi') ||
    q.includes('registro') ||
    q.includes('muéstrame') ||
    q.includes('muestrame') ||
    q.includes('mostrar')
  )
}

export function buildWinemakerDisplayCards(
  query: string,
  datos: Record<string, unknown>
): DisplayCardsBuildResult {
  const ctx = datos as unknown as WinemakerAgentContext
  if (ctx.perfil !== 'winemaker' || !ctx.resumen) {
    return { displayCards: null, emptyResults: false }
  }

  const q = norm(query)
  if (!q || !isDataQuery(q)) {
    return { displayCards: null, emptyResults: false }
  }

  if (isWinemakerActionQuery(q)) {
    return { displayCards: null, emptyResults: false }
  }

  if (isGastosListQuery(query)) {
    return buildGastosCards(query, ctx, { bodegaOnly: isBodegaGastosListQuery(query) })
  }

  if (q.includes('bodega') && (q.includes('gast') || q.includes('overhead') || q.includes('sin lote'))) {
    return buildGastosCards(query, ctx, { bodegaOnly: true })
  }

  if (
    q.includes('documento') ||
    q.includes('ticket') ||
    q.includes('factura') ||
    q.includes('subi') ||
    q.includes('registro')
  ) {
    const docs = ctx.documentosRecientes ?? []
    if (docs.length === 0) {
      return { displayCards: null, emptyResults: true }
    }

    const selectedId = ctx.selectedDocumentId
    const ordered = selectedId
      ? [...docs].sort((a, b) => (a.id === selectedId ? -1 : b.id === selectedId ? 1 : 0))
      : docs

    const type = 'orders' as const
    const items = ordered.slice(0, 8).map(documentToCardItem)
    const title = selectedId ? 'Factura analizada' : 'Documentos'

    return {
      displayCards: { type, title, items },
      emptyResults: false,
    }
  }

  const lotes = ctx.lotes ?? []
  if (lotes.length === 0 && (q.includes('lote') || q.includes('ferment') || q.includes('vino'))) {
    return { displayCards: null, emptyResults: true }
  }
  if (lotes.length === 0) {
    return { displayCards: null, emptyResults: false }
  }

  const type = 'inventory' as const
  const items: CardItem[] = lotes.slice(0, 12).map(l => {
    const status = l.status as WmWineLotStatus
    return {
      id: l.id,
      name: l.name || l.lot_code,
      subtitle: l.varietal || l.lot_code,
      status: status === 'ready' ? ('ok' as const) : ('warning' as const),
      primaryValue: {
        label: 'litros',
        value: l.liters_initial != null ? `${l.liters_initial.toLocaleString('es-MX')} L` : '—',
      },
      secondaryValues: [{ label: 'estado', value: WM_LOT_STATUS_LABEL[status] ?? l.status }],
      actions: [
        {
          label: 'Ver lote',
          prompt: `muéstrame el detalle del lote ${l.lot_code}`,
        },
        {
          label: 'Asignar gasto',
          prompt: `asigna un gasto reciente al lote ${l.lot_code}`,
        },
      ],
    }
  })

  return {
    displayCards: { type, title: 'Lotes de vino', items },
    emptyResults: false,
  }
}
