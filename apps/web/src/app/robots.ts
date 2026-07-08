import type { MetadataRoute } from 'next'
import { getSiteUrl } from '@/lib/i18n/site'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard/', '/api/', '/onboarding', '/profile-select', '/sign-in', '/sign-up'],
    },
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  }
}
