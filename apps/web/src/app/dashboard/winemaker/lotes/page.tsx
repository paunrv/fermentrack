'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import type { AppLocale } from '@/i18n/routing'
import { formatNumber } from '@/lib/i18n/format'
import { useBreakpoint } from '@/hooks/useBreakpoint'
import { useSupabase } from '@/hooks/useSupabase'
import { useWinemakerRouteGuard } from '@/hooks/useWinemakerRouteGuard'
import { dashboardPageShell } from '@/lib/ui/page-shell'
import type { WmWineLotRow, WmWineLotStatus } from '@/lib/proof/winemaker-types'
import { countWineLotsByStatus, fetchWineLots } from '@/lib/supabase/winemaker'

export default function WinemakerLotesPage() {
  const locale = useLocale() as AppLocale
  const t = useTranslations('winemaker.lotes')
  const tCommon = useTranslations('winemaker.common')
  const tStatus = useTranslations('winemaker.lotStatus')
  const supabase = useSupabase()
  const breakpoint = useBreakpoint()
  const { loading: scopeLoading, ok, organizationId } = useWinemakerRouteGuard()
  const [lotes, setLotes] = useState<WmWineLotRow[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [dataLoading, setDataLoading] = useState(true)

  useEffect(() => {
    if (!ok || !organizationId) return
    let cancelled = false
    setDataLoading(true)
    Promise.all([
      countWineLotsByStatus(supabase, organizationId),
      fetchWineLots(supabase, organizationId),
    ])
      .then(([c, rows]) => {
        if (cancelled) return
        setCounts(c)
        setLotes(rows)
      })
      .finally(() => {
        if (!cancelled) setDataLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [ok, organizationId, supabase])

  if (scopeLoading || !ok) {
    return (
      <div style={{ padding: 32, color: 'var(--fg-2)', fontSize: 14 }}>{tCommon('loading')}</div>
    )
  }

  return (
    <div style={dashboardPageShell(breakpoint, { withBottomNav: true })}>
      <h1 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 600 }}>{t('title')}</h1>
      <p style={{ margin: '0 0 24px', color: 'var(--fg-2)', fontSize: 14 }}>{t('subtitle')}</p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
        {Object.entries(counts).map(([status, n]) =>
          n > 0 ? (
            <span
              key={status}
              style={{
                fontSize: 12,
                padding: '4px 10px',
                borderRadius: 999,
                background: 'var(--bg-2)',
                color: 'var(--fg-1)',
              }}
            >
              {t('statusCount', {
                status: tStatus(status as WmWineLotStatus),
                count: n,
              })}
            </span>
          ) : null
        )}
      </div>

      {dataLoading ? (
        <p style={{ color: 'var(--fg-2)', fontSize: 14 }}>{t('loading')}</p>
      ) : lotes.length === 0 ? (
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
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
          {lotes.map(l => (
            <li
              key={l.id}
              style={{
                padding: '14px 16px',
                borderRadius: 10,
                background: 'var(--bg-1)',
                border: '0.5px solid var(--border)',
              }}
            >
              <div className="proof-lot-row" style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <strong>{l.name || l.lot_code}</strong>
                  <div style={{ fontSize: 13, color: 'var(--fg-2)', marginTop: 4 }}>
                    {l.varietal || t('noVarietal')} · {l.lot_code}
                  </div>
                </div>
                <div className="proof-lot-row__meta" style={{ textAlign: 'right', fontSize: 13 }}>
                  <div>{tStatus(l.status)}</div>
                  {l.liters_initial != null ? (
                    <div style={{ color: 'var(--fg-2)' }}>
                      {t('litersUnit', {
                        amount: formatNumber(Number(l.liters_initial), locale),
                      })}
                    </div>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
