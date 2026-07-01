import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { LandingPageShell } from '@/components/proof/landing/LandingPageShell'
import { ContactForm } from '@/components/proof/landing/ContactForm'
import { LandingEyebrow } from '@/components/proof/landing/LandingEyebrow'
import { landingBodyStyle } from '@/components/proof/landing/landing-page-styles'
import { LANDING } from '@/components/proof/landing/landing-theme'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('contact.meta')
  return {
    title: t('title'),
    description: t('description'),
  }
}

export default async function ContactoPage() {
  const t = await getTranslations('contact')

  return (
    <LandingPageShell>
      <section style={{ padding: '80px 24px 96px' }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <LandingEyebrow>{t('eyebrow')}</LandingEyebrow>
          <h1
            style={{
              margin: '0 0 20px',
              fontSize: 'clamp(32px, 4vw, 48px)',
              fontWeight: 700,
              letterSpacing: '-0.03em',
              lineHeight: 1.1,
              color: LANDING.text,
            }}
          >
            {t('title')}
          </h1>
          <p style={{ ...landingBodyStyle, marginBottom: 48 }}>{t('subtitle')}</p>

          <ContactForm />

          <p style={{ margin: '40px 0 0', fontSize: 14, color: LANDING.textSecondary, lineHeight: 1.6 }}>
            {t('emailHint')}{' '}
            <a
              href="mailto:hola@proof.app"
              style={{ color: LANDING.brand, fontWeight: 600, textDecoration: 'none' }}
            >
              hola@proof.app
            </a>
          </p>
        </div>
      </section>
    </LandingPageShell>
  )
}
