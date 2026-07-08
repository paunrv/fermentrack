/** Reject open redirects; allow internal paths with optional query string. */
export function safeNextPath(raw: string | null, fallback = '/dashboard'): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return fallback

  try {
    const url = new URL(raw, 'http://localhost')
    if (!url.pathname.startsWith('/') || url.pathname.startsWith('//')) return fallback
    return `${url.pathname}${url.search}`
  } catch {
    return fallback
  }
}
