'use client'

import { useTranslations } from 'next-intl'
import type { LineaToma } from '@/lib/proof/toma-pedido-client'
import { fmtMoney } from '@/lib/proof/format'

type Props = {
  numero: string
  clienteName: string
  fechaEntrega: string
  anticipo: boolean
  anticipoMonto?: number | null
  lineas: LineaToma[]
  estado: string
  itemsGuardados: number
}

export function PedidoResumenCard({
  numero,
  clienteName,
  fechaEntrega,
  anticipo,
  anticipoMonto,
  lineas,
  estado,
  itemsGuardados,
}: Props) {
  const t = useTranslations('distributor.pedidos.resumenCard')
  const tUnits = useTranslations('distributor.pedidos.orderUnits')
  const tEstado = useTranslations('distributor.pedidoEstado')

  const estadoLabel = (tEstado as (key: string) => string)(estado) || estado

  return (
    <article
      style={{
        border: '1px solid var(--hairline)',
        borderRadius: 12,
        background: 'var(--panel)',
        overflow: 'hidden',
      }}
    >
      <header
        style={{
          padding: '14px 16px',
          borderBottom: '1px solid var(--hairline)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 12,
        }}
      >
        <div>
          <div className="mono" style={{ fontSize: 11, color: 'var(--gold)', marginBottom: 4 }}>
            {numero}
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--fg-0)' }}>{clienteName}</div>
          <div style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 4 }}>
            {t('delivery')} {fechaEntrega}
            {anticipo && (
              <span style={{ marginLeft: 8, color: 'var(--warn)', fontWeight: 600 }}>
                · {t('advance')}
                {anticipoMonto != null && anticipoMonto > 0 ? ` ${fmtMoney(anticipoMonto)}` : ''}
              </span>
            )}
          </div>
        </div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: estado === 'confirmado' ? 'var(--ok)' : 'var(--warn)',
          }}
        >
          {estadoLabel}
        </span>
      </header>

      <ul style={{ margin: 0, padding: '8px 0', listStyle: 'none' }}>
        {lineas.map((l, i) => (
          <li
            key={`${l.etiqueta}-${i}`}
            style={{
              padding: '10px 16px',
              borderBottom: i < lineas.length - 1 ? '1px solid var(--hairline)' : 'none',
              display: 'flex',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <span style={{ fontWeight: 600, fontSize: 14 }}>{l.etiqueta}</span>
            <span className="mono" style={{ fontSize: 13, color: 'var(--fg-2)' }}>
              {l.cantidad} {tUnits(l.unidad)}
            </span>
          </li>
        ))}
      </ul>

      <footer
        style={{
          padding: '10px 16px',
          borderTop: '1px solid var(--hairline)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        {itemsGuardados === 0 ? (
          <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>{t('byLabel')}</span>
        ) : (
          <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>
            {t('catalogLines', { count: itemsGuardados })}
          </span>
        )}
      </footer>
    </article>
  )
}
