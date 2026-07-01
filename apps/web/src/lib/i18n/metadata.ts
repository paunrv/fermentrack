import type { Metadata } from 'next'
import { LOCALES } from '@/i18n/routing'
import { getSiteUrl } from '@/lib/i18n/site'

/** Public routes share one URL per path; locale is negotiated via cookie / Accept-Language. */
export function createPublicPageMetadata(opts: {
  pathname: string
  title: string
  description: string
}): Metadata {
  const base = getSiteUrl()
  const path = opts.pathname === '/' ? '' : opts.pathname
  const canonical = `${base}${path}`

  const languages: Record<string, string> = { 'x-default': canonical }
  for (const locale of LOCALES) {
    languages[locale] = canonical
  }

  return {
    title: opts.title,
    description: opts.description,
    alternates: {
      canonical,
      languages,
    },
    openGraph: {
      title: opts.title,
      description: opts.description,
      url: canonical,
      siteName: 'PROOF',
      type: 'website',
    },
  }
}
