/** Canonical site origin for metadata, sitemap and Open Graph. */
export function getSiteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  return raw.replace(/\/$/, '')
}

function protocolFromRequestUrl(requestUrl: string): string {
  try {
    return new URL(requestUrl).protocol.replace(':', '') || 'http'
  } catch {
    return 'http'
  }
}

/** Prefer the incoming Host in development (phone on LAN IP, etc.). */
export function resolveSiteUrl(request?: Request | null): string {
  if (!request || process.env.NODE_ENV !== 'development') return getSiteUrl()

  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host')
  if (!host) return getSiteUrl()

  const proto =
    request.headers.get('x-forwarded-proto') ??
    protocolFromRequestUrl(request.url)

  return `${proto}://${host}`.replace(/\/$/, '')
}

/** Client-side origin for auth redirects (browser tab host). */
export function getBrowserSiteUrl(): string {
  if (typeof window !== 'undefined' && window.location.origin) {
    return window.location.origin.replace(/\/$/, '')
  }
  return getSiteUrl()
}
