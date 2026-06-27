'use client'

import Link from 'next/link'
import { useLandingLanguage } from './LandingLanguageContext'
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
  const { copy } = useLandingLanguage()

  return (
    <section style={{ padding: '80px 24px 96px', maxWidth: 1120, margin: '0 auto' }}>
      <div
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
              {copy.hero.tag}
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
            {copy.hero.headlineLine1}
            <br />
            {copy.hero.headlineLine2}
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
            {copy.hero.subtitleLine1}
            <br />
            <HighlightText text={copy.hero.subtitleLine2} highlight={copy.hero.subtitleHighlight} />
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
            {copy.hero.body}
          </p>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <a href="#demo" style={landingBtnSecondary}>
              {copy.hero.ctaDemo}
            </a>
            <Link href="/sign-in?mode=signup" style={landingBtnPrimary}>
              {copy.hero.ctaStart}
              <span aria-hidden>→</span>
            </Link>
          </div>
        </div>

        <HeroMockup
          userLabel={copy.hero.mockup.userLabel}
          liveLabel={copy.hero.mockup.liveLabel}
          alerts={copy.hero.mockup.alerts}
        />
      </div>
    </section>
  )
}
