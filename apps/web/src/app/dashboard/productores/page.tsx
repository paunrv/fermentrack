'use client'

export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import type { AppLocale } from '@/i18n/routing'
import { useProfile } from '@/context/ProfileContext'
import { useSupabase } from '@/hooks/useSupabase'
import { ConnectedProofAIBar } from '@/components/proof/ConnectedProofAIBar'
import {
  buildProductoresResumen,
  encodeProductorSlug,
  type ProductorResumen,
} from '@/lib/proof/productores'
import { fmtMoney } from '@/lib/proof/format'
import { formatDate } from '@/lib/i18n/format'
import {
  fetchDeudasProductores,
  fetchOrdenesCompraAbiertas,
  fetchOrdenesCompraDistribuidorPendientes,
  fetchSkus,
} from '@/lib/supabase'

export default function ProductoresPage() {
  const t = useTranslations('distributor.productores')
  const tCommon = useTranslations('distributor.common')
  const locale = useLocale() as AppLocale
  const { scope } = useProfile()
  const supabase = useSupabase()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<ProductorResumen[]>([])

  useEffect(() => {
    if (!scope) return
    let cancelled = false
    setLoading(true)
    Promise.all([
      fetchSkus(supabase, scope),
      fetchDeudasProductores(supabase, scope),
      fetchOrdenesCompraAbiertas(supabase, scope),
      fetchOrdenesCompraDistribuidorPendientes(supabase, scope),
    ])
      .then(([skus, deudas, ordenesLegacy, ordenesDistribuidor]) => {
        if (cancelled) return
        setRows(buildProductoresResumen(skus, deudas, ordenesLegacy, ordenesDistribuidor))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [scope?.user_id, scope?.profile_type_v2, supabase])

  const conDeuda = useMemo(() => rows.filter(r => r.deudaTotal > 0).length, [rows])

  function fmtDate(iso: string | null): string {
    if (!iso) return tCommon('dash')
    return formatDate(new Date(iso + 'T12:00:00'), locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <div style={{ padding: '28px 28px 100px', maxWidth: 800, margin: '0 auto' }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ margin: '0 0 8px', fontSize: 28, fontWeight: 800, color: 'var(--fg-0)' }}>
          {t('title')}
        </h1>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--fg-2)' }}>{t('subtitle')}</p>
      </header>

      {loading ? (
        <p style={{ color: 'var(--fg-3)', fontSize: 13 }}>{tCommon('loading')}</p>
      ) : rows.length === 0 ? (
        <div
          style={{
            padding: 32,
            textAlign: 'center',
            border: '1px solid var(--hairline)',
            borderRadius: 'var(--radius-card)',
            color: 'var(--fg-3)',
            fontSize: 13,
          }}
        >
          {t('empty')}
        </div>
      ) : (
        <div style={{ border: '1px solid var(--hairline)', borderRadius: 'var(--radius-card)' }}>
          {rows.map((p, i) => (
            <Link
              key={p.nombre}
              href={`/dashboard/productores/${encodeProductorSlug(p.nombre)}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                padding: '16px 18px',
                borderBottom: i < rows.length - 1 ? '1px solid var(--hairline)' : 'none',
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: 'var(--fg-0)' }}>{p.nombre}</div>
                <div className="mono" style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 4 }}>
                  {t('skuCount', { count: p.skuCount })}
                  {p.ocPendientes > 0 ? ` · ${t('ocPending', { count: p.ocPendientes })}` : ''}
                  {p.proximoVencimiento ? ` · ${t('dueDate', { date: fmtDate(p.proximoVencimiento) })}` : ''}
                </div>
              </div>
              <span
                className="mono"
                style={{
                  fontSize: 14,
                  color: p.deudaTotal > 0 ? 'var(--warn)' : 'var(--ok)',
                  flexShrink: 0,
                }}
              >
                {p.deudaTotal > 0 ? fmtMoney(p.deudaTotal) : t('current')}
              </span>
            </Link>
          ))}
        </div>
      )}

      <p style={{ marginTop: 16, fontSize: 12, color: 'var(--fg-3)', lineHeight: 1.5 }}>
        {t.rich('footer', {
          createOc: chunks => (
            <Link href="/dashboard/distribuidor/compras/nuevo" style={{ color: 'var(--gold)' }}>
              {chunks}
            </Link>
          ),
          canvas: chunks => (
            <Link href="/dashboard" style={{ color: 'var(--gold)' }}>
              {chunks}
            </Link>
          ),
          credito: chunks => (
            <Link href="/dashboard/credito" style={{ color: 'var(--gold)' }}>
              {chunks}
            </Link>
          ),
        })}
      </p>

      <ConnectedProofAIBar
        pantalla="productores"
        profileType="distributor"
        hints={{ pantalla: { total: rows.length, conDeuda } }}
        fallback={{
          mensaje:
            conDeuda > 0 ? t('aiFallbackWithDebt', { count: conDeuda }) : t('aiFallbackCurrent'),
        }}
      />
    </div>
  )
}
