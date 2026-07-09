'use client'

export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import type { AppLocale } from '@/i18n/routing'
import { useProfile } from '@/context/ProfileContext'
import { useSupabase } from '@/hooks/useSupabase'
import { fmtBottles } from '@/lib/proof/format'
import { formatDate } from '@/lib/i18n/format'
import { VuOpsPage } from '@/components/proof/VuOpsPage'
import { fetchRecepcionesRemision, type RecepcionRemisionListRow } from '@/lib/supabase'

export default function RemisionesPage() {
  const t = useTranslations('distributor.remisiones')
  const tCommon = useTranslations('distributor.common')
  const locale = useLocale() as AppLocale
  const { scope } = useProfile()
  const supabase = useSupabase()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<RecepcionRemisionListRow[]>([])

  useEffect(() => {
    if (!scope) return
    let cancelled = false
    setLoading(true)
    fetchRecepcionesRemision(supabase, scope)
      .then(data => {
        if (!cancelled) setRows(data)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [scope?.user_id, scope?.profile_type_v2, supabase])

  function fmtDateTime(iso: string): string {
    return formatDate(new Date(iso), locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <VuOpsPage title={t('title')} description={t('subtitle')}>
      {loading ? (
        <p style={{ color: 'var(--fg-3)', fontSize: 13, margin: 0 }}>{tCommon('loading')}</p>
      ) : rows.length === 0 ? (
        <div
          style={{
            padding: 40,
            textAlign: 'center',
            border: '1px solid var(--hairline)',
            borderRadius: 'var(--radius-card)',
            background: 'var(--panel)',
            color: 'var(--fg-3)',
            fontSize: 13,
          }}
        >
          {t.rich('empty', {
            link: chunks => (
              <Link href="/dashboard/recepcion" style={{ color: 'var(--gold)' }}>
                {chunks}
              </Link>
            ),
          })}
        </div>
      ) : (
        <div style={{ border: '1px solid var(--hairline)', borderRadius: 'var(--radius-card)' }}>
          {rows.map((r, i) => (
            <Link
              key={r.id}
              href={`/dashboard/remisiones/${r.id}`}
              style={{
                display: 'block',
                padding: '16px 18px',
                borderBottom: i < rows.length - 1 ? '1px solid var(--hairline)' : 'none',
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <div className="mono" style={{ fontSize: 12, color: 'var(--gold)', marginBottom: 4 }}>
                    {r.codigo}
                  </div>
                  <div style={{ fontWeight: 600, color: 'var(--fg-0)' }}>{r.productor}</div>
                  <div style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 4 }}>
                    {fmtDateTime(r.fecha_recepcion)} · {fmtBottles(r.botellas_recibidas)} {t('bottlesUnit')}
                    {r.discrepancias_count > 0 && (
                      <span style={{ color: 'var(--warn)' }}>
                        {' '}
                        · {t('discrepancy', { count: r.discrepancias_count })}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  {r.foto_urls?.length > 0 && (
                    <span className="mono" style={{ fontSize: 10, color: 'var(--ok)' }}>
                      {t('photoBadge')}
                    </span>
                  )}
                  {r.estado === 'con_discrepancias' && (
                    <div className="mono" style={{ fontSize: 10, color: 'var(--warn)', marginTop: 4 }}>
                      {t('withDiscrepanciesBadge')}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </VuOpsPage>
  )
}
