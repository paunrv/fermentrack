export const AUTH_NEXT_COOKIE = 'proof_auth_next'

const MAX_AGE_SECONDS = 600

/** Store post-auth destination before OAuth (redirectTo must stay a clean callback URL). */
export function setAuthNextCookie(next: string): void {
  if (typeof document === 'undefined') return
  document.cookie = `${AUTH_NEXT_COOKIE}=${encodeURIComponent(next)}; path=/; max-age=${MAX_AGE_SECONDS}; samesite=lax`
}

export function readAuthNextCookie(cookieHeader: string | null | undefined): string | null {
  if (!cookieHeader) return null
  const prefix = `${AUTH_NEXT_COOKIE}=`
  const match = cookieHeader
    .split(';')
    .map(part => part.trim())
    .find(part => part.startsWith(prefix))
  if (!match) return null
  try {
    return decodeURIComponent(match.slice(prefix.length))
  } catch {
    return null
  }
}

export function clearAuthNextCookieHeader(): {
  name: string
  value: string
  options: { path: string; maxAge: number }
} {
  return {
    name: AUTH_NEXT_COOKIE,
    value: '',
    options: { path: '/', maxAge: 0 },
  }
}
