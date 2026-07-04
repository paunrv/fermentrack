'use client'

export const dynamic = 'force-dynamic'

import { useTranslations } from 'next-intl'
import { WinemakerBodegaInventory } from '@/components/proof/WinemakerBodegaInventory'
import { orgHasFeature } from '@/lib/proof/org-features'
import { useWinemakerRouteGuard } from '@/hooks/useWinemakerRouteGuard'

export default function WinemakerBodegaPage() {
  const t = useTranslations('winemaker.bodega')
  const tCommon = useTranslations('winemaker.common')
  const { loading, ok, organizationId, activeOrg, canWrite } = useWinemakerRouteGuard()

  if (loading || !ok) {
    return (
      <div style={{ padding: '24px 16px', color: 'var(--fg-2)', fontSize: 14 }}>
        {tCommon('loading')}
      </div>
    )
  }

  if (!organizationId) {
    return (
      <div style={{ padding: '24px 16px', color: 'var(--fg-2)', fontSize: 14 }}>
        {t('errors.noOrganization')}
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: '100%',
        padding: '16px 16px calc(24px + var(--proof-bottom-nav, 0px))',
        maxWidth: 960,
        margin: '0 auto',
      }}
    >
      <header style={{ marginBottom: 20 }}>
        <h1
          style={{
            margin: '0 0 6px',
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: '-0.02em',
          }}
        >
          {t('title')}
        </h1>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--fg-2)' }}>{t('subtitle')}</p>
      </header>

      <WinemakerBodegaInventory
        organizationId={organizationId}
        numeracionEnabled={orgHasFeature(
          {
            plan: activeOrg?.plan ?? 'regular',
            features: activeOrg?.features ?? {},
          },
          'numeracion_botellas'
        )}
        canWrite={canWrite}
      />
    </div>
  )
}
