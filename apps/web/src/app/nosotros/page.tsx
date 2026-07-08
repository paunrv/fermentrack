import type { Metadata } from 'next'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { LandingPageShell } from '@/components/proof/landing/LandingPageShell'
import { LandingEyebrow } from '@/components/proof/landing/LandingEyebrow'
import {
  landingBodyStyle,
  landingSectionH2Style,
} from '@/components/proof/landing/landing-page-styles'
import { LANDING, landingBtnPrimary } from '@/components/proof/landing/landing-theme'

import { createPublicPageMetadata } from '@/lib/i18n/metadata'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('about.meta')
  return createPublicPageMetadata({
    pathname: '/nosotros',
    title: t('title'),
    description: t('description'),
  })
}

export default async function NosotrosPage() {
  const t = await getTranslations('about')

  return (
    <LandingPageShell>
      <section style={{ padding: '80px 24px 64px', maxWidth: 720, margin: '0 auto' }}>
        <LandingEyebrow>{t('hero.eyebrow')}</LandingEyebrow>
        <h1
          style={{
            margin: '0 0 24px',
            fontSize: 'clamp(32px, 4vw, 52px)',
            fontWeight: 700,
            letterSpacing: '-0.03em',
            lineHeight: 1.08,
            color: LANDING.text,
          }}
        >
          {t('hero.titleLine1')}
          <br />
          {t('hero.titleLine2')}
        </h1>
        <p style={{ ...landingBodyStyle, marginBottom: 16 }}>{t('hero.p1')}</p>
        <p style={landingBodyStyle}>{t('hero.p2')}</p>
      </section>

      <section
        style={{
          padding: '80px 24px',
          background: LANDING.bgDark,
          color: LANDING.textOnDark,
        }}
      >
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <LandingEyebrow>{t('insight.eyebrow')}</LandingEyebrow>
          <h2 style={{ ...landingSectionH2Style, color: LANDING.textOnDark }}>{t('insight.title')}</h2>
          <p style={{ ...landingBodyStyle, color: LANDING.textOnDarkMuted, marginBottom: 40 }}>
            {t('insight.body')}
          </p>
          <blockquote
            style={{
              margin: 0,
              padding: '32px 36px',
              borderRadius: 'var(--radius-card)',
              background: 'rgba(255,255,255,0.06)',
              borderLeft: `3px solid ${LANDING.brand}`,
              fontFamily: 'var(--font-voice)',
              fontSize: 'clamp(20px, 2.5vw, 26px)',
              fontStyle: 'italic',
              lineHeight: 1.45,
              color: LANDING.textOnDark,
              letterSpacing: '-0.01em',
            }}
          >
            {t('insight.quote')}
          </blockquote>
        </div>
      </section>

      <section style={{ padding: '80px 24px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <LandingEyebrow>{t('beliefs.eyebrow')}</LandingEyebrow>
          <h2 style={landingSectionH2Style}>{t('beliefs.title')}</h2>
          <p style={landingBodyStyle}>{t('beliefs.body')}</p>
        </div>
      </section>

      <section
        style={{
          padding: '80px 24px',
          background: LANDING.bgDark,
          color: LANDING.textOnDark,
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <h2
            style={{
              margin: '0 0 32px',
              fontSize: 'clamp(28px, 4vw, 40px)',
              fontWeight: 700,
              letterSpacing: '-0.02em',
            }}
          >
            {t('cta.title')}
          </h2>
          <Link href="/sign-in?mode=signup" style={landingBtnPrimary}>
            {t('cta.button')}
            <span aria-hidden>→</span>
          </Link>
        </div>
      </section>
    </LandingPageShell>
  )
}
