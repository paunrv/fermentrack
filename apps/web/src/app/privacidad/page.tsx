import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { LandingPageShell } from '@/components/proof/landing/LandingPageShell'
import { LegalDocument } from '@/components/proof/landing/LegalDocument'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('legal.privacy.meta')
  return {
    title: t('title'),
    description: t('description'),
  }
}

export default function PrivacidadPage() {
  return (
    <LandingPageShell>
      <LegalDocument namespace="legal.privacy" />
    </LandingPageShell>
  )
}
