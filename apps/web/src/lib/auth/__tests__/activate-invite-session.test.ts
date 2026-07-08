import { describe, expect, it, vi } from 'vitest'
import { activateInviteSession } from '@/lib/auth/activate-invite-session'

function mockSupabase(handlers: {
  signOut?: () => Promise<{ error: null }>
  setSession?: (args: unknown) => Promise<{ error: { message: string } | null }>
  exchangeCodeForSession?: (code: string) => Promise<{ error: { message: string } | null }>
  verifyOtp?: (args: unknown) => Promise<{ error: { message: string } | null }>
}) {
  return {
    auth: {
      signOut: vi.fn(handlers.signOut ?? (async () => ({ error: null }))),
      setSession: vi.fn(handlers.setSession ?? (async () => ({ error: null }))),
      exchangeCodeForSession: vi.fn(
        handlers.exchangeCodeForSession ?? (async () => ({ error: null }))
      ),
      verifyOtp: vi.fn(handlers.verifyOtp ?? (async () => ({ error: null }))),
    },
  }
}

describe('activateInviteSession', () => {
  it('uses hash tokens for implicit grant', async () => {
    const sb = mockSupabase({})
    const result = await activateInviteSession(sb as never, {
      hash: '#access_token=a&refresh_token=b&type=invite',
      searchParams: new URLSearchParams('flow=team'),
      teamFlow: true,
    })

    expect(result).toEqual({ ok: true, isInvite: true })
    expect(sb.auth.signOut).toHaveBeenCalledWith({ scope: 'local' })
    expect(sb.auth.setSession).toHaveBeenCalledWith({
      access_token: 'a',
      refresh_token: 'b',
    })
  })

  it('exchanges PKCE code from query string', async () => {
    const sb = mockSupabase({})
    const result = await activateInviteSession(sb as never, {
      hash: '',
      searchParams: new URLSearchParams('flow=team&code=pkce-code'),
      teamFlow: true,
    })

    expect(result).toEqual({ ok: true, isInvite: true })
    expect(sb.auth.exchangeCodeForSession).toHaveBeenCalledWith('pkce-code')
  })

  it('verifies token_hash invites', async () => {
    const sb = mockSupabase({})
    const result = await activateInviteSession(sb as never, {
      hash: '',
      searchParams: new URLSearchParams('type=invite&token_hash=abc123'),
      teamFlow: true,
    })

    expect(result).toEqual({ ok: true, isInvite: true })
    expect(sb.auth.verifyOtp).toHaveBeenCalledWith({ token_hash: 'abc123', type: 'invite' })
  })

  it('returns missing_tokens when nothing is present', async () => {
    const sb = mockSupabase({})
    const result = await activateInviteSession(sb as never, {
      hash: '',
      searchParams: new URLSearchParams('flow=team'),
      teamFlow: true,
    })

    expect(result).toEqual({ ok: false, reason: 'missing_tokens' })
  })
})
