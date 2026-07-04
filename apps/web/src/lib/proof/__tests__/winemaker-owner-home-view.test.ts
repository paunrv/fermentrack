import { describe, expect, it } from 'vitest'
import { resolveWinemakerOwnerHomeView } from '@/lib/proof/winemaker-owner-home-view'

describe('resolveWinemakerOwnerHomeView', () => {
  it('uses mobile home on mobile tier', () => {
    expect(resolveWinemakerOwnerHomeView('mobile')).toBe('mobile')
  })

  it('uses mobile home on tablet tier', () => {
    expect(resolveWinemakerOwnerHomeView('tablet')).toBe('mobile')
  })

  it('uses desktop home on desktop tier (≥1024)', () => {
    expect(resolveWinemakerOwnerHomeView('desktop')).toBe('desktop')
  })
})
