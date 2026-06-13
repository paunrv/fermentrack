'use client'

import { fmtMoney } from '@/lib/proof/format'
import type { DeudaClienteAgregada } from '@/lib/supabase/distribuidor'

const MONO = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'

type Props = {
  deuda: DeudaClienteAgregada
  accent: string
  selected?: boolean
  onClick: () => void
}

export function CreditoClienteCanvasCard({ deuda, accent, selected, onClick }: Props) {
  const vencido = deuda.estado === 'vencido'

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        textAlign: 'left',
        padding: 14,
        borderRadius: 12,
        border: selected ? `1.5px solid ${accent}` : '0.5px solid var(--hairline)',
        background: selected ? `${accent}08` : '#fff',
        cursor: 'pointer',
        minHeight: 140,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        transition: 'border-color 0.15s ease',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = accent
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = selected ? accent : 'var(--hairline)'
      }}
    >
      <span
        style={{
          fontSize: 9,
          fontFamily: MONO,
          color: vencido ? '#E24B4A' : accent,
          letterSpacing: '0.06em',
        }}
      >
        {vencido ? 'VENCIDO' : 'AL DÍA'}
      </span>
      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-0)', lineHeight: 1.2 }}>
        {deuda.cliente_nombre}
      </span>
      <span style={{ fontSize: 11, color: '#666', lineHeight: 1.45, flex: 1 }}>
        {deuda.cuentas_count} pedido{deuda.cuentas_count !== 1 ? 's' : ''} con saldo
        {deuda.fecha_vencimiento ? `\nVence ${deuda.fecha_vencimiento}` : ''}
      </span>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: 10, color: '#AAA', fontFamily: MONO }}>
          {fmtMoney(deuda.monto_total)}
        </span>
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            fontFamily: MONO,
            color: vencido ? '#E24B4A' : 'var(--fg-0)',
          }}
        >
          {fmtMoney(deuda.saldo_pendiente)}
        </span>
      </div>
    </button>
  )
}
