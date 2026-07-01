'use client'

import { useTranslations } from 'next-intl'
import { LANDING } from './landing-theme'

export function LegalDraftBanner() {
  const t = useTranslations('legal')

  return (
    <div
      role="status"
      style={{
        marginBottom: 40,
        padding: '16px 20px',
        borderRadius: 'var(--radius-card)',
        background: 'rgba(217, 115, 13, 0.12)',
        border: '1px solid rgba(217, 115, 13, 0.35)',
        color: LANDING.text,
        fontSize: 14,
        lineHeight: 1.55,
      }}
    >
      {t('draftBanner')}
    </div>
  )
}
