import type { Metadata } from 'next'
import { LOCALES } from '@/i18n/routing'
import { getSiteUrl } from '@/lib/i18n/site'

type PublicPageMetadataOptions = {
  pathname: string
  title: string
  description: string
  /** Home and other pages that need the full `<title>` without the layout template. */
  absoluteTitle?: boolean
  noIndex?: boolean
}

/** Public routes share one URL per path; locale is negotiated via cookie / Accept-Language. */
export function createPublicPageMetadata(opts: PublicPageMetadataOptions): Metadata {
  const base = getSiteUrl()
  const path = opts.pathname === '/' ? '' : opts.pathname
  const canonical = `${base}${path}`

  const languages: Record<string, string> = { 'x-default': canonical }
  for (const locale of LOCALES) {
    languages[locale] = canonical
  }

  const title = opts.absoluteTitle ? { absolute: opts.title } : opts.title

  return {
    title,
    description: opts.description,
    alternates: {
      canonical,
      languages,
    },
    robots: opts.noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true },
    openGraph: {
      title: opts.title,
      description: opts.description,
      url: canonical,
      siteName: 'PROOF',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: opts.title,
      description: opts.description,
    },
  }
}
