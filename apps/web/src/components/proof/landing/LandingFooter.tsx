'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { LandingLocaleToggle } from './LandingLocaleToggle'
import { LANDING } from './landing-theme'
import { ProofLogoWordmark } from './ProofLogo'

const footerLinkStyle: React.CSSProperties = {
  color: LANDING.footerLink,
  textDecoration: 'none',
}

export function LandingFooter() {
  const tNav = useTranslations('landing.nav')
  const tFooter = useTranslations('landing.footer')

  return (
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
              {tFooter('tagline')}
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
                {tFooter('product')}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                <a href="/#productores" style={footerLinkStyle}>
                  {tNav('productores')}
                </a>
                <a href="/#bodega" style={footerLinkStyle}>
                  {tNav('bodega')}
                </a>
                <a href="/#precios" style={footerLinkStyle}>
                  {tNav('precios')}
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
                {tFooter('company')}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                <Link href="/nosotros" style={footerLinkStyle}>
                  {tFooter('about')}
                </Link>
                <Link href="/contacto" style={footerLinkStyle}>
                  {tFooter('contact')}
                </Link>
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
                {tFooter('legal')}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                <Link href="/privacidad" style={footerLinkStyle}>
                  {tFooter('privacy')}
                </Link>
                <Link href="/terminos" style={footerLinkStyle}>
                  {tFooter('terms')}
                </Link>
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
          <span style={{ fontSize: 12, color: LANDING.textOnDarkMuted }}>{tFooter('copyright')}</span>
          <LandingLocaleToggle variant="dark" />
        </div>
      </div>
    </footer>
  )
}
