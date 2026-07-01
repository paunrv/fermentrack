'use client'

import { useLocale } from 'next-intl'
import { useRouter, usePathname } from '@/i18n/navigation'
import { LOCALES, type AppLocale } from '@/i18n/routing'
import { LANDING } from './landing-theme'

const SHORT: Record<AppLocale, string> = {
  'es-MX': 'ES',
  'en-US': 'EN',
}

type Variant = 'light' | 'dark'

export function LandingLocaleToggle({ variant = 'light' }: { variant?: Variant }) {
  const locale = useLocale() as AppLocale
  const router = useRouter()
  const pathname = usePathname()
  const isDark = variant === 'dark'

  return (
    <div
      style={{
        display: 'inline-flex',
        border: isDark ? '1px solid rgba(255,255,255,0.2)' : `1px solid ${LANDING.border}`,
        borderRadius: 'var(--radius-sm)',
        overflow: 'hidden',
      }}
    >
      {LOCALES.map(code => {
        const active = locale === code
        return (
          <button
            key={code}
            type="button"
            onClick={() => router.replace(pathname, { locale: code })}
            aria-pressed={active}
            aria-label={code}
            style={{
              padding: '4px 8px',
              border: 'none',
              background: active
                ? isDark
                  ? 'rgba(255,255,255,0.12)'
                  : LANDING.bgDark
                : 'transparent',
              color: active
                ? isDark
                  ? LANDING.textOnDark
                  : LANDING.textOnDark
                : isDark
                  ? LANDING.textOnDarkMuted
                  : LANDING.textSecondary,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            {SHORT[code]}
          </button>
        )
      })}
    </div>
  )
}
