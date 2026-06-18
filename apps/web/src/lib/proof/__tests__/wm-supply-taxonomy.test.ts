import { describe, expect, it } from 'vitest'
import {
  inferSupplyKind,
  inferVarietal,
  normalizeSupplierName,
  formatSupplyLineLabel,
} from '@/lib/proof/wm-supply-taxonomy'

describe('wm-supply-taxonomy', () => {
  it('infers supply kinds from Spanish labels', () => {
    expect(inferSupplyKind('corchos naturales 44x24')).toBe('corcho')
    expect(inferSupplyKind('botella bordeaux 750ml')).toBe('botella')
    expect(inferSupplyKind('etiquetas frontal y contra')).toBe('etiqueta')
    expect(inferSupplyKind('compra uva cabernet sauvignon')).toBe('uva')
    expect(inferSupplyKind('metabisulfito de potasio')).toBe('sulfito')
  })

  it('infers varietal from description', () => {
    expect(inferVarietal('uva cabernet sauvignon san luis')).toBe('Cabernet Sauvignon')
    expect(inferVarietal('corcho')).toBe('')
  })

  it('normalizes supplier names for dedup', () => {
    expect(normalizeSupplierName('  Viñedos   del Valle S.A. ')).toBe('vinedos del valle sa')
    expect(normalizeSupplierName('Viñedos del Valle SA')).toBe('vinedos del valle sa')
  })

  it('formats uva with varietal', () => {
    expect(formatSupplyLineLabel('uva', 'Cabernet')).toBe('Uva · Cabernet')
    expect(formatSupplyLineLabel('corcho', '')).toBe('Corcho')
  })
})
