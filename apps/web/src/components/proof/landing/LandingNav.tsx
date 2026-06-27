'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { type LandingLang } from '@/lib/proof/landing-copy'
import { useLandingLanguage } from './LandingLanguageContext'
import { ProofLogo } from './ProofLogo'
import { LANDING, landingBtnPrimary, landingBtnLogIn } from './landing-theme'

function LangToggle({
  langs,
  current,
  onChange,
}: {
  langs: LandingLang[]
  current: LandingLang
  onChange: (lang: LandingLang) => void
}) {
  return (
    <div
      style={{
        display: 'inline-flex',
        border: `1px solid ${LANDING.border}`,
        borderRadius: 'var(--radius-sm)',
        overflow: 'hidden',
      }}
    >
      {langs.map(code => (
        <button
          key={code}
          type="button"
          onClick={() => onChange(code)}
          aria-pressed={current === code}
          style={{
            padding: '4px 8px',
            border: 'none',
            background: current === code ? LANDING.bgDark : 'transparent',
            color: current === code ? LANDING.textOnDark : LANDING.textSecondary,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >
          {code}
        </button>
      ))}
    </div>
  )
}

export function LandingNav() {
  const { lang, setLang, copy } = useLandingLanguage()
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

        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flex: 1 }}>
          <a href="#productores" style={navLinkStyle}>
            {copy.nav.productores}
          </a>
          <a href="#distribuidores" style={navLinkStyle}>
            {copy.nav.distribuidores}
          </a>
          <a href="#precios" style={navLinkStyle}>
            {copy.nav.precios}
          </a>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <LangToggle langs={['es', 'en']} current={lang} onChange={setLang} />

          {sessionChecked && (
            <>
              {hasSession ? (
                <Link href="/dashboard" style={{ ...landingBtnPrimary, padding: '8px 14px', fontSize: 12 }}>
                  {copy.nav.goDashboard}
                  <span aria-hidden>→</span>
                </Link>
              ) : (
                <>
                  <Link href="/sign-in" style={landingBtnLogIn}>
                    {copy.nav.logIn}
                  </Link>
                  <Link
                    href="/sign-in?mode=signup"
                    style={{ ...landingBtnPrimary, padding: '8px 14px', fontSize: 12 }}
                  >
                    {copy.nav.startFree}
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
