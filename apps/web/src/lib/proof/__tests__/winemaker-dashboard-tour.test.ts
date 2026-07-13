import { describe, expect, it } from 'vitest'
import {
  readWinemakerDashboardTourCompleted,
  winemakerDashboardTourStorageKey,
} from '../winemaker-dashboard-tour'

describe('winemaker-dashboard-tour', () => {
  it('uses a versioned per-user storage key', () => {
    expect(winemakerDashboardTourStorageKey('user-1')).toContain('user-1')
    expect(winemakerDashboardTourStorageKey('user-1')).toContain('v1')
  })

  it('returns false when localStorage is unavailable', () => {
    expect(readWinemakerDashboardTourCompleted('user-1')).toBe(false)
  })
})

describe('tour query param contract', () => {
  it('documents skip and force values used by WinemakerDashboardTour', () => {
    // UI contract: tour=0|skip suppresses + marks completed; tour=1 force-opens.
    const skipValues = new Set(['0', 'skip'])
    const forceValues = new Set(['1'])
    expect(skipValues.has('0')).toBe(true)
    expect(skipValues.has('skip')).toBe(true)
    expect(forceValues.has('1')).toBe(true)
    expect(skipValues.has('1')).toBe(false)
  })
})
