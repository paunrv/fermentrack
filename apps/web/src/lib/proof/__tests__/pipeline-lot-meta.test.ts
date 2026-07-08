import { describe, expect, it } from 'vitest'
import {
  buildPipelineLots,
  columnTone,
  formatLastMeasurement,
  groupPipelineByEtapa,
  PIPELINE_STALE_DAYS,
  shouldCollapsePipelineCards,
} from '@/lib/proof/pipeline-lot-meta'
import type { OwnerLotEventRow } from '@/lib/proof/winemaker-owner-alerts'
import type { OwnerLotRow } from '@/lib/supabase/winemaker-owner-home'

const baseLot = (overrides: Partial<OwnerLotRow> = {}): OwnerLotRow => ({
  id: 'lot-1',
  code: 'LOT-2026-001',
  current_stage: 'fermentation',
  etapa: 'fermentacion',
  varietal: 'Chardonnay',
  created_at: '2026-01-01T00:00:00Z',
  ...overrides,
})

describe('formatLastMeasurement', () => {
  it('formats temperature and brix', () => {
    expect(formatLastMeasurement({ temp_c: 17, brix: 20.1 })).toBe('17°C · 20.1°Bx')
  })
})

describe('buildPipelineLots', () => {
  it('flags stale lots after pipeline threshold', () => {
    const now = new Date('2026-02-10T00:00:00Z').getTime()
    const lots = [baseLot()]
    const events: OwnerLotEventRow[] = [
      {
        id: 'ev-1',
        lot_id: 'lot-1',
        event_type: 'FERMENTATION_MONITORING',
        payload: { temp_c: 16 },
        occurred_at: '2026-02-01T00:00:00Z',
      },
    ]

    const [pipelineLot] = buildPipelineLots(lots, events, now)
    expect(pipelineLot.daysSinceLastRecord).toBe(9)
    expect(pipelineLot.needsAttention).toBe(true)
    expect(pipelineLot.attentionReasons).toContain('stale')
    expect(pipelineLot.daysSinceLastRecord).toBeGreaterThan(PIPELINE_STALE_DAYS)
  })

  it('flags temperature out of range', () => {
    const now = new Date('2026-02-02T12:00:00Z').getTime()
    const lots = [baseLot()]
    const events: OwnerLotEventRow[] = [
      {
        id: 'ev-1',
        lot_id: 'lot-1',
        event_type: 'FERMENTATION_MONITORING',
        payload: { temp_c: 22, vessel_note: 'Tanque 3' },
        occurred_at: '2026-02-02T00:00:00Z',
      },
    ]

    const [pipelineLot] = buildPipelineLots(lots, events, now)
    expect(pipelineLot.container).toBe('Tanque 3')
    expect(pipelineLot.lastMeasurement).toBe('22°C')
    expect(pipelineLot.attentionReasons).toContain('temp')
  })

  it('flags bottling pending for crianza lots without existencia', () => {
    const lots = [baseLot({ etapa: 'crianza', current_stage: 'aging' })]
    const [pipelineLot] = buildPipelineLots(lots, [], Date.now(), new Set())
    expect(pipelineLot.bottlingPending).toBe(true)
    expect(pipelineLot.attentionReasons).toContain('bottling')
  })

  it('clears bottling pending when existencia exists', () => {
    const lots = [baseLot({ id: 'lot-1', etapa: 'crianza' })]
    const [pipelineLot] = buildPipelineLots(lots, [], Date.now(), new Set(['lot-1']))
    expect(pipelineLot.bottlingPending).toBe(false)
  })

  it('treats future last event as scheduled, not negative days', () => {
    const now = new Date('2026-02-10T15:00:00').getTime()
    const lots = [baseLot()]
    const events: OwnerLotEventRow[] = [
      {
        id: 'ev-future',
        lot_id: 'lot-1',
        event_type: 'FERMENTATION_MONITORING',
        payload: { temp_c: 16 },
        occurred_at: '2026-04-01T00:00:00',
      },
    ]

    const [pipelineLot] = buildPipelineLots(lots, events, now)
    expect(pipelineLot.recordTiming.kind).toBe('future')
    expect(pipelineLot.recordTiming.days).toBeGreaterThan(0)
    expect(pipelineLot.daysSinceLastRecord).toBe(0)
    expect(pipelineLot.attentionReasons).not.toContain('stale')
  })
})

describe('groupPipelineByEtapa', () => {
  it('returns six columns in fixed order', () => {
    const columns = groupPipelineByEtapa([
      {
        id: '1',
        code: 'LOT-A',
        etapa: 'crianza',
        varietal: null,
        container: null,
        lastMeasurement: null,
        daysSinceLastRecord: 0,
        recordTiming: { kind: 'today', days: 0 },
        needsAttention: false,
        attentionReasons: [],
        bottlingPending: false,
      },
      {
        id: '2',
        code: 'LOT-B',
        etapa: 'cosecha',
        varietal: null,
        container: null,
        lastMeasurement: null,
        daysSinceLastRecord: 0,
        recordTiming: { kind: 'today', days: 0 },
        needsAttention: false,
        attentionReasons: [],
        bottlingPending: false,
      },
    ])

    expect(columns).toHaveLength(6)
    expect(columns[0].etapa).toBe('cosecha')
    expect(columns[0].lots.map(l => l.code)).toEqual(['LOT-B'])
    expect(columns[4].etapa).toBe('crianza')
    expect(columnTone(columns[0].lots)).toBe('accent')
    expect(columnTone([])).toBe('neutral')
  })
})

describe('shouldCollapsePipelineCards', () => {
  it('collapses when total exceeds threshold', () => {
    expect(shouldCollapsePipelineCards(15)).toBe(false)
    expect(shouldCollapsePipelineCards(16)).toBe(true)
  })
})
