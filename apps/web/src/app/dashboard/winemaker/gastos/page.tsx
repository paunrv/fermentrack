'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import type { AppLocale } from '@/i18n/routing'
import { formatCurrencyMxn } from '@/lib/i18n/format'
import { useSupabase } from '@/hooks/useSupabase'
import { useWinemakerRouteGuard } from '@/hooks/useWinemakerRouteGuard'
import type { WmCostCategory, WmProductionCostRow } from '@/lib/proof/winemaker-types'
import { fetchProductionCosts } from '@/lib/supabase/winemaker'

export default function WinemakerGastosPage() {
  const locale = useLocale() as AppLocale
  const t = useTranslations('winemaker.gastos')
  const tCommon = useTranslations('winemaker.common')
  const tCategory = useTranslations('winemaker.costCategory')
  const tAllocation = useTranslations('winemaker.allocation')
  const supabase = useSupabase()
  const { loading: scopeLoading, ok, organizationId } = useWinemakerRouteGuard()
  const [costs, setCosts] = useState<WmProductionCostRow[]>([])
  const [dataLoading, setDataLoading] = useState(true)

  useEffect(() => {
    if (!ok || !organizationId) return
    let cancelled = false
    setDataLoading(true)
    fetchProductionCosts(supabase, organizationId, { limit: 200 })
      .then(rows => {
        if (!cancelled) setCosts(rows)
      })
      .finally(() => {
        if (!cancelled) setDataLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [ok, organizationId, supabase])

  const total = costs.reduce((s, c) => s + Number(c.amount), 0)
  const overhead = costs.filter(c => c.lot_id == null).reduce((s, c) => s + Number(c.amount), 0)

  if (scopeLoading || !ok) {
    return (
      <div style={{ padding: 32, color: 'var(--fg-2)', fontSize: 14 }}>{tCommon('loading')}</div>
    )
  }

  return (
    <div style={{ padding: '24px 28px', maxWidth: 960 }}>
      <h1 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 600 }}>{t('title')}</h1>
      <p style={{ margin: '0 0 16px', color: 'var(--fg-2)', fontSize: 14 }}>{t('subtitle')}</p>

      <div style={{ display: 'flex', gap: 16, marginBottom: 24, fontSize: 14 }}>
        <span>
          {t.rich('totalRegistered', {
            strong: chunks => <strong>{chunks}</strong>,
            amount: formatCurrencyMxn(total, locale),
          })}
        </span>
        <span style={{ color: 'var(--fg-2)' }}>
          {t('wineryOverhead', { amount: formatCurrencyMxn(overhead, locale) })}
        </span>
      </div>

      {dataLoading ? (
        <p style={{ color: 'var(--fg-2)', fontSize: 14 }}>{t('loading')}</p>
      ) : costs.length === 0 ? (
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
          {costs.map(c => (
            <li
              key={c.id}
              style={{
                padding: '14px 16px',
                borderRadius: 10,
                background: 'var(--bg-1)',
                border: '0.5px solid var(--border)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <strong>{c.description || tCategory(c.category as WmCostCategory)}</strong>
                  <div style={{ fontSize: 13, color: 'var(--fg-2)', marginTop: 4 }}>
                    {t('costLine', {
                      category: tCategory(c.category as WmCostCategory),
                      allocation: c.lot_id ? tAllocation('lot') : tAllocation('winery'),
                    })}
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: 13 }}>
                  <div>{formatCurrencyMxn(Number(c.amount), locale)}</div>
                  <div style={{ color: 'var(--fg-2)' }}>{c.cost_date}</div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
