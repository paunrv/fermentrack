import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { LandingPageShell } from '@/components/proof/landing/LandingPageShell'
import { LegalDocument } from '@/components/proof/landing/LegalDocument'

import { createPublicPageMetadata } from '@/lib/i18n/metadata'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('legal.privacy.meta')
  return createPublicPageMetadata({
    pathname: '/privacidad',
    title: t('title'),
    description: t('description'),
  })
}

export default function PrivacidadPage() {
  return (
    <LandingPageShell>
      <LegalDocument namespace="legal.privacy" />
    </LandingPageShell>
  )
}
