import { describe, expect, it } from 'vitest'
import {
  buildPlanResourceWarning,
  planResourceWarningLevel,
  PLAN_WARNING_APPROACH_RATIO,
} from '@/lib/proof/plan-limit-warnings'

describe('planResourceWarningLevel', () => {
  it('returns ok for unlimited plans', () => {
    expect(planResourceWarningLevel(99, null)).toBe('ok')
  })

  it('returns reached at cap', () => {
    expect(planResourceWarningLevel(5, 5)).toBe('reached')
    expect(planResourceWarningLevel(12, 12)).toBe('reached')
  })

  it('returns approaching with one slot left', () => {
    expect(planResourceWarningLevel(4, 5)).toBe('approaching')
  })

  it(`returns approaching at ${PLAN_WARNING_APPROACH_RATIO * 100}% usage`, () => {
    expect(planResourceWarningLevel(4, 5)).toBe('approaching')
    expect(planResourceWarningLevel(3, 5)).toBe('ok')
  })
})

describe('buildPlanResourceWarning', () => {
  it('computes percent used for memoria', () => {
    const warning = buildPlanResourceWarning('memoria', 10, 12)
    expect(warning.level).toBe('approaching')
    expect(warning.percentUsed).toBe(83)
    expect(warning.remaining).toBe(2)
  })

  it('marks lotes at limit as reached', () => {
    const warning = buildPlanResourceWarning('lotes_activos', 5, 5)
    expect(warning.level).toBe('reached')
    expect(warning.remaining).toBe(0)
  })
})
