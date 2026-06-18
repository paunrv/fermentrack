import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import {
  filterGastosByLookback,
  isGastosListQuery,
  parseGastosLookbackDays,
} from '@/lib/proof/winemaker-gastos-query'
import { buildWinemakerDisplayCards } from '@/lib/proof/winemaker-display-cards'
import type { WinemakerAgentContext } from '@/lib/proof/winemaker-agent-context'
import { tryWinemakerQuickAnswer } from '@/lib/proof/winemaker-agent-answers'

function makeCtx(): WinemakerAgentContext {
  return {
    perfil: 'winemaker',
    proveedores: [],
    resumen: {
      lotesTotal: 0,
      lotesActivos: 0,
      documentosTotal: 0,
      gastosMesMxn: 23904,
      gastosBodegaMxn: 23904,
      litrosEnProceso: 0,
      porEstado: [],
    },
    lotes: [],
    documentosRecientes: [],
    gastosRecientes: [
      {
        id: 'g1',
        category: 'insumo',
        description: 'BOTELLA DE VIDRIO',
        amount: 13099,
        lot_id: null,
        cost_date: '2026-05-19',
        created_at: '2026-06-17T20:00:00.000Z',
      },
      {
        id: 'g2',
        category: 'insumo',
        description: 'GLOBAL FUENTES empaque',
        amount: 9905,
        lot_id: null,
        cost_date: '2026-05-19',
        created_at: '2026-06-17T22:00:00.000Z',
      },
    ],
  }
}

describe('winemaker gastos list', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-17T12:00:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const baseCtx = makeCtx()
  it('detects gastos list query', () => {
    expect(isGastosListQuery('muestrame mis gastos de los ultimos 10 dias')).toBe(true)
    expect(isGastosListQuery('queda en bodega')).toBe(false)
  })

  it('parses 10 day lookback', () => {
    expect(parseGastosLookbackDays('ultimos 10 dias')).toBe(10)
  })

  it('quick answer summarizes gastos from context', () => {
    const answer = tryWinemakerQuickAnswer('muestrame mis gastos de los ultimos 10 dias', baseCtx)
    expect(answer?.mensaje).toContain('2 gastos')
    expect(answer?.showDisplayCards).toBe(true)
  })

  it('builds display cards without emptyResults when gastos exist', () => {
    const built = buildWinemakerDisplayCards(
      'muestrame mis gastos de los ultimos 10 dias',
      baseCtx as unknown as Record<string, unknown>
    )
    expect(built.emptyResults).toBe(false)
    expect(built.displayCards?.items).toHaveLength(2)
  })

  it('filters by registration date, not invoice date', () => {
    const filtered = filterGastosByLookback(baseCtx.gastosRecientes, 'ultimos 10 dias')
    expect(filtered).toHaveLength(2)
  })

  it('filters gastos by lookback window', () => {
    const old = filterGastosByLookback(
      [
        ...baseCtx.gastosRecientes,
        {
          id: 'g-old',
          category: 'otro',
          description: 'viejo',
          amount: 100,
          lot_id: null,
          cost_date: '2026-05-01',
          created_at: '2020-01-01T00:00:00.000Z',
        },
      ],
      'ultimos 10 dias'
    )
    expect(old).toHaveLength(2)
  })
})
