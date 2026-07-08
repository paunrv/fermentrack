import { describe, expect, it } from 'vitest'
import { readAuthNextCookie } from '../post-auth-next'

describe('readAuthNextCookie', () => {
  it('reads encoded next path from cookie header', () => {
    const header = 'other=1; proof_auth_next=%2Fonboarding; sb=token'
    expect(readAuthNextCookie(header)).toBe('/onboarding')
  })

  it('returns null when cookie is missing', () => {
    expect(readAuthNextCookie('other=1')).toBeNull()
    expect(readAuthNextCookie(null)).toBeNull()
  })
})
