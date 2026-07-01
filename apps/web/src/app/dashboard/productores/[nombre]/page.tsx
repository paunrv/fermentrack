'use client'

export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import type { AppLocale } from '@/i18n/routing'
import { useProfile } from '@/context/ProfileContext'
import { useSupabase } from '@/hooks/useSupabase'
import { decodeProductorSlug } from '@/lib/proof/productores'
import { fmtBottles, fmtMoney } from '@/lib/proof/format'
import { formatDate } from '@/lib/i18n/format'
import {
  fetchDeudasByProductor,
  fetchOrdenesCompraByProductor,
  fetchSkusByProductor,
  type DeudaProductorRow,
  type OrdenCompraRow,
  type SkuRow,
} from '@/lib/supabase'

export default function ProductorDetallePage() {
  const t = useTranslations('distributor.productores.detail')
  const tCommon = useTranslations('distributor.common')
  const tList = useTranslations('distributor.productores')
  const locale = useLocale() as AppLocale
  const params = useParams()
  const nombre = decodeProductorSlug(String(params.nombre ?? ''))
  const { scope } = useProfile()
  const supabase = useSupabase()
  const [loading, setLoading] = useState(true)
  const [skus, setSkus] = useState<SkuRow[]>([])
  const [deudas, setDeudas] = useState<DeudaProductorRow[]>([])
  const [ordenes, setOrdenes] = useState<OrdenCompraRow[]>([])

  useEffect(() => {
    if (!scope || !nombre) return
    let cancelled = false
    setLoading(true)
    Promise.all([
      fetchSkusByProductor(supabase, scope, nombre),
      fetchDeudasByProductor(supabase, scope, nombre),
      fetchOrdenesCompraByProductor(supabase, scope, nombre),
    ])
      .then(([s, d, o]) => {
        if (cancelled) return
        setSkus(s)
        setDeudas(d)
        setOrdenes(o)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [scope?.user_id, scope?.profile_type_v2, supabase, nombre])

  const deudaTotal = deudas.reduce((a, d) => a + Number(d.monto), 0)

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
      <Link
        href="/dashboard/productores"
        style={{ fontSize: 12, color: 'var(--fg-3)', textDecoration: 'none' }}
      >
        {t('back')}
      </Link>

      <header style={{ margin: '16px 0 24px' }}>
        <h1 style={{ margin: '0 0 8px', fontSize: 28, fontWeight: 800, color: 'var(--fg-0)' }}>
          {nombre}
        </h1>
        <p className="mono" style={{ margin: 0, fontSize: 12, color: 'var(--fg-3)' }}>
          {t('summary', {
            count: skus.length,
            debt: deudaTotal > 0 ? fmtMoney(deudaTotal) : tList('current'),
          })}
        </p>
      </header>

      {loading ? (
        <p style={{ color: 'var(--fg-3)', fontSize: 13 }}>{tCommon('loading')}</p>
      ) : (
        <>
          <Section title={t('sections.skus')}>
            {skus.length === 0 ? (
              <Empty>{t('emptySkus')}</Empty>
            ) : (
              skus.map(s => (
                <Row
                  key={s.id}
                  primary={s.nombre}
                  secondary={t('available', { count: fmtBottles(s.stock_disponible) })}
                />
              ))
            )}
          </Section>

          <Section title={t('sections.debts')}>
            {deudas.length === 0 ? (
              <Empty>{t('emptyDebts')}</Empty>
            ) : (
              deudas.map(d => (
                <Row
                  key={d.id}
                  primary={fmtMoney(Number(d.monto))}
                  secondary={t('dueLine', { status: d.estado, date: fmtDate(d.fecha_vencimiento) })}
                />
              ))
            )}
          </Section>

          <Section title={t('sections.openOrders')}>
            {ordenes.length === 0 ? (
              <Empty>{t('emptyOrders')}</Empty>
            ) : (
              ordenes.map(o => (
                <Row
                  key={o.id}
                  primary={o.estado.toUpperCase()}
                  secondary={
                    o.fecha_esperada
                      ? t('expected', { date: fmtDate(o.fecha_esperada) })
                      : t('noExpectedDate')
                  }
                />
              ))
            )}
          </Section>
        </>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 24 }}>
      <h2
        className="eyebrow"
        style={{ margin: '0 0 10px', fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.12em' }}
      >
        {title}
      </h2>
      <div
        style={{
          border: '1px solid var(--hairline)',
          borderRadius: 'var(--radius-card)',
          overflow: 'hidden',
        }}
      >
        {children}
      </div>
    </section>
  )
}

function Row({ primary, secondary }: { primary: string; secondary: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 12,
        padding: '12px 16px',
        borderBottom: '1px solid var(--hairline)',
        fontSize: 13,
      }}
    >
      <span style={{ color: 'var(--fg-0)', fontWeight: 500 }}>{primary}</span>
      <span className="mono" style={{ color: 'var(--fg-3)', fontSize: 11 }}>
        {secondary}
      </span>
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ margin: 0, padding: 16, fontSize: 13, color: 'var(--fg-3)' }}>{children}</p>
  )
}
