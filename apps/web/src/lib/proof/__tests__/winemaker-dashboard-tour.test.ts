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
