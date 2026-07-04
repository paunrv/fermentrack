import { describe, expect, it } from 'vitest'
import { errorMessageFromUnknown } from '@/lib/errors/unknown'

describe('errorMessageFromUnknown', () => {
  it('reads Error.message', () => {
    expect(errorMessageFromUnknown(new Error('boom'))).toBe('boom')
  })

  it('reads Postgrest-style objects', () => {
    expect(errorMessageFromUnknown({ message: 'permission denied', code: '42501' })).toBe(
      'permission denied'
    )
  })

  it('falls back for unknown values', () => {
    expect(errorMessageFromUnknown(null)).toBe('unknown_error')
  })
})
