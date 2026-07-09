'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import type { ClienteConSaldo } from '@/lib/supabase/distribuidor'
import { fmtMoney } from '@/lib/proof/format'

type Props = {
  cliente: ClienteConSaldo
}

export function ClienteRailCard({ cliente }: Props) {
  const t = useTranslations('distributor.clientes')
  const saldo = cliente.saldo_pendiente

  function creditoLabel(dias: number): string {
    return dias === 0 ? t('creditTerms.cash') : t('creditTerms.days', { days: dias })
  }

  return (
    <Link
      href={`/dashboard/clientes/${cliente.id}`}
      className="proof-rail-card"
      style={{ textDecoration: 'none', color: 'inherit' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-0)', lineHeight: 1.3 }}>
            {cliente.nombre}
          </div>
          {cliente.direccion && (
            <div
              style={{
                fontSize: 11,
                color: 'var(--fg-3)',
                marginTop: 4,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {cliente.direccion}
            </div>
          )}
        </div>
        {cliente.tiene_deuda_vencida && (
          <span
            style={{
              flexShrink: 0,
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              padding: '3px 6px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(180, 40, 40, 0.12)',
              color: 'var(--crit)',
              border: '1px solid rgba(180, 40, 40, 0.25)',
            }}
          >
            {t('rail.overdue')}
          </span>
        )}
      </div>

      <div style={{ fontSize: 12, color: 'var(--fg-2)' }}>
        {cliente.telefono || t('rail.noPhone')}
      </div>

      <div
        style={{
          marginTop: 'auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.04em',
            padding: '3px 8px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--panel-2)',
            color: 'var(--fg-1)',
            border: '1px solid var(--hairline)',
          }}
        >
          {creditoLabel(cliente.dias_credito)}
        </span>
        <span
          className="mono"
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: saldo > 0 ? 'var(--proof-accent)' : 'var(--fg-3)',
          }}
        >
          {saldo > 0 ? fmtMoney(saldo) : t('rail.noBalance')}
        </span>
      </div>
    </Link>
  )
}
