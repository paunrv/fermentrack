import { describe, expect, it } from 'vitest'
import {
  CURRENT_STAGE_TO_ETAPA,
  etapaFromCurrentStage,
  isLotEtapa,
  LOT_ETAPA_RANK,
  LOT_ETAPA_VALUES,
} from '@/lib/proof/lot-etapa'

describe('lot etapa', () => {
  it('defines six pipeline stages in rank order', () => {
    expect(LOT_ETAPA_VALUES).toHaveLength(6)
    expect(LOT_ETAPA_RANK.embotellado).toBeGreaterThan(LOT_ETAPA_RANK.cosecha)
  })

  it('maps legacy current_stage to etapa', () => {
    expect(etapaFromCurrentStage('harvest')).toBe('cosecha')
    expect(etapaFromCurrentStage('fermentation')).toBe('fermentacion')
    expect(etapaFromCurrentStage('malolactic')).toBe('malolactica')
    expect(etapaFromCurrentStage('aging')).toBe('crianza')
    expect(etapaFromCurrentStage('bottling')).toBe('embotellado')
    expect(etapaFromCurrentStage('bottled')).toBe('embotellado')
  })

  it('defaults unknown or null stage to cosecha', () => {
    expect(etapaFromCurrentStage(null)).toBe('cosecha')
    expect(etapaFromCurrentStage('unknown')).toBe('cosecha')
  })

  it('validates etapa strings', () => {
    expect(isLotEtapa('crianza')).toBe(true)
    expect(isLotEtapa('analisis')).toBe(true)
    expect(isLotEtapa('fermentation')).toBe(false)
  })

  it('covers every legacy stage key', () => {
    for (const stage of [
      'harvest',
      'fermentation',
      'malolactic',
      'aging',
      'bottling',
      'bottled',
    ]) {
      expect(CURRENT_STAGE_TO_ETAPA[stage]).toBeDefined()
    }
  })
})
