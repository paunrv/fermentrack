'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, type CSSProperties, type FormEvent } from 'react'
import { LandingLanguageProvider, useLandingLanguage } from './LandingLanguageContext'
import { LandingNav } from './LandingNav'
import { ProducerTabsSection } from './ProducerTabsSection'
import { HeroSection } from './HeroSection'
import { type LandingLang } from '@/lib/proof/landing-copy'
import { LANDING, landingBtnPrimary, landingBtnSecondary } from './landing-theme'
import { ProofLogoWordmark } from './ProofLogo'

function LangToggleFooter({
  langs,
  current,
  onChange,
}: {
  langs: LandingLang[]
  current: LandingLang
  onChange: (lang: LandingLang) => void
}) {
  return (
    <div style={{ display: 'inline-flex', gap: 4 }}>
      {langs.map(code => (
        <button
          key={code}
          type="button"
          onClick={() => onChange(code)}
          aria-pressed={current === code}
          style={{
            padding: '4px 8px',
            border: 'none',
            background: current === code ? 'rgba(255,255,255,0.12)' : 'transparent',
            color: current === code ? LANDING.textOnDark : LANDING.textOnDarkMuted,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
          }}
        >
          {code}
        </button>
      ))}
    </div>
  )
}

function FinalCtaForm() {
  const router = useRouter()
  const { copy } = useLandingLanguage()
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
        placeholder={copy.finalCta.inputPlaceholder}
        aria-label={copy.finalCta.inputPlaceholder}
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
        {copy.finalCta.cta}
      </button>
    </form>
  )
}

function ProofLandingContent() {
  const { lang, setLang, copy } = useLandingLanguage()

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

      {/* Dark contrast section */}
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
            {copy.contrast.title}
          </h2>
          <p style={{ margin: '0 0 48px', fontSize: 16, color: LANDING.textOnDarkMuted, maxWidth: 560 }}>
            {copy.contrast.subtitle}
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 20,
            }}
          >
            {copy.contrast.cards.map(card => (
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

      {/* Distributors — dark */}
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
            {copy.distribuidores.eyebrow}
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
            {copy.distribuidores.title}
          </h2>
          <p style={{ margin: '0 0 40px', fontSize: 16, color: LANDING.textOnDarkMuted, maxWidth: 560 }}>
            {copy.distribuidores.subtitle}
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
            {copy.distribuidores.bullets.map(bullet => (
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

      {/* Upload anything */}
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
            {copy.upload.eyebrow}
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
            {copy.upload.title}
          </h2>
          <p style={{ margin: '0 auto 48px', fontSize: 16, color: LANDING.textSecondary, maxWidth: 520 }}>
            {copy.upload.subtitle}
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 16,
              textAlign: 'left',
            }}
          >
            {copy.upload.items.map(item => (
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

      {/* Pricing */}
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
            {copy.pricing.eyebrow}
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
            {copy.pricing.title}
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 20,
              alignItems: 'stretch',
            }}
          >
            {copy.pricing.plans.map(plan => (
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

      {/* Final CTA */}
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
            {copy.finalCta.title}
          </h2>
          <p style={{ margin: '0 0 32px', fontSize: 16, color: LANDING.textOnDarkMuted }}>
            {copy.finalCta.subtitle}
          </p>
          <FinalCtaForm />
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: LANDING.bgDark, color: LANDING.textOnDark, padding: '48px 24px 32px' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              flexWrap: 'wrap',
              gap: 32,
              marginBottom: 40,
            }}
          >
            <div>
              <ProofLogoWordmark variant="dark" />
              <p style={{ margin: '12px 0 0', fontSize: 13, color: LANDING.textOnDarkMuted, maxWidth: 280 }}>
                {copy.footer.tagline}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap' }}>
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: LANDING.textOnDarkMuted,
                    marginBottom: 12,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  {copy.footer.product}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                  <a href="#productores" style={{ color: LANDING.footerLink, textDecoration: 'none' }}>
                    {copy.nav.productores}
                  </a>
                  <a href="#distribuidores" style={{ color: LANDING.footerLink, textDecoration: 'none' }}>
                    {copy.nav.distribuidores}
                  </a>
                  <a href="#precios" style={{ color: LANDING.footerLink, textDecoration: 'none' }}>
                    {copy.nav.precios}
                  </a>
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: LANDING.textOnDarkMuted,
                    marginBottom: 12,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  {copy.footer.company}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                  <span style={{ color: LANDING.footerLink }}>About</span>
                  <span style={{ color: LANDING.footerLink }}>Contact</span>
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: LANDING.textOnDarkMuted,
                    marginBottom: 12,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  {copy.footer.legal}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                  <span style={{ color: LANDING.footerLink }}>Privacy</span>
                  <span style={{ color: LANDING.footerLink }}>Terms</span>
                </div>
              </div>
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 16,
              paddingTop: 24,
              borderTop: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <span style={{ fontSize: 12, color: LANDING.textOnDarkMuted }}>{copy.footer.copyright}</span>
            <LangToggleFooter langs={['es', 'en', 'fr', 'it']} current={lang} onChange={setLang} />
          </div>
        </div>
      </footer>
    </div>
  )
}

export function ProofLanding() {
  return (
    <LandingLanguageProvider>
      <ProofLandingContent />
    </LandingLanguageProvider>
  )
}
