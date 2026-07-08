import { describe, expect, it } from 'vitest'
import { safeNextPath } from '../safe-next-path'

describe('safeNextPath', () => {
  it('returns fallback for missing or unsafe values', () => {
    expect(safeNextPath(null)).toBe('/dashboard')
    expect(safeNextPath('')).toBe('/dashboard')
    expect(safeNextPath('https://evil.test')).toBe('/dashboard')
    expect(safeNextPath('//evil.test')).toBe('/dashboard')
  })

  it('allows internal paths and query strings', () => {
    expect(safeNextPath('/dashboard')).toBe('/dashboard')
    expect(safeNextPath('/onboarding?mode=team')).toBe('/onboarding?mode=team')
    expect(safeNextPath('/dashboard/lotes/abc', '/onboarding')).toBe('/dashboard/lotes/abc')
  })
})
