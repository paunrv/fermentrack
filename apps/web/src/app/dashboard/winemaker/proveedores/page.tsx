'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import type { AppLocale } from '@/i18n/routing'
import { compareStrings } from '@/lib/i18n/locale'
import { useBreakpoint } from '@/hooks/useBreakpoint'
import { useSupabase } from '@/hooks/useSupabase'
import { useWinemakerRouteGuard } from '@/hooks/useWinemakerRouteGuard'
import { VuOpsPage } from '@/components/proof/VuOpsPage'
import { dashboardPageShell } from '@/lib/ui/page-shell'
import type { WmSupplyKind } from '@/lib/proof/wm-supply-taxonomy'
import type { WmSupplierRow } from '@/lib/proof/winemaker-types'
import { fetchDocuments, fetchSuppliers } from '@/lib/supabase/winemaker'

export default function WinemakerProveedoresPage() {
  const locale = useLocale() as AppLocale
  const t = useTranslations('winemaker.proveedores')
  const tCommon = useTranslations('winemaker.common')
  const tSupply = useTranslations('winemaker.supplyKind')
  const supabase = useSupabase()
  const breakpoint = useBreakpoint()
  const isMobile = breakpoint === 'mobile'
  const { loading: scopeLoading, ok, organizationId } = useWinemakerRouteGuard()
  const [suppliers, setSuppliers] = useState<WmSupplierRow[]>([])
  const [insumosBySupplier, setInsumosBySupplier] = useState<Record<string, WmSupplyKind[]>>({})
  const [dataLoading, setDataLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (!ok || !organizationId) return
    let cancelled = false
    setDataLoading(true)
    setLoadError(null)
    Promise.all([
      fetchSuppliers(supabase, organizationId),
      fetchDocuments(supabase, organizationId, { limit: 200, withLines: true }),
    ])
      .then(([rows, docs]) => {
        if (cancelled) return
        setSuppliers(rows)
        const map: Record<string, Set<WmSupplyKind>> = {}
        for (const doc of docs) {
          for (const line of doc.wm_document_lines ?? []) {
            const sid = line.supplier_id ?? doc.supplier_id
            if (!sid || !line.supply_kind) continue
            if (!map[sid]) map[sid] = new Set()
            map[sid].add(line.supply_kind)
          }
        }
        const out: Record<string, WmSupplyKind[]> = {}
        for (const [id, set] of Object.entries(map)) {
          out[id] = [...set]
        }
        setInsumosBySupplier(out)
      })
      .catch(() => {
        if (cancelled) return
        setSuppliers([])
        setInsumosBySupplier({})
        setLoadError(t('loadError'))
      })
      .finally(() => {
        if (!cancelled) setDataLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [ok, organizationId, supabase, t])

  const sorted = useMemo(
    () => [...suppliers].sort((a, b) => compareStrings(a.name, b.name, locale)),
    [suppliers, locale]
  )

  if (scopeLoading || !ok) {
    return (
      <div style={{ padding: 32, color: 'var(--fg-2)', fontSize: 14 }}>{tCommon('loading')}</div>
    )
  }

  let body: ReactNode
  if (dataLoading) {
    body = <p style={{ color: 'var(--fg-2)', fontSize: 14, margin: 0 }}>{t('loading')}</p>
  } else if (loadError) {
    body = (
      <p role="alert" style={{ color: 'var(--crit)', fontSize: 14, margin: 0 }}>
        {loadError}
      </p>
    )
  } else if (sorted.length === 0) {
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
        {sorted.map(s => {
          const kinds = insumosBySupplier[s.id] ?? []
          return (
            <li
              key={s.id}
              style={{
                padding: '14px 16px',
                borderRadius: 10,
                background: 'var(--bg-1)',
                border: '0.5px solid var(--border)',
              }}
            >
              <strong>{s.name}</strong>
              {kinds.length > 0 ? (
                <div style={{ fontSize: 13, color: 'var(--fg-2)', marginTop: 6 }}>
                  {t('suppliesLabel', {
                    list: kinds.map(kind => tSupply(kind)).join(' · '),
                  })}
                </div>
              ) : (
                <div style={{ fontSize: 13, color: 'var(--fg-2)', marginTop: 6 }}>
                  {t('noClassifiedLines')}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    )
  }

  if (isMobile) {
    return (
      <div style={dashboardPageShell(breakpoint, { withBottomNav: true })}>
        <h1 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 600 }}>{t('title')}</h1>
        <p style={{ margin: '0 0 24px', color: 'var(--fg-2)', fontSize: 14, lineHeight: 1.5 }}>
          {t('subtitle')}
        </p>
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
