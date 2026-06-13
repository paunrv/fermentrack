'use client'

import type { PedidoRow } from '@/lib/supabase'
import { fmtMoney, parseDateOnlyLocal } from '@/lib/proof/format'
import type { EstadoCuentaPorCobrar } from '@/lib/supabase/distribuidor'
import {
  formatLineaToma,
  parseTomaPedidoNotas,
} from '@/lib/proof/toma-pedido-client'

const CLIENTE_ACCENT = '#2D6A4F'
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
const FG = 'var(--fg-0)'

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

function fmtApertura(iso: string): string {
  return parseDateOnlyLocal(iso).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
  })
}

function buildConcepto(
  pedido: PedidoRow,
  lineas: NonNullable<ReturnType<typeof parseTomaPedidoNotas>>['lineas']
): string {
  if (lineas.length > 0) {
    return lineas.map(l => `${l.etiqueta} · ${formatLineaToma(l)}`).join(' · ')
  }
  return pedido.etiqueta_nombre ?? 'Sin productos'
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
  const concepto = buildConcepto(pedido, lineas)
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
        width: '100%',
        textAlign: 'left',
        padding: 14,
        borderRadius: 12,
        border: selected ? `1.5px solid ${FG}` : `0.5px solid ${accent}22`,
        background: selected ? 'var(--panel-2)' : '#fff',
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
      <div>
        <div
          style={{
            fontSize: 9,
            fontFamily: MONO,
            color: '#AAA',
            letterSpacing: '0.04em',
            marginBottom: 6,
          }}
        >
          {pedido.numero} · {cliente}
        </div>
        <div
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: FG,
            lineHeight: 1.3,
            marginBottom: 6,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {concepto}
        </div>
        <div style={{ fontSize: 10, fontFamily: MONO, color: '#CCC' }}>
          {fmtApertura(pedido.fecha_creacion || pedido.created_at)}
        </div>
      </div>

      <span
        style={{
          fontSize: 10,
          fontFamily: MONO,
          fontWeight: 600,
          color: cxc?.estado === 'vencida' ? '#E24B4A' : accent,
          paddingTop: 6,
          marginTop: 'auto',
          borderTop: `1.5px solid ${accent}`,
        }}
      >
        {statusLine}
        {pedido.anticipo ? ' · Anticipo' : ''}
      </span>
    </button>
  )
}
