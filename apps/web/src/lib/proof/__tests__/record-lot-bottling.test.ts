import { describe, expect, it } from 'vitest'
import {
  lotEligibleForBottling,
  validateLotBottlingInput,
} from '@/lib/proof/record-lot-bottling'

describe('validateLotBottlingInput', () => {
  const valid = {
    lotId: 'lot-1',
    etiquetaId: 'et-1',
    anada: 2024,
    formato: '750ml',
    botellasPorCaja: 12 as const,
    botellasProducidas: 480,
  }

  it('accepts existing etiqueta', () => {
    const result = validateLotBottlingInput(valid)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.formato).toBe('750ml')
      expect(result.value.botellasProducidas).toBe(480)
    }
  })

  it('accepts new etiqueta nombre', () => {
    const result = validateLotBottlingInput({
      ...valid,
      etiquetaId: null,
      newEtiqueta: { nombre: 'Nebbiolo Reserva' },
    })
    expect(result.ok).toBe(true)
  })

  it('rejects missing lot id', () => {
    expect(validateLotBottlingInput({ ...valid, lotId: '' }).ok).toBe(false)
  })

  it('rejects missing etiqueta', () => {
    expect(
      validateLotBottlingInput({ ...valid, etiquetaId: null, newEtiqueta: null }).ok
    ).toBe(false)
  })

  it('rejects invalid anada and botellas', () => {
    expect(validateLotBottlingInput({ ...valid, anada: 1800 }).ok).toBe(false)
    expect(validateLotBottlingInput({ ...valid, botellasProducidas: 0 }).ok).toBe(false)
    expect(
      validateLotBottlingInput({ ...valid, botellasPorCaja: 8 as unknown as 12 }).ok
    ).toBe(false)
  })
})

describe('lotEligibleForBottling', () => {
  it('allows crianza and embotellado', () => {
    expect(lotEligibleForBottling('crianza')).toBe(true)
    expect(lotEligibleForBottling('embotellado')).toBe(true)
  })

  it('blocks earlier pipeline stages', () => {
    expect(lotEligibleForBottling('fermentacion')).toBe(false)
    expect(lotEligibleForBottling('cosecha')).toBe(false)
  })
})
