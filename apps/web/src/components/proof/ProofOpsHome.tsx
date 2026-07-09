'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { ContentCard, PageFrame, PageHeader, Spinner } from '@fermentrack/ui'
import { useOpsHomeKpis } from '@/hooks/useOpsHomeKpis'
import type { ProfileType } from '@/lib/proof/kpi-metrics'

/**
 * VU home for non–winemaker-owner profiles (Fase 3).
 * Connect lives only at `/dashboard/conectar`.
 */
export function ProofOpsHome({ profileType }: { profileType: ProfileType }) {
  const t = useTranslations('opsHome')
  const tHub = useTranslations('connectionHub')
  const tDash = useTranslations('dashboard')
  const { loading, error, kpis } = useOpsHomeKpis(profileType)

  const subtitle =
    profileType === 'distributor'
      ? t('subtitle.distributor')
      : profileType === 'distiller'
        ? t('subtitle.distiller')
        : t('subtitle.default')

  return (
    <PageFrame style={{ overflow: 'auto' }}>
      <PageHeader title={tDash('pageTitles.home')} description={subtitle} />

      {loading ? (
        <ContentCard>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Spinner />
            <span style={{ fontSize: 14, color: 'var(--fg-3)' }}>{t('loading')}</span>
          </div>
        </ContentCard>
      ) : null}

      {!loading && error ? (
        <ContentCard>
          <p role="alert" style={{ margin: 0, fontSize: 14, color: 'var(--crit)' }}>
            {t('error')}
          </p>
        </ContentCard>
      ) : null}

      {!loading && !error && kpis.length > 0 ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: 12,
          }}
        >
          {kpis.map(kpi => (
            <Link
              key={kpi.id}
              href={kpi.href}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <ContentCard style={{ gap: 8, padding: '16px 18px', height: '100%' }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 500, color: 'var(--fg-3)' }}>
                  {t(kpi.labelKey)}
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: 24,
                    fontWeight: 600,
                    letterSpacing: '-0.02em',
                    color: 'var(--fg-0)',
                    lineHeight: 1.2,
                  }}
                >
                  {kpi.value}
                </p>
              </ContentCard>
            </Link>
          ))}
        </div>
      ) : null}

      {!loading && !error && kpis.length === 0 ? (
        <ContentCard>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: 'var(--fg-2)' }}>
            {t('empty')}
          </p>
        </ContentCard>
      ) : null}

      <ContentCard>
        <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--fg-0)' }}>
          {tHub('ownerCta.title')}
        </p>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: 'var(--fg-2)' }}>
          {tHub('ownerCta.hint')}
        </p>
        <Link
          href="/dashboard/conectar"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            alignSelf: 'flex-start',
            gap: 6,
            fontSize: 14,
            fontWeight: 600,
            padding: '10px 16px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--fg-0)',
            color: 'var(--ink)',
            textDecoration: 'none',
          }}
        >
          {tHub('ownerCta.action')}
        </Link>
      </ContentCard>
    </PageFrame>
  )
}
