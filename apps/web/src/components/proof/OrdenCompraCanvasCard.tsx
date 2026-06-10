'use client'

import { fmtMoney } from '@/lib/proof/format'
import type { OrdenCompraConCxP, OrdenCompraDistribuidorWithItems } from '@/lib/supabase/distribuidor'

const PROVEEDOR_ACCENT = '#1E6FA8'
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'

type OrdenInput = OrdenCompraDistribuidorWithItems | OrdenCompraConCxP

function isRecibidaConCxP(orden: OrdenInput): orden is OrdenCompraConCxP {
  return 'cxp' in orden && orden.cxp != null
}

export function OrdenCompraCanvasCard({
  orden,
  accent = PROVEEDOR_ACCENT,
  selected = false,
  onClick,
}: {
  orden: OrdenInput
  accent?: string
  selected?: boolean
  onClick: () => void
}) {
  const recibida = isRecibidaConCxP(orden)
  const items = orden.items_orden_compra_distribuidor ?? []
  const cantidadEsperada = items.reduce((s, i) => s + i.cantidad_ordenada, 0)
  const nombre =
    items.length === 0
      ? orden.proveedor_nombre || 'Orden'
      : items.length === 1
        ? items[0]!.producto_nombre
        : items.map(i => i.producto_nombre).join(' · ')

  const statusLine = recibida
    ? `CxP ${fmtMoney(orden.cxp.saldo_pendiente)}`
    : `${cantidadEsperada} uds · ${orden.proveedor_nombre}`

  return (
    <button
      type="button"
      onClick={onClick}
      title={statusLine}
      aria-label={`Orden ${orden.numero_orden}${selected ? ', seleccionado' : ''}`}
      style={{
        width: '100%',
        textAlign: 'left',
        background: selected ? `${accent}08` : '#fff',
        border: selected ? `1.5px solid ${accent}` : `0.5px solid ${accent}22`,
        borderRadius: 12,
        padding: 14,
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
        PROVEEDOR
      </span>
      <span style={{ fontSize: 9, fontFamily: MONO, color: accent, letterSpacing: '0.06em' }}>
        {orden.numero_orden}
      </span>
      <span style={{ fontSize: 14, fontWeight: 600, color: '#1A1A1A', lineHeight: 1.2 }}>
        {orden.proveedor_nombre || nombre}
      </span>
      <span
        style={{
          fontSize: 11,
          color: '#666',
          lineHeight: 1.45,
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}
      >
        {nombre}
      </span>
      <span
        style={{
          fontSize: 10,
          fontFamily: MONO,
          fontWeight: 600,
          color: accent,
          paddingTop: 6,
          borderTop: `1.5px solid ${accent}`,
        }}
      >
        {recibida ? `Recibida · ${statusLine}` : `Por recibir · ${statusLine}`}
      </span>
    </button>
  )
}
