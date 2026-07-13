'use client'

export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { useBreakpoint } from '@/hooks/useBreakpoint'
import { useSupabase } from '@/hooks/useSupabase'
import { useWinemakerRouteGuard } from '@/hooks/useWinemakerRouteGuard'
import { VuOpsPage } from '@/components/proof/VuOpsPage'
import { dashboardPageShell } from '@/lib/ui/page-shell'
import { LOT_ETAPA_VALUES, type LotEtapa } from '@/lib/proof/lot-etapa'
import {
  fetchActiveLots,
  type OwnerLotRow,
} from '@/lib/supabase/winemaker-owner-home'

function countLotsByEtapa(lots: OwnerLotRow[]): Partial<Record<LotEtapa, number>> {
  const counts: Partial<Record<LotEtapa, number>> = {}
  for (const lot of lots) {
    counts[lot.etapa] = (counts[lot.etapa] ?? 0) + 1
  }
  return counts
}

export default function WinemakerLotesPage() {
  const t = useTranslations('winemaker.lotes')
  const tCommon = useTranslations('winemaker.common')
  const tEtapa = useTranslations('winemaker.etapa')
  const supabase = useSupabase()
  const breakpoint = useBreakpoint()
  const isMobile = breakpoint === 'mobile'
  const { loading: scopeLoading, ok, organizationId } = useWinemakerRouteGuard()
  const [lotes, setLotes] = useState<OwnerLotRow[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (!ok || !organizationId) return
    let cancelled = false
    setDataLoading(true)
    setLoadError(null)
    fetchActiveLots(supabase, organizationId)
      .then(rows => {
        if (cancelled) return
        setLotes(rows)
      })
      .catch(() => {
        if (cancelled) return
        setLotes([])
        setLoadError(t('loadError'))
      })
      .finally(() => {
        if (!cancelled) setDataLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [ok, organizationId, supabase, t])

  const counts = useMemo(() => countLotsByEtapa(lotes), [lotes])

  if (scopeLoading || !ok) {
    return (
      <div style={{ padding: 32, color: 'var(--fg-2)', fontSize: 14 }}>{tCommon('loading')}</div>
    )
  }

  const statusChips = (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: isMobile ? 24 : 0 }}>
      {LOT_ETAPA_VALUES.map(etapa => {
        const n = counts[etapa] ?? 0
        if (n === 0) return null
        return (
          <span
            key={etapa}
            style={{
              fontSize: 12,
              padding: '4px 10px',
              borderRadius: 999,
              background: 'var(--bg-2)',
              color: 'var(--fg-1)',
            }}
          >
            {t('statusCount', {
              status: tEtapa(etapa),
              count: n,
            })}
          </span>
        )
      })}
    </div>
  )

  let listBody: ReactNode
  if (dataLoading) {
    listBody = <p style={{ color: 'var(--fg-2)', fontSize: 14, margin: 0 }}>{t('loading')}</p>
  } else if (loadError) {
    listBody = (
      <p role="alert" style={{ color: 'var(--crit)', fontSize: 14, margin: 0 }}>
        {loadError}
      </p>
    )
  } else if (lotes.length === 0) {
    listBody = (
      <div
        style={{
          padding: 32,
          borderRadius: 12,
          border: '1px dashed var(--border)',
          color: 'var(--fg-2)',
          fontSize: 14,
          lineHeight: 1.6,
        }}
      >
        {t('empty')}
      </div>
    )
  } else {
    listBody = (
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
        {lotes.map(l => (
          <li key={l.id}>
            <Link
              href={`/dashboard/winemaker/lotes/${l.id}`}
              style={{
                display: 'block',
                padding: '14px 16px',
                borderRadius: 10,
                background: 'var(--bg-1)',
                border: '0.5px solid var(--border)',
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <div
                className="proof-lot-row"
                style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}
              >
                <div>
                  <strong style={{ color: 'var(--fg-0)' }}>{l.code}</strong>
                  <div style={{ fontSize: 13, color: 'var(--fg-2)', marginTop: 4 }}>
                    {l.varietal || t('noVarietal')}
                  </div>
                </div>
                <div className="proof-lot-row__meta" style={{ textAlign: 'right', fontSize: 13 }}>
                  <div style={{ color: 'var(--fg-1)' }}>{tEtapa(l.etapa)}</div>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    )
  }

  if (isMobile) {
    return (
      <div style={dashboardPageShell(breakpoint, { withBottomNav: true })}>
        <h1 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 600 }}>{t('title')}</h1>
        <p style={{ margin: '0 0 24px', color: 'var(--fg-2)', fontSize: 14 }}>{t('subtitle')}</p>
        {statusChips}
        {listBody}
      </div>
    )
  }

  return (
    <VuOpsPage title={t('title')} description={t('subtitle')}>
      {statusChips}
      {listBody}
    </VuOpsPage>
  )
}
