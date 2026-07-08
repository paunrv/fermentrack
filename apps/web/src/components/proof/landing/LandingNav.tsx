'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { LandingLocaleToggle } from './LandingLocaleToggle'
import { ProofLogo } from './ProofLogo'
import { LANDING, landingBtnPrimary, landingBtnLogIn } from './landing-theme'

export function LandingNav() {
  const t = useTranslations('landing.nav')
  const [hasSession, setHasSession] = useState(false)
  const [sessionChecked, setSessionChecked] = useState(false)

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()

    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!cancelled) {
        setHasSession(!!user)
        setSessionChecked(true)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  const navLinkStyle: React.CSSProperties = {
    fontSize: 13,
    color: LANDING.text,
    textDecoration: 'none',
    fontWeight: 500,
  }

  return (
    <header
      className="proof-landing-nav"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: LANDING.bg,
        backdropFilter: 'blur(8px)',
        borderBottom: `1px solid ${LANDING.border}`,
      }}
    >
      <nav
        className="proof-landing-nav__inner"
        style={{
          maxWidth: 1120,
          margin: '0 auto',
          padding: '14px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 24,
          flexWrap: 'wrap',
        }}
      >
        <ProofLogo />

        <div className="proof-landing-nav__links" style={{ display: 'flex', alignItems: 'center', gap: 20, flex: 1 }}>
          <a href="/#productores" style={navLinkStyle}>
            {t('productores')}
          </a>
          <a href="/#bodega" style={navLinkStyle}>
            {t('bodega')}
          </a>
          <a href="/#precios" style={navLinkStyle}>
            {t('precios')}
          </a>
        </div>

        <div className="proof-landing-nav__actions" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <LandingLocaleToggle />

          {sessionChecked && (
            <>
              {hasSession ? (
                <a
                  href="/dashboard"
                  style={{ ...landingBtnPrimary, padding: '8px 14px', fontSize: 12 }}
                >
                  {t('goDashboard')}
                  <span aria-hidden>→</span>
                </a>
              ) : (
                <>
                  <Link href="/sign-in" style={landingBtnLogIn}>
                    {t('logIn')}
                  </Link>
                  <Link
                    href="/sign-in?mode=signup"
                    style={{ ...landingBtnPrimary, padding: '8px 14px', fontSize: 12 }}
                  >
                    {t('startFree')}
                    <span aria-hidden>→</span>
                  </Link>
                </>
              )}
            </>
          )}
        </div>
      </nav>
    </header>
  )
}
