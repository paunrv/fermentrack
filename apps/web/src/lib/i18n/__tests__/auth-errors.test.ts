import { describe, expect, it } from 'vitest'
import { translateAuthError } from '@/lib/i18n/auth-errors'

const t = (key: string) =>
  ({
    invalidCredentials: 'INVALID',
    emailNotConfirmed: 'UNCONFIRMED',
    generic: 'GENERIC',
  })[key] ?? key

describe('translateAuthError', () => {
  it('maps invalid credentials', () => {
    expect(translateAuthError('Invalid login credentials', t)).toBe('INVALID')
  })

  it('maps email not confirmed', () => {
    expect(translateAuthError('Email not confirmed', t)).toBe('UNCONFIRMED')
  })

  it('returns original message when unknown', () => {
    expect(translateAuthError('Rate limit exceeded', t)).toBe('Rate limit exceeded')
  })
})
