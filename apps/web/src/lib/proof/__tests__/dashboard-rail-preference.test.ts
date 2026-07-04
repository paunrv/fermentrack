import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  readDashboardRailExpanded,
  writeDashboardRailExpanded,
} from '@/lib/proof/dashboard-rail-preference'

describe('dashboard rail preference', () => {
  beforeEach(() => {
    const store = new Map<string, string>()
    const storage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value)
      },
      removeItem: (key: string) => {
        store.delete(key)
      },
    }
    vi.stubGlobal('window', { localStorage: storage })
    vi.stubGlobal('localStorage', storage)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('defaults to collapsed', () => {
    expect(readDashboardRailExpanded()).toBe(false)
  })

  it('persists expanded preference', () => {
    writeDashboardRailExpanded(true)
    expect(readDashboardRailExpanded()).toBe(true)
    writeDashboardRailExpanded(false)
    expect(readDashboardRailExpanded()).toBe(false)
  })
})
