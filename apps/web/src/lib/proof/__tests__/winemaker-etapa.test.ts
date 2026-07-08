import { describe, expect, it } from 'vitest'
import { isWinemakerEtapaKey, WINEMAKER_ETAPA_KEYS } from '../winemaker-etapa'

describe('winemaker-etapa', () => {
  it('lists seven production categories including bodega', () => {
    expect(WINEMAKER_ETAPA_KEYS).toHaveLength(7)
    expect(WINEMAKER_ETAPA_KEYS).toContain('bodega')
  })

  it('validates etapa keys', () => {
    expect(isWinemakerEtapaKey('fermentacion')).toBe(true)
    expect(isWinemakerEtapaKey('invalid')).toBe(false)
  })
})
