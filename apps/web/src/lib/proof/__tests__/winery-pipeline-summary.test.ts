import { describe, expect, it } from 'vitest'
import { buildWineryPipelineSummary } from '@/lib/proof/winery-pipeline-summary'
import type { PipelineLot } from '@/lib/proof/pipeline-lot-meta'

const baseLot = (overrides: Partial<PipelineLot> = {}): PipelineLot => ({
  id: 'lot-1',
  code: 'LOT-2026-001',
  etapa: 'fermentacion',
  varietal: 'Chardonnay',
  container: null,
  lastMeasurement: null,
  daysSinceLastRecord: 1,
  recordTiming: { kind: 'past', days: 1 },
  needsAttention: false,
  attentionReasons: [],
  ...overrides,
})

describe('buildWineryPipelineSummary', () => {
  it('returns todo_en_orden when no alerts', () => {
    const summary = buildWineryPipelineSummary(
      [baseLot(), baseLot({ id: 'lot-2', code: 'LOT-2026-002', etapa: 'cosecha' })],
      []
    )

    expect(summary.salud).toBe('todo_en_orden')
    expect(summary.lotes_requieren_atencion).toBe(0)
    expect(summary.lotes_activos).toBe(2)
    expect(summary.conteo_por_etapa.cosecha).toBe(1)
    expect(summary.conteo_por_etapa.fermentacion).toBe(1)
    expect(summary.conteo_por_etapa.embotellado).toBe(0)
  })

  it('returns requiere_atencion with distinct lot count', () => {
    const summary = buildWineryPipelineSummary(
      [baseLot({ needsAttention: true })],
      [
        {
          kind: 'stale',
          id: 'stale-1',
          lotId: 'lot-1',
          lotCode: 'LOT-2026-001',
          daysSince: 8,
          hasLastEvent: true,
        },
      ]
    )

    expect(summary.salud).toBe('requiere_atencion')
    expect(summary.lotes_requieren_atencion).toBe(1)
  })
})
