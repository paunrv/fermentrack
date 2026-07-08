import { describe, expect, it } from 'vitest'
import { mapPostgresInsertError } from '@/lib/proof/team-chat-errors'

describe('mapPostgresInsertError', () => {
  it('maps RLS denial to no_permission', () => {
    expect(mapPostgresInsertError({ code: '42501' })).toBe('no_permission')
  })

  it('maps profile FK violation to profile_missing', () => {
    expect(
      mapPostgresInsertError({
        code: '23503',
        message: 'violates foreign key constraint "wm_mensajes_author_id_fkey"',
      })
    ).toBe('profile_missing')
  })

  it('maps missing table to chat_unavailable', () => {
    expect(mapPostgresInsertError({ code: '42P01', message: 'relation wm_mensajes' })).toBe(
      'chat_unavailable'
    )
  })
})
