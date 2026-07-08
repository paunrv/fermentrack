import { describe, expect, it } from 'vitest'
import { hasAuthHashTokens, parseAuthHashParams } from '@/lib/auth/confirm-hash'
import { buildAuthConfirmUrl } from '@/lib/auth/auth-callback'

describe('confirm-hash', () => {
  it('parses invite hash tokens', () => {
    const parsed = parseAuthHashParams(
      '#access_token=abc&refresh_token=def&type=invite&token_type=bearer'
    )
    expect(parsed.access_token).toBe('abc')
    expect(parsed.refresh_token).toBe('def')
    expect(parsed.type).toBe('invite')
  })

  it('detects complete auth hash', () => {
    expect(hasAuthHashTokens('#access_token=a&refresh_token=b')).toBe(true)
    expect(hasAuthHashTokens('#access_token=a')).toBe(false)
  })
})

describe('buildAuthConfirmUrl', () => {
  it('includes team flow for invites', () => {
    const url = buildAuthConfirmUrl({ flow: 'team' })
    expect(url).toContain('/auth/confirm')
    expect(url).toContain('flow=team')
  })
})
