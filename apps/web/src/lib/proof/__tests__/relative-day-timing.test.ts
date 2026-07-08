import { describe, expect, it } from 'vitest'
import { relativeDayTiming } from '@/lib/proof/format'

describe('relativeDayTiming', () => {
  const now = new Date('2026-02-10T15:00:00').getTime()

  it('returns past days for earlier records', () => {
    const reference = new Date('2026-02-01T00:00:00').getTime()
    expect(relativeDayTiming(reference, now)).toEqual({ kind: 'past', days: 9 })
  })

  it('returns today for same calendar day', () => {
    const reference = new Date('2026-02-10T23:00:00').getTime()
    expect(relativeDayTiming(reference, now)).toEqual({ kind: 'today', days: 0 })
  })

  it('returns future days for scheduled records', () => {
    const reference = new Date('2026-04-01T00:00:00').getTime()
    expect(relativeDayTiming(reference, now)).toEqual({ kind: 'future', days: 50 })
  })
})
