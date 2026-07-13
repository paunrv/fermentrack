import { getSiteUrl } from '@/lib/i18n/site'
import { safeNextPath } from '@/lib/auth/safe-next-path'
import { readAuthNextCookie } from '@/lib/auth/post-auth-next'

export type AuthCallbackIntent = 'onboarding' | 'dashboard'

/**
 * Canonical OAuth return URL — uses browser/request origin in dev when available.
 * Prefer a path-only URL for Google/email OAuth so it matches the Supabase allow-list.
 * Use `flow: 'team'` only for invite links (must also be listed in Redirect URLs).
 * Post-auth destination belongs in the `proof_auth_next` cookie, not query params.
 */
export function buildAuthCallbackUrl(opts?: {
  intent?: AuthCallbackIntent
  flow?: 'team'
  origin?: string
}): string {
  const url = new URL('/auth/callback', opts?.origin ?? getSiteUrl())
  if (opts?.intent) url.searchParams.set('intent', opts.intent)
  if (opts?.flow) url.searchParams.set('flow', opts.flow)
  return url.toString()
}

/** Email invite links return tokens in the URL hash — handled client-side. */
export function buildAuthConfirmUrl(opts?: { flow?: 'team'; origin?: string }): string {
  const url = new URL('/auth/confirm', opts?.origin ?? getSiteUrl())
  if (opts?.flow) url.searchParams.set('flow', opts.flow)
  return url.toString()
}

export function resolvePostAuthPath(
  next: string | null,
  flow: string | null,
  intent: string | null,
  cookieHeader: string | null
): string {
  if (flow === 'team') return '/onboarding?mode=team'
  if (intent === 'onboarding' || intent === 'dashboard') return '/dashboard'
  return safeNextPath(next ?? readAuthNextCookie(cookieHeader), '/dashboard')
}
