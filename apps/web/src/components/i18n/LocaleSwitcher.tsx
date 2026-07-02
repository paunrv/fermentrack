'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useRouter, usePathname } from '@/i18n/navigation'
import { LOCALES, type AppLocale } from '@/i18n/routing'

type Props = {
  className?: string
}

export function LocaleSwitcher({ className }: Props) {
  const t = useTranslations('common.localeSwitcher')
  const locale = useLocale() as AppLocale
  const router = useRouter()
  const pathname = usePathname()

  return (
    <label className={className} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 13, color: 'var(--text-secondary, #666)' }}>{t('label')}</span>
      <select
        value={locale}
        aria-label={t('label')}
        onChange={e => {
          const next = e.target.value as AppLocale
          const maxAge = 60 * 60 * 24 * 365
          document.cookie = `NEXT_LOCALE=${next}; path=/; max-age=${maxAge}; SameSite=Lax`
          router.replace(pathname, { locale: next })
          router.refresh()
        }}
        style={{
          fontSize: 13,
          padding: '4px 8px',
          borderRadius: 6,
          border: '1px solid var(--border, #ddd)',
        }}
      >
        {LOCALES.map(code => (
          <option key={code} value={code}>
            {t(code)}
          </option>
        ))}
      </select>
    </label>
  )
}
