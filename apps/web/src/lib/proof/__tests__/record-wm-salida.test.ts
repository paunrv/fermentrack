import { describe, expect, it } from 'vitest'
import {
  buildSalidaConversionPreview,
  computeDefaultRango,
  rangesOverlap,
  validateRangoNoOverlap,
  validateRegistrarSalidaInput,
} from '@/lib/proof/record-wm-salida'

describe('validateRegistrarSalidaInput', () => {
  const valid = {
    existenciaId: 'ex-1',
    tipo: 'venta' as const,
    cantidad: 2,
    unidad: 'cajas' as const,
  }

  it('accepts valid cajas salida', () => {
    expect(validateRegistrarSalidaInput(valid).ok).toBe(true)
  })

  it('rejects missing existencia and invalid cantidad', () => {
    expect(validateRegistrarSalidaInput({ ...valid, existenciaId: '' }).ok).toBe(false)
    expect(validateRegistrarSalidaInput({ ...valid, cantidad: 0 }).ok).toBe(false)
  })

  it('rejects invalid rango', () => {
    expect(
      validateRegistrarSalidaInput({ ...valid, rangoInicio: 10, rangoFin: 5 }).ok
    ).toBe(false)
  })
})

describe('buildSalidaConversionPreview', () => {
  it('converts cajas and computes quedan', () => {
    const preview = buildSalidaConversionPreview(2, 'cajas', 12, 96)
    expect(preview.botellas).toBe(24)
    expect(preview.quedan).toBe(72)
  })
})

describe('computeDefaultRango', () => {
  it('starts after consumidas', () => {
    expect(computeDefaultRango(384, 24)).toEqual({ inicio: 385, fin: 408 })
  })
})

describe('validateRangoNoOverlap', () => {
  it('detects overlap', () => {
    expect(rangesOverlap(385, 408, 400, 420)).toBe(true)
    expect(
      validateRangoNoOverlap(385, 408, [{ rango_inicio: 400, rango_fin: 420 }])
    ).toBe(false)
    expect(
      validateRangoNoOverlap(385, 408, [{ rango_inicio: 409, rango_fin: 420 }])
    ).toBe(true)
  })
})
