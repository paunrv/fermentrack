'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { HeroMockup } from './HeroMockup'
import { LANDING, landingBtnPrimary, landingBtnSecondary } from './landing-theme'

function HighlightText({ text, highlight }: { text: string; highlight: string }) {
  if (!text.includes(highlight)) return <>{text}</>
  const [before, after] = text.split(highlight)
  return (
    <>
      {before}
      <span style={{ color: LANDING.brand }}>{highlight}</span>
      {after}
    </>
  )
}

export function HeroSection() {
  const t = useTranslations('landing.hero')
  const alerts = t.raw('mockup.alerts') as {
    tone: 'warn' | 'info' | 'ok'
    title: string
    meta: string
  }[]

  return (
    <section
      className="proof-landing-hero-section"
      style={{ padding: '80px 24px 96px', maxWidth: 1120, margin: '0 auto' }}
    >
      <div
        className="proof-landing-hero-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 48,
          alignItems: 'center',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                fontWeight: 500,
                color: LANDING.brand,
                letterSpacing: '0.02em',
              }}
            >
              {t('tag')}
            </span>
            <span
              aria-hidden
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: LANDING.brand,
                flexShrink: 0,
                boxShadow: `0 0 0 3px color-mix(in srgb, ${LANDING.brand} 25%, transparent)`,
              }}
            />
          </div>

          <h1
            style={{
              margin: '0 0 20px',
              fontSize: 'clamp(32px, 4vw, 52px)',
              fontWeight: 700,
              letterSpacing: '-0.03em',
              lineHeight: 1.08,
              color: LANDING.text,
            }}
          >
            {t('headlineLine1')}
            <br />
            {t('headlineLine2')}
          </h1>

          <h2
            style={{
              margin: '0 0 16px',
              fontSize: 'clamp(18px, 2.2vw, 24px)',
              fontWeight: 600,
              letterSpacing: '-0.02em',
              lineHeight: 1.35,
              color: LANDING.textSecondary,
            }}
          >
            {t('subtitleLine1')}
            <br />
            <HighlightText text={t('subtitleLine2')} highlight={t('subtitleHighlight')} />
          </h2>

          <p
            style={{
              margin: '0 0 36px',
              fontSize: 13,
              lineHeight: 1.65,
              color: LANDING.textSecondary,
              maxWidth: 520,
            }}
          >
            {t('body')}
          </p>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <a href="#productores" style={landingBtnSecondary}>
              {t('ctaDemo')}
            </a>
            <Link href="/sign-in?mode=signup" style={landingBtnPrimary}>
              {t('ctaStart')}
              <span aria-hidden>→</span>
            </Link>
          </div>
        </div>

        <div className="proof-landing-hero-mockup">
          <HeroMockup
            userLabel={t('mockup.userLabel')}
            liveLabel={t('mockup.liveLabel')}
            alerts={alerts}
          />
        </div>
      </div>
    </section>
  )
}
