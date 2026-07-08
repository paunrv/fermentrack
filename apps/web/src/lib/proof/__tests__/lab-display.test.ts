import { describe, expect, it } from 'vitest'
import {
  formatLabResultValue,
  isCriticalLabParameter,
  sortLabResults,
} from '@/lib/proof/lab-display'

describe('formatLabResultValue', () => {
  it('formats qualifier values', () => {
    expect(
      formatLabResultValue({ value_numeric: 1, value_qualifier: '<', unit: 'mg/L' })
    ).toBe('<1 mg/L')
  })

  it('formats pH without unit suffix', () => {
    expect(
      formatLabResultValue({ value_numeric: 3.28, value_qualifier: null, unit: 'pH' })
    ).toBe('3.28')
  })

  it('keeps duplicate pH rows distinguished by method at render time', () => {
    const rows = sortLabResults([
      { parameter: 'ph', method: 'potentiometry' },
      { parameter: 'ph', method: 'FTIR' },
    ])
    expect(rows.map(r => r.method)).toEqual(['FTIR', 'potentiometry'])
  })
})

describe('isCriticalLabParameter', () => {
  it('flags glucose_fructose', () => {
    expect(isCriticalLabParameter('glucose_fructose')).toBe(true)
    expect(isCriticalLabParameter('ethanol')).toBe(false)
  })
})

describe('sortLabResults', () => {
  it('groups sugars before alcohol and SO2', () => {
    const sorted = sortLabResults([
      { parameter: 'so2_free', method: null },
      { parameter: 'ethanol', method: null },
      { parameter: 'glucose_fructose', method: null },
      { parameter: 'ph', method: 'FTIR' },
    ])
    expect(sorted.map(r => r.parameter)).toEqual([
      'glucose_fructose',
      'ethanol',
      'ph',
      'so2_free',
    ])
  })
})
