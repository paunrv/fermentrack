'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, type CSSProperties, type FormEvent } from 'react'
import { useTranslations } from 'next-intl'
import { LandingNav } from './LandingNav'
import { ProducerTabsSection } from './ProducerTabsSection'
import { HeroSection } from './HeroSection'
import { LANDING, landingBtnPrimary, landingBtnSecondary } from './landing-theme'
import { LandingFooter } from './LandingFooter'

function FinalCtaForm() {
  const router = useRouter()
  const t = useTranslations('landing.finalCta')
  const [email, setEmail] = useState('')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const q = email.trim() ? `?mode=signup&email=${encodeURIComponent(email.trim())}` : '?mode=signup'
    router.push(`/sign-in${q}`)
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        justifyContent: 'center',
        maxWidth: 480,
        margin: '0 auto',
      }}
    >
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder={t('inputPlaceholder')}
        aria-label={t('inputPlaceholder')}
        style={{
          flex: '1 1 220px',
          minWidth: 0,
          padding: '12px 16px',
          background: 'transparent',
          border: '1px solid rgba(255,255,255,0.35)',
          borderRadius: 'var(--radius-sm)',
          color: LANDING.textOnDark,
          fontSize: 14,
          outline: 'none',
        }}
      />
      <button
        type="submit"
        style={{
          padding: '12px 24px',
          background: LANDING.bg,
          color: LANDING.text,
          border: 'none',
          borderRadius: 'var(--radius-sm)',
          fontSize: 14,
          fontWeight: 700,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        {t('cta')}
      </button>
    </form>
  )
}

export function ProofLanding() {
  const tContrast = useTranslations('landing.contrast')
  const tDist = useTranslations('landing.distribuidores')
  const tUpload = useTranslations('landing.upload')
  const tPricing = useTranslations('landing.pricing')
  const tFinal = useTranslations('landing.finalCta')

  const contrastCards = tContrast.raw('cards') as { title: string; body: string }[]
  const distBullets = tDist.raw('bullets') as string[]
  const uploadItems = tUpload.raw('items') as string[]
  const plans = tPricing.raw('plans') as {
    name: string
    price: string
    period: string
    description: string
    features: string[]
    cta: string
    highlighted?: boolean
  }[]

  return (
    <div
      style={
        {
          minHeight: '100vh',
          background: LANDING.bg,
          color: LANDING.text,
          ['--proof-brand']: LANDING.brand,
        } as CSSProperties
      }
    >
      <LandingNav />
      <HeroSection />

      <section style={{ background: LANDING.bgDark, color: LANDING.textOnDark, padding: '80px 24px' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto' }}>
          <h2
            style={{
              margin: '0 0 12px',
              fontSize: 'clamp(26px, 3.5vw, 36px)',
              fontWeight: 700,
              letterSpacing: '-0.02em',
            }}
          >
            {tContrast('title')}
          </h2>
          <p style={{ margin: '0 0 48px', fontSize: 16, color: LANDING.textOnDarkMuted, maxWidth: 560 }}>
            {tContrast('subtitle')}
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 20,
            }}
          >
            {contrastCards.map(card => (
              <div
                key={card.title}
                style={{
                  padding: 28,
                  borderRadius: 'var(--radius-card)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.04)',
                }}
              >
                <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700 }}>{card.title}</h3>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: LANDING.textOnDarkMuted }}>
                  {card.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div id="productores">
        <ProducerTabsSection />
      </div>

      <section id="distribuidores" style={{ background: LANDING.bgDark, color: LANDING.textOnDark, padding: '80px 24px' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto' }}>
          <div
            style={{
              marginBottom: 12,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: LANDING.textOnDarkMuted,
            }}
          >
            {tDist('eyebrow')}
          </div>
          <h2
            style={{
              margin: '0 0 12px',
              fontSize: 'clamp(26px, 3.5vw, 36px)',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              maxWidth: 640,
            }}
          >
            {tDist('title')}
          </h2>
          <p style={{ margin: '0 0 40px', fontSize: 16, color: LANDING.textOnDarkMuted, maxWidth: 560 }}>
            {tDist('subtitle')}
          </p>
          <ul
            style={{
              margin: 0,
              padding: 0,
              listStyle: 'none',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 20,
            }}
          >
            {distBullets.map(bullet => (
              <li
                key={bullet}
                style={{
                  padding: 20,
                  borderRadius: 'var(--radius-card)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.04)',
                  fontSize: 14,
                  lineHeight: 1.55,
                  color: LANDING.textOnDark,
                }}
              >
                {bullet}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section style={{ padding: '80px 24px', background: LANDING.bg }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', textAlign: 'center' }}>
          <div
            style={{
              marginBottom: 12,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: LANDING.textSecondary,
            }}
          >
            {tUpload('eyebrow')}
          </div>
          <h2
            style={{
              margin: '0 0 12px',
              fontSize: 'clamp(26px, 3.5vw, 36px)',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              color: LANDING.text,
            }}
          >
            {tUpload('title')}
          </h2>
          <p style={{ margin: '0 auto 48px', fontSize: 16, color: LANDING.textSecondary, maxWidth: 520 }}>
            {tUpload('subtitle')}
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 16,
              textAlign: 'left',
            }}
          >
            {uploadItems.map(item => (
              <div
                key={item}
                style={{
                  padding: 20,
                  borderRadius: 'var(--radius-card)',
                  border: `1px solid ${LANDING.border}`,
                  background: LANDING.bg,
                  fontSize: 14,
                  fontWeight: 500,
                  color: LANDING.text,
                }}
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="precios" style={{ padding: '80px 24px', background: LANDING.bg, borderTop: `1px solid ${LANDING.border}` }}>
        <div style={{ maxWidth: 1120, margin: '0 auto' }}>
          <div
            style={{
              marginBottom: 12,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: LANDING.textSecondary,
            }}
          >
            {tPricing('eyebrow')}
          </div>
          <h2
            style={{
              margin: '0 0 48px',
              fontSize: 'clamp(26px, 3.5vw, 36px)',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              color: LANDING.text,
            }}
          >
            {tPricing('title')}
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 20,
              alignItems: 'stretch',
            }}
          >
            {plans.map(plan => (
              <div
                key={plan.name}
                style={{
                  padding: 28,
                  borderRadius: 'var(--radius-card)',
                  border: plan.highlighted
                    ? `2px solid ${LANDING.bgDark}`
                    : `1px solid ${LANDING.border}`,
                  background: LANDING.bg,
                  boxShadow: plan.highlighted ? '0 4px 16px rgba(15,15,15,0.08)' : 'none',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: LANDING.textSecondary, marginBottom: 8 }}>
                  {plan.name}
                </div>
                <div style={{ marginBottom: 8 }}>
                  <span
                    style={{
                      fontSize: 36,
                      fontWeight: 700,
                      color: LANDING.text,
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span style={{ fontSize: 14, color: LANDING.textSecondary }}>{plan.period}</span>
                  )}
                </div>
                <p style={{ margin: '0 0 20px', fontSize: 13, color: LANDING.textSecondary }}>
                  {plan.description}
                </p>
                <ul
                  style={{
                    margin: '0 0 24px',
                    padding: 0,
                    listStyle: 'none',
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  {plan.features.map(f => (
                    <li key={f} style={{ fontSize: 13, color: LANDING.text }}>
                      ✓ {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={
                    plan.price === 'Custom' || plan.price === 'Sur mesure'
                      ? 'mailto:hello@proof.app'
                      : '/sign-in?mode=signup'
                  }
                  style={
                    plan.highlighted
                      ? { ...landingBtnPrimary, justifyContent: 'center', width: '100%' }
                      : { ...landingBtnSecondary, justifyContent: 'center', width: '100%' }
                  }
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: '80px 24px', background: LANDING.bgDark, color: LANDING.textOnDark, textAlign: 'center' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <h2
            style={{
              margin: '0 0 12px',
              fontSize: 'clamp(28px, 4vw, 40px)',
              fontWeight: 700,
              letterSpacing: '-0.02em',
            }}
          >
            {tFinal('title')}
          </h2>
          <p style={{ margin: '0 0 32px', fontSize: 16, color: LANDING.textOnDarkMuted }}>
            {tFinal('subtitle')}
          </p>
          <FinalCtaForm />
        </div>
      </section>

      <LandingFooter />
    </div>
  )
}
