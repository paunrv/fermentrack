'use client'

import type { CSSProperties } from 'react'
import { useLocale } from 'next-intl'
import { useRouter, usePathname } from '@/i18n/navigation'
import { LOCALES, type AppLocale } from '@/i18n/routing'
import { LANDING } from '@/components/proof/landing/landing-theme'

const SHORT: Record<AppLocale, string> = {
  'es-MX': 'ES',
  'en-US': 'EN',
}

export type LocaleToggleVariant = 'landing-light' | 'landing-dark' | 'dashboard'

function shellStyle(variant: LocaleToggleVariant): CSSProperties {
  if (variant === 'dashboard') {
    return { border: '0.5px solid var(--hairline)', borderRadius: 'var(--radius-sm)' }
  }
  const isDark = variant === 'landing-dark'
  return {
    border: isDark ? '1px solid rgba(255,255,255,0.2)' : `1px solid ${LANDING.border}`,
    borderRadius: 'var(--radius-sm)',
  }
}

function buttonStyle(variant: LocaleToggleVariant, active: boolean): CSSProperties {
  if (variant === 'dashboard') {
    return {
      padding: '4px 8px',
      border: 'none',
      background: active ? 'var(--hover)' : 'transparent',
      color: active ? 'var(--fg-0)' : 'var(--fg-3)',
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
      cursor: 'pointer',
    }
  }

  const isDark = variant === 'landing-dark'
  return {
    padding: '4px 8px',
    border: 'none',
    background: active
      ? isDark
        ? 'rgba(255,255,255,0.12)'
        : LANDING.bgDark
      : 'transparent',
    color: active
      ? LANDING.textOnDark
      : isDark
        ? LANDING.textOnDarkMuted
        : LANDING.textSecondary,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    cursor: 'pointer',
  }
}

function setLocaleCookie(code: AppLocale) {
  const maxAge = 60 * 60 * 24 * 365
  document.cookie = `NEXT_LOCALE=${code}; path=/; max-age=${maxAge}; SameSite=Lax`
}

type Props = {
  variant?: LocaleToggleVariant
}

export function LocaleToggle({ variant = 'landing-light' }: Props) {
  const locale = useLocale() as AppLocale
  const router = useRouter()
  const pathname = usePathname()

  return (
    <div
      style={{
        display: 'inline-flex',
        overflow: 'hidden',
        ...shellStyle(variant),
      }}
    >
      {LOCALES.map(code => {
        const active = locale === code
        return (
          <button
            key={code}
            type="button"
            onClick={() => {
              if (active) return
              setLocaleCookie(code)
              router.replace(pathname, { locale: code })
              router.refresh()
            }}
            aria-pressed={active}
            aria-label={code}
            style={buttonStyle(variant, active)}
          >
            {SHORT[code]}
          </button>
        )
      })}
    </div>
  )
}
