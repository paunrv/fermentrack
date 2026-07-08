import type { EmailOtpType, SupabaseClient } from '@supabase/supabase-js'
import { hasAuthHashTokens, parseAuthHashParams } from '@/lib/auth/confirm-hash'

export type ActivateInviteSessionResult =
  | { ok: true; isInvite: boolean }
  | { ok: false; reason: string }

function otpTypes(): EmailOtpType[] {
  return ['invite', 'signup', 'magiclink', 'recovery', 'email_change', 'email']
}

function parseOtpType(raw: string | null): EmailOtpType | null {
  if (!raw) return null
  return otpTypes().includes(raw as EmailOtpType) ? (raw as EmailOtpType) : null
}

export async function activateInviteSession(
  sb: SupabaseClient,
  opts: { hash: string; searchParams: URLSearchParams; teamFlow: boolean }
): Promise<ActivateInviteSessionResult> {
  const { hash, searchParams, teamFlow } = opts

  if (hasAuthHashTokens(hash)) {
    if (teamFlow) await sb.auth.signOut({ scope: 'local' })

    const params = parseAuthHashParams(hash)
    const { error } = await sb.auth.setSession({
      access_token: params.access_token!,
      refresh_token: params.refresh_token!,
    })
    if (error) return { ok: false, reason: error.message }

    return { ok: true, isInvite: params.type === 'invite' || teamFlow }
  }

  const code = searchParams.get('code')
  if (code) {
    if (teamFlow) await sb.auth.signOut({ scope: 'local' })

    const { error } = await sb.auth.exchangeCodeForSession(code)
    if (error) return { ok: false, reason: error.message }

    return { ok: true, isInvite: teamFlow || searchParams.get('type') === 'invite' }
  }

  const tokenHash = searchParams.get('token_hash')
  const otpType = parseOtpType(searchParams.get('type'))
  if (tokenHash && otpType) {
    if (teamFlow) await sb.auth.signOut({ scope: 'local' })

    const { error } = await sb.auth.verifyOtp({ token_hash: tokenHash, type: otpType })
    if (error) return { ok: false, reason: error.message }

    return { ok: true, isInvite: otpType === 'invite' || teamFlow }
  }

  return { ok: false, reason: 'missing_tokens' }
}
