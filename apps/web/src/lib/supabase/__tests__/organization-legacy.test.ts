import { describe, expect, it } from 'vitest'
import { isMissingColumnError } from '@/lib/supabase/organization'

describe('isMissingColumnError', () => {
  it('detects PostgREST missing column messages', () => {
    expect(
      isMissingColumnError(
        { message: 'column organizations_1.org_type does not exist', code: '42703' },
        'org_type'
      )
    ).toBe(true)
  })

  it('returns false for unrelated errors', () => {
    expect(isMissingColumnError(new Error('permission denied'), 'org_type')).toBe(false)
  })
})
