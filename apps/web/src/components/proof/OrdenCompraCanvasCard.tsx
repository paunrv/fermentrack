'use client'

import type { OrdenCompraDistribuidorWithItems } from '@/lib/supabase/distribuidor'

export function OrdenCompraCanvasCard({
  orden,
  accent,
  selected = false,
  onClick,
}: {
  orden: OrdenCompraDistribuidorWithItems
  accent: string
  selected?: boolean
  onClick: () => void
}) {
  const items = orden.items_orden_compra_distribuidor ?? []
  const cantidadEsperada = items.reduce((s, i) => s + i.cantidad_ordenada, 0)
  const nombre =
    items.length === 0
      ? orden.proveedor_nombre || 'Orden'
      : items.length === 1
        ? items[0]!.producto_nombre
        : items.map(i => i.producto_nombre).join(' · ')

  return (
    <button
      type="button"
      onClick={onClick}
      title={`${cantidadEsperada} unidades esperadas · ${orden.proveedor_nombre}`}
      aria-label={`Orden ${orden.numero_orden}, ${nombre}, por recibir${selected ? ', seleccionado' : ''}`}
      style={{
        width: '100%',
        background: selected ? '#FAFAF8' : '#fff',
        border: selected ? `0.5px solid ${accent}` : `0.5px dashed ${accent}`,
        borderRadius: 12,
        padding: '16px 12px 12px',
        cursor: 'pointer',
        transition:
          'border-color 0.15s ease, transform 0.15s ease, background 0.15s ease',
        position: 'relative',
        textAlign: 'center',
      }}
      onMouseEnter={e => {
        if (selected) return
        e.currentTarget.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={e => {
        if (selected) return
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      <span
        aria-hidden
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          fontSize: 12,
          lineHeight: 1,
          opacity: 0.7,
        }}
      >
        🚚
      </span>
      <div
        aria-hidden
        style={{
          width: 40,
          height: 56,
          margin: '0 auto 8px',
          borderRadius: 6,
          background: `${accent}12`,
          border: `0.5px dashed ${accent}55`,
          display: 'grid',
          placeItems: 'center',
          fontSize: 18,
        }}
      >
        ⏱
      </div>
      <div
        style={{
          background: '#F4F2EE',
          borderRadius: 4,
          padding: '8px 8px 6px',
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 500,
            color: '#1A1A1A',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {nombre}
        </div>
        <div
          style={{
            fontSize: 9,
            color: '#999',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            marginTop: 2,
          }}
        >
          {orden.numero_orden} · {cantidadEsperada} uds
        </div>
      </div>
      <div
        style={{
          marginTop: 8,
          fontSize: 9,
          color: accent,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}
      >
        Confirmar llegada
      </div>
    </button>
  )
}
