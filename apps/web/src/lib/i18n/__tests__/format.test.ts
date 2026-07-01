import { describe, expect, it } from 'vitest'
import { formatCurrencyMxn, formatDate, formatNumber } from '@/lib/i18n/format'

const SAMPLE_DATE = new Date('2026-06-30T12:00:00.000Z')

describe('i18n format helpers', () => {
  it('formats dates per locale', () => {
    expect(formatDate(SAMPLE_DATE, 'es-MX')).toMatch(/2026/)
    expect(formatDate(SAMPLE_DATE, 'en-US')).toMatch(/2026/)
    expect(formatDate(SAMPLE_DATE, 'es-MX')).not.toBe(formatDate(SAMPLE_DATE, 'en-US'))
  })

  it('formats numbers per locale', () => {
    expect(formatNumber(1234.5, 'es-MX')).toContain('234')
    expect(formatNumber(1234.5, 'en-US')).toContain('234')
  })

  it('formats MXN currency per locale', () => {
    expect(formatCurrencyMxn(1299, 'es-MX')).toMatch(/\$|MXN/)
    expect(formatCurrencyMxn(1299, 'en-US')).toMatch(/\$|MXN/)
  })
})
