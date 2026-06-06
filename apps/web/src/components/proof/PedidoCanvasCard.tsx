'use client'

import type { PedidoRow } from '@/lib/supabase'
import {
  formatLineaToma,
  parseTomaPedidoNotas,
} from '@/lib/proof/toma-pedido-client'

type Props = {
  pedido: PedidoRow & { clients?: { name: string } | null }
  accent: string
  selected?: boolean
  onClick: () => void
}

export function PedidoCanvasCard({ pedido, accent, selected, onClick }: Props) {
  const toma = parseTomaPedidoNotas(pedido.notas)
  const cliente = pedido.clients?.name ?? 'Cliente'
  const lineas = toma?.lineas ?? []
  const resumen =
    lineas.length > 0
      ? lineas.map(l => `${l.etiqueta} · ${formatLineaToma(l)}`).join('\n')
      : pedido.etiqueta_nombre ?? 'Sin productos'

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        textAlign: 'left',
        padding: 14,
        borderRadius: 12,
        border: selected ? `1.5px solid ${accent}` : '0.5px solid #E8E6E0',
        background: selected ? `${accent}08` : '#fff',
        cursor: 'pointer',
        minHeight: 160,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        transition: 'border-color 0.15s ease',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = accent
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = '#E8E6E0'
      }}
    >
      <span
        style={{
          fontSize: 9,
          fontFamily: 'ui-monospace, monospace',
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
        }}
      >
        {resumen}
      </span>
      <span style={{ fontSize: 10, color: '#AAA' }}>
        Entrega {pedido.fecha_entrega}
        {pedido.anticipo ? ' · Anticipo' : ''}
      </span>
    </button>
  )
}
