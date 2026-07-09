'use client'

export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useProfile } from '@/context/ProfileContext'
import { useSupabase } from '@/hooks/useSupabase'
import { fetchPedidos, type PedidoRow } from '@/lib/supabase'
import { fmtMoney } from '@/lib/proof/format'
import { useBreakpoint } from '@/hooks/useBreakpoint'
import { VuOpsPage } from '@/components/proof/VuOpsPage'

export default function PedidosPage() {
  const t = useTranslations('distributor.pedidos')
  const tEstado = useTranslations('distributor.pedidoEstado')
  const tCommon = useTranslations('distributor.common')
  const { scope } = useProfile()
  const supabase = useSupabase()
  const breakpoint = useBreakpoint()
  const isMobile = breakpoint === 'mobile'
  const [rows, setRows] = useState<PedidoRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!scope) return
    let cancelled = false
    setLoading(true)
    fetchPedidos(supabase, scope, { limit: 50 })
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

  return (
    <VuOpsPage
      title={t('title')}
      description={t('subtitle')}
      actions={
        <Link
          href="/dashboard/pedidos/nuevo"
          className="ui-btn ui-btn--primary ui-btn--sm"
          style={{ textDecoration: 'none' }}
        >
          {t('newOrder')}
        </Link>
      }
    >
      {loading ? (
        <p style={{ margin: 0, color: 'var(--fg-3)' }}>{tCommon('loading')}</p>
      ) : rows.length === 0 ? (
        <p style={{ margin: 0, color: 'var(--fg-2)' }}>
          {t('empty')}{' '}
          <Link href="/dashboard/pedidos/nuevo" style={{ color: 'var(--proof-accent)' }}>
            {t('createFirst')}
          </Link>
        </p>
      ) : (
        <div style={{ border: '1px solid var(--hairline)', borderRadius: 'var(--radius-md)' }}>
          {rows.map((p, i) => (
            <Link
              key={p.id}
              href={`/dashboard/pedidos/${p.id}`}
              style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                justifyContent: 'space-between',
                alignItems: isMobile ? 'stretch' : 'center',
                gap: isMobile ? 8 : 0,
                padding: '14px 16px',
                borderBottom: i < rows.length - 1 ? '1px solid var(--hairline)' : 'none',
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <span className="mono" style={{ fontSize: 12, color: 'var(--proof-accent)' }}>
                  {p.numero}
                </span>
                <div style={{ fontSize: 13, color: 'var(--fg-2)', marginTop: 4, lineHeight: 1.45 }}>
                  {(p as PedidoRow & { clients?: { name: string } }).clients?.name ??
                    tCommon('clientFallback')}
                  {p.etiqueta_nombre ? ` · ${p.etiqueta_nombre}` : ''}
                </div>
                <div style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 4 }}>
                  {t('delivery', { date: p.fecha_entrega })} · {tEstado(p.estado)}
                </div>
              </div>
              <span
                className="mono"
                style={{
                  fontWeight: 600,
                  fontSize: isMobile ? 16 : 13,
                  color: 'var(--fg-0)',
                  alignSelf: isMobile ? 'flex-start' : undefined,
                }}
              >
                {fmtMoney(Number(p.total))}
              </span>
            </Link>
          ))}
        </div>
      )}
    </VuOpsPage>
  )
}
