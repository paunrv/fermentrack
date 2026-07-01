import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { ProofLanding } from '@/components/proof/landing/ProofLanding'
import { createPublicPageMetadata } from '@/lib/i18n/metadata'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('landing.meta')
  return createPublicPageMetadata({
    pathname: '/',
    title: t('title'),
    description: t('description'),
  })
}

export default function HomePage() {
  return <ProofLanding />
}
