import { describe, expect, it } from 'vitest'
import { resolveCaptureDocumentDate } from '@/lib/proof/winemaker-capture-process'

describe('resolveCaptureDocumentDate', () => {
  it('keeps a valid calendar day', () => {
    expect(resolveCaptureDocumentDate('2026-07-08')).toBe('2026-07-08')
  })

  it('falls back to today for invalid or missing values', () => {
    const today = new Date().toISOString().slice(0, 10)
    expect(resolveCaptureDocumentDate(null)).toBe(today)
    expect(resolveCaptureDocumentDate(undefined)).toBe(today)
    expect(resolveCaptureDocumentDate('')).toBe(today)
    expect(resolveCaptureDocumentDate('07/08/2026')).toBe(today)
    expect(resolveCaptureDocumentDate('not-a-date')).toBe(today)
  })
})
