'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { translateAuthError } from '@/lib/i18n/auth-errors'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )
}

function SignInFormInner() {
  const t = useTranslations('auth.signIn')
  const tErrors = useTranslations('auth.errors')
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/dashboard'
  const authError = searchParams.get('error') === 'auth'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState<'google' | 'email' | null>(null)
  const [error, setError] = useState<string | null>(
    authError ? tErrors('authCallback') : null
  )

  const handleGoogleLogin = async () => {
    setLoading('google')
    setError(null)

    try {
      const supabase = createClient()
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      })

      if (oauthError) {
        console.error(oauthError)
        setError(translateAuthError(oauthError.message, key => tErrors(key)))
        setLoading(null)
        return
      }

      if (data?.url) {
        window.location.assign(data.url)
        return
      }

      setError(tErrors('googleFailed'))
      setLoading(null)
    } catch (err) {
      console.error(err)
      const message =
        err instanceof Error ? err.message : tErrors('googleUnexpected')
      setError(message)
      setLoading(null)
    }
  }

  async function signInWithEmail(e: React.FormEvent) {
    e.preventDefault()
    setLoading('email')
    setError(null)

    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (signInError) {
      setError(translateAuthError(signInError.message, key => tErrors(key)))
      setLoading(null)
      return
    }

    window.location.assign(next)
  }

  const disabled = loading !== null

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 400,
        padding: '32px 28px',
        background: 'var(--panel)',
        border: '1px solid var(--hairline)',
        borderRadius: 'var(--radius-card)',
        boxShadow: 'var(--shadow-md)',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div className="eyebrow" style={{ color: 'var(--copper)', marginBottom: 10 }}>
          {t('eyebrow')}
        </div>
        <h1
          style={{
            margin: 0,
            fontSize: 32,
            fontWeight: 700,
            letterSpacing: '0.06em',
            color: 'var(--fg-0)',
          }}
        >
          PR<span style={{ color: 'var(--copper)' }}>O</span>OF
        </h1>
        <p style={{ margin: '10px 0 0', fontSize: 13, color: 'var(--fg-2)' }}>{t('subtitle')}</p>
      </div>

      {error ? (
        <div
          role="alert"
          style={{
            marginBottom: 16,
            padding: '10px 12px',
            fontSize: 12,
            color: 'var(--crit)',
            background: 'var(--crit-soft)',
            border: '1px solid color-mix(in srgb, var(--crit) 25%, transparent)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          {error}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => void handleGoogleLogin()}
        disabled={disabled}
        style={{
          width: '100%',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          padding: '11px 16px',
          background: '#fff',
          border: '1px solid var(--line)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--fg-0)',
          fontSize: 13,
          fontWeight: 500,
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled && loading !== 'google' ? 0.6 : 1,
        }}
      >
        <GoogleIcon />
        {loading === 'google' ? t('googleLoading') : t('google')}
      </button>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          margin: '22px 0',
          color: 'var(--fg-4)',
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}
      >
        <span style={{ flex: 1, height: 1, background: 'var(--hairline)' }} />
        {t('divider')}
        <span style={{ flex: 1, height: 1, background: 'var(--hairline)' }} />
      </div>

      <form onSubmit={e => void signInWithEmail(e)} style={{ display: 'grid', gap: 12 }}>
        <label style={{ display: 'grid', gap: 6 }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--fg-2)',
            }}
          >
            {t('email')}
          </span>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            disabled={disabled}
            style={{
              width: '100%',
              padding: '10px 12px',
              background: '#fff',
              border: '1px solid var(--hairline)',
              borderRadius: 'var(--radius-sm)',
              fontSize: 13,
              color: 'var(--fg-0)',
              outline: 'none',
            }}
          />
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--fg-2)',
            }}
          >
            {t('password')}
          </span>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
            disabled={disabled}
            style={{
              width: '100%',
              padding: '10px 12px',
              background: '#fff',
              border: '1px solid var(--hairline)',
              borderRadius: 'var(--radius-sm)',
              fontSize: 13,
              color: 'var(--fg-0)',
              outline: 'none',
            }}
          />
        </label>

        <button
          type="submit"
          disabled={disabled}
          style={{
            marginTop: 4,
            width: '100%',
            padding: '11px 16px',
            background: 'var(--copper)',
            border: '1px solid var(--copper)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--ink)',
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled && loading !== 'email' ? 0.6 : 1,
          }}
        >
          {loading === 'email' ? t('submitting') : t('submit')}
        </button>
      </form>

      <p
        style={{
          margin: '20px 0 0',
          textAlign: 'center',
          fontSize: 12,
          color: 'var(--fg-3)',
        }}
      >
        {t('noAccount')}{' '}
        <Link href="/sign-up" style={{ color: 'var(--copper)', textDecoration: 'none' }}>
          {t('signUp')}
        </Link>
      </p>
    </div>
  )
}

export function SignInForm() {
  const t = useTranslations('auth.signIn')

  return (
    <Suspense fallback={<div style={{ color: 'var(--fg-3)', fontSize: 13 }}>{t('loading')}</div>}>
      <SignInFormInner />
    </Suspense>
  )
}
