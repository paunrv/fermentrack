import { describe, expect, it } from 'vitest'
import {
  buildAgendaDayBars,
  monthDateRange,
  toIsoDate,
  type AgendaCaptureSource,
} from '@/lib/proof/agenda-day-bars'
import type { WmDocumentRow } from '@/lib/proof/winemaker-types'

function doc(
  id: string,
  date: string,
  source: AgendaCaptureSource | undefined,
  title = 'Doc'
): WmDocumentRow {
  return {
    id,
    organization_id: 'org',
    document_type: source === 'lab' ? 'lab_result' : 'photo',
    storage_path: null,
    original_filename: `${id}.jpg`,
    vendor: '',
    supplier_id: null,
    folio: '',
    issuer_address: '',
    payment_method: '',
    payment_form: '',
    concept_title: title,
    subtotal: null,
    tax_iva: 0,
    tax_iva_rate: '',
    tax_iesps: 0,
    tax_isr_ret: 0,
    tax_iva_ret: 0,
    total_amount: null,
    currency: 'MXN',
    ocr_text: '',
    parsed_json: source ? { source, etapa: 'fermentacion' } : {},
    document_date: date,
    created_at: `${date}T12:00:00Z`,
  }
}

describe('buildAgendaDayBars', () => {
  it('groups by date and paints one bar per event', () => {
    const map = buildAgendaDayBars([
      doc('1', '2026-07-09', 'whiteboard'),
      doc('2', '2026-07-09', 'lab'),
      doc('3', '2026-07-09', 'whiteboard'),
      doc('4', '2026-07-10', 'bodega'),
    ])
    const d9 = map.get('2026-07-09')!
    expect(d9.events).toHaveLength(3)
    expect(d9.bars).toEqual(['whiteboard', 'lab', 'whiteboard'])
    expect(d9.overflow).toBe(0)
    expect(map.get('2026-07-10')!.bars).toEqual(['bodega'])
  })

  it('caps bars at 3 and counts overflow', () => {
    const map = buildAgendaDayBars([
      doc('1', '2026-07-01', 'whiteboard'),
      doc('2', '2026-07-01', 'lab'),
      doc('3', '2026-07-01', 'bodega'),
      doc('4', '2026-07-01', 'other'),
      doc('5', '2026-07-01', 'other'),
    ])
    const day = map.get('2026-07-01')!
    expect(day.bars).toEqual(['whiteboard', 'lab', 'bodega'])
    expect(day.overflow).toBe(2)
  })
})

describe('monthDateRange / toIsoDate', () => {
  it('returns inclusive month bounds', () => {
    expect(monthDateRange(2026, 6)).toEqual({ from: '2026-07-01', to: '2026-07-31' })
    expect(toIsoDate(2026, 6, 9)).toBe('2026-07-09')
  })
})
