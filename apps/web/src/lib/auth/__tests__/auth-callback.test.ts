import { describe, expect, it } from 'vitest'
import { buildAuthCallbackUrl, resolvePostAuthPath } from '../auth-callback'

describe('auth-callback', () => {
  it('builds callback URL on configured site origin with intent', () => {
    const url = buildAuthCallbackUrl({ intent: 'onboarding' })
    expect(url).toContain('/auth/callback')
    expect(url).toContain('intent=onboarding')
  })

  it('resolves intent before cookie fallback', () => {
    expect(resolvePostAuthPath(null, null, 'onboarding', null)).toBe('/dashboard')
    expect(resolvePostAuthPath(null, null, 'dashboard', null)).toBe('/dashboard')
    expect(resolvePostAuthPath(null, 'team', null, null)).toBe('/onboarding?mode=team')
  })
})
