'use client'

import type { PedidoRow } from '@/lib/supabase'
import { fmtMoney } from '@/lib/proof/format'
import type { EstadoCuentaPorCobrar } from '@/lib/supabase/distribuidor'
import {
  formatLineaToma,
  parseTomaPedidoNotas,
} from '@/lib/proof/toma-pedido-client'

const CLIENTE_ACCENT = '#2D6A4F'
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'

type CxcBadge = {
  id: string
  saldo_pendiente: number
  estado: EstadoCuentaPorCobrar
}

type Props = {
  pedido: PedidoRow & { clients?: { name: string } | null }
  accent?: string
  cxc?: CxcBadge
  selected?: boolean
  onClick: () => void
}

export function PedidoCanvasCard({
  pedido,
  accent = CLIENTE_ACCENT,
  cxc,
  selected,
  onClick,
}: Props) {
  const toma = parseTomaPedidoNotas(pedido.notas)
  const cliente = pedido.clients?.name ?? 'Cliente'
  const lineas = toma?.lineas ?? []
  const resumen =
    lineas.length > 0
      ? lineas.map(l => `${l.etiqueta} · ${formatLineaToma(l)}`).join('\n')
      : pedido.etiqueta_nombre ?? 'Sin productos'
  const entregado = pedido.estado === 'entregado' || pedido.estado === 'parcial'

  const statusLine = cxc && cxc.saldo_pendiente > 0 && entregado
    ? `CxC ${fmtMoney(cxc.saldo_pendiente)}`
    : entregado
      ? 'Entregado'
      : `Entrega ${pedido.fecha_entrega ?? '—'}`

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        textAlign: 'left',
        padding: 14,
        borderRadius: 12,
        border: selected ? `1.5px solid ${accent}` : `0.5px solid ${accent}22`,
        background: selected ? `${accent}08` : '#fff',
        cursor: 'pointer',
        minHeight: 140,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        transition: 'border-color 0.15s ease',
      }}
      onMouseEnter={e => {
        if (!selected) e.currentTarget.style.borderColor = accent
      }}
      onMouseLeave={e => {
        if (!selected) e.currentTarget.style.borderColor = `${accent}22`
      }}
    >
      <span
        style={{
          alignSelf: 'flex-start',
          fontSize: 8,
          fontFamily: MONO,
          letterSpacing: '0.08em',
          padding: '3px 6px',
          borderRadius: 4,
          background: `${accent}18`,
          color: accent,
        }}
      >
        CLIENTE
      </span>
      <span
        style={{
          fontSize: 9,
          fontFamily: MONO,
          color: accent,
          letterSpacing: '0.06em',
        }}
      >
        {pedido.numero}
      </span>
      <span style={{ fontSize: 14, fontWeight: 600, color: '#1A1A1A', lineHeight: 1.2 }}>
        {cliente}
      </span>
      <span
        style={{
          fontSize: 11,
          color: '#666',
          lineHeight: 1.45,
          whiteSpace: 'pre-line',
          flex: 1,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}
      >
        {resumen}
      </span>
      <span
        style={{
          fontSize: 10,
          fontFamily: MONO,
          fontWeight: 600,
          color:
            cxc?.estado === 'vencida' ? '#E24B4A' : accent,
          paddingTop: 6,
          borderTop: `1.5px solid ${accent}`,
        }}
      >
        {statusLine}
        {pedido.anticipo ? ' · Anticipo' : ''}
      </span>
    </button>
  )
}
