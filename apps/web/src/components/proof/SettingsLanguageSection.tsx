'use client'

import { useTranslations } from 'next-intl'
import { LocaleToggle } from '@/components/i18n/LocaleToggle'

export function SettingsLanguageSection() {
  const t = useTranslations('dashboard.settings.language')

  return (
    <section
      style={{
        border: '1px solid var(--hairline)',
        padding: 24,
        marginBottom: 24,
        background: '#fff',
        maxWidth: 800,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: '.1em',
          textTransform: 'uppercase',
          marginBottom: 4,
        }}
      >
        {t('title')}
      </div>
      <p style={{ margin: '0 0 16px', fontSize: 12, color: '#888', lineHeight: 1.45 }}>{t('description')}</p>
      <LocaleToggle variant="dashboard" />
    </section>
  )
}
