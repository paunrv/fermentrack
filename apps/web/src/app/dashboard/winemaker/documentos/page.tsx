'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, type ReactNode } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import type { AppLocale } from '@/i18n/routing'
import { formatCurrencyMxn } from '@/lib/i18n/format'
import { useBreakpoint } from '@/hooks/useBreakpoint'
import { useSupabase } from '@/hooks/useSupabase'
import { useWinemakerRouteGuard } from '@/hooks/useWinemakerRouteGuard'
import { VuOpsPage } from '@/components/proof/VuOpsPage'
import { dashboardPageShell } from '@/lib/ui/page-shell'
import type { WmSupplyKind } from '@/lib/proof/wm-supply-taxonomy'
import type { WmDocumentRow, WmDocumentType } from '@/lib/proof/winemaker-types'
import { fetchDocuments } from '@/lib/supabase/winemaker'

export default function WinemakerDocumentosPage() {
  const locale = useLocale() as AppLocale
  const t = useTranslations('winemaker.documentos')
  const tCommon = useTranslations('winemaker.common')
  const tSupply = useTranslations('winemaker.supplyKind')
  const tDocType = useTranslations('winemaker.documentType')
  const supabase = useSupabase()
  const breakpoint = useBreakpoint()
  const isMobile = breakpoint === 'mobile'
  const { loading: scopeLoading, ok, organizationId } = useWinemakerRouteGuard()
  const [docs, setDocs] = useState<WmDocumentRow[]>([])
  const [dataLoading, setDataLoading] = useState(true)

  function supplyLineLabel(kind: WmSupplyKind, varietal?: string): string {
    const base = tSupply(kind)
    if (kind === 'uva' && varietal?.trim()) {
      return `${base} · ${varietal.trim()}`
    }
    return base
  }

  useEffect(() => {
    if (!ok || !organizationId) return
    let cancelled = false
    setDataLoading(true)
    fetchDocuments(supabase, organizationId, { limit: 100, withLines: true })
      .then(rows => {
        if (!cancelled) setDocs(rows)
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

  let body: ReactNode
  if (dataLoading) {
    body = <p style={{ color: 'var(--fg-2)', fontSize: 14, margin: 0 }}>{t('loading')}</p>
  } else if (docs.length === 0) {
    body = (
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
    body = (
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
        {docs.map(d => (
          <li
            key={d.id}
            style={{
              padding: '14px 16px',
              borderRadius: 10,
              background: 'var(--bg-1)',
              border: '0.5px solid var(--border)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <strong>
                  {d.vendor || d.original_filename || tDocType(d.document_type as WmDocumentType)}
                </strong>
                <div style={{ fontSize: 13, color: 'var(--fg-2)', marginTop: 4 }}>
                  {tDocType(d.document_type as WmDocumentType)}
                  {typeof d.parsed_json === 'object' &&
                  d.parsed_json &&
                  'total' in d.parsed_json &&
                  d.parsed_json.total != null
                    ? ` · ${formatCurrencyMxn(Number(d.parsed_json.total), locale)}`
                    : ''}
                </div>
              </div>
              <div style={{ fontSize: 13, color: 'var(--fg-2)' }}>{d.document_date}</div>
            </div>
            {(d.wm_document_lines?.length ?? 0) > 0 ? (
              <div style={{ fontSize: 12, color: 'var(--fg-2)', marginTop: 8 }}>
                {d
                  .wm_document_lines!.map(l => supplyLineLabel(l.supply_kind, l.varietal))
                  .join(' · ')}
              </div>
            ) : null}
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
        {body}
      </div>
    )
  }

  return (
    <VuOpsPage title={t('title')} description={t('subtitle')}>
      {body}
    </VuOpsPage>
  )
}
