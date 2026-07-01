import { describe, expect, it } from 'vitest'
import {
  buildOwnerAlertDescriptors,
  mapOwnerAlertsToOperativas,
} from '@/lib/proof/winemaker-owner-alerts'
import { greetingPeriod } from '@/lib/supabase/winemaker-owner-home'

const copy = {
  tempTitle: (p: { code: string }) => `temp:${p.code}`,
  tempSubtext: (p: { temp: number; min: number; max: number }) =>
    `${p.temp}@${p.min}-${p.max}`,
  staleTitle: (p: { code: string; days: number }) => `stale:${p.code}:${p.days}`,
  staleSubtextWithEvent: (p: { days: number }) => `last:${p.days}`,
  staleSubtextNoEvent: () => 'none',
  viewLot: () => 'view',
}

describe('greetingPeriod', () => {
  it('returns morning before noon', () => {
    expect(greetingPeriod(new Date('2026-06-01T08:00:00'))).toBe('morning')
  })

  it('returns afternoon mid-day', () => {
    expect(greetingPeriod(new Date('2026-06-01T14:00:00'))).toBe('afternoon')
  })

  it('returns evening at night', () => {
    expect(greetingPeriod(new Date('2026-06-01T21:00:00'))).toBe('evening')
  })
})

describe('buildOwnerAlertDescriptors', () => {
  const lot = {
    id: 'lot-1',
    code: 'LOT-A',
    current_stage: 'fermentation',
    varietal: 'Cabernet',
    created_at: '2026-01-01T00:00:00Z',
  }

  it('flags fermentation temperature outside range', () => {
    const descriptors = buildOwnerAlertDescriptors([lot], [
      {
        id: 'ev-1',
        lot_id: 'lot-1',
        event_type: 'FERMENTATION_MONITORING',
        payload: { temp_c: 22 },
        occurred_at: new Date().toISOString(),
      },
    ])

    expect(descriptors).toHaveLength(1)
    expect(descriptors[0]).toMatchObject({ kind: 'temp', lotCode: 'LOT-A', temp: 22 })
  })

  it('maps descriptors to operativas with injected copy', () => {
    const alerts = mapOwnerAlertsToOperativas(
      [{ kind: 'temp', id: 't1', lotId: 'lot-1', lotCode: 'LOT-A', temp: 22 }],
      copy
    )

    expect(alerts[0]?.titulo).toBe('temp:LOT-A')
    expect(alerts[0]?.acciones?.[0]?.label).toBe('view')
  })
})
