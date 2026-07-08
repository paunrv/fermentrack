import type { MetadataRoute } from 'next'
import { getSiteUrl } from '@/lib/i18n/site'

const PUBLIC_PATHS: { path: string; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']; priority: number }[] = [
  { path: '/', changeFrequency: 'weekly', priority: 1 },
  { path: '/nosotros', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/contacto', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/terminos', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/privacidad', changeFrequency: 'yearly', priority: 0.3 },
]

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl()
  const lastModified = new Date()

  return PUBLIC_PATHS.map(({ path, changeFrequency, priority }) => ({
    url: `${base}${path === '/' ? '' : path}`,
    lastModified,
    changeFrequency,
    priority,
  }))
}
