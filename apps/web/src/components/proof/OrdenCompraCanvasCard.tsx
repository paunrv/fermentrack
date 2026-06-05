'use client'

import { fmtMoney } from '@/lib/proof/format'
import type { OrdenCompraConCxP, OrdenCompraDistribuidorWithItems } from '@/lib/supabase/distribuidor'

type OrdenInput = OrdenCompraDistribuidorWithItems | OrdenCompraConCxP

function isRecibidaConCxP(orden: OrdenInput): orden is OrdenCompraConCxP {
  return 'cxp' in orden && orden.cxp != null
}

export function OrdenCompraCanvasCard({
  orden,
  accent,
  selected = false,
  onClick,
}: {
  orden: OrdenInput
  accent: string
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

  const borderStyle = recibida
    ? selected
      ? `0.5px solid ${accent}`
      : '0.5px solid #E8E6E0'
    : selected
      ? `0.5px solid ${accent}`
      : `0.5px dashed ${accent}`

  return (
    <button
      type="button"
      onClick={onClick}
      title={
        recibida
          ? `CxP pendiente ${fmtMoney(orden.cxp.saldo_pendiente)} · ${orden.proveedor_nombre}`
          : `${cantidadEsperada} unidades esperadas · ${orden.proveedor_nombre}`
      }
      aria-label={
        recibida
          ? `Orden ${orden.numero_orden} recibida, CxP pendiente${selected ? ', seleccionado' : ''}`
          : `Orden ${orden.numero_orden}, ${nombre}, por recibir${selected ? ', seleccionado' : ''}`
      }
      style={{
        width: '100%',
        background: selected ? '#FAFAF8' : '#fff',
        border: borderStyle,
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
        {recibida ? '💳' : '🚚'}
      </span>
      <div
        aria-hidden
        style={{
          width: 40,
          height: 56,
          margin: '0 auto 8px',
          borderRadius: 6,
          background: recibida ? '#FFF8E8' : `${accent}12`,
          border: recibida ? '0.5px solid #E8D4A0' : `0.5px dashed ${accent}55`,
          display: 'grid',
          placeItems: 'center',
          fontSize: 18,
        }}
      >
        {recibida ? '✓' : '⏱'}
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
          {orden.numero_orden}
          {recibida ? ' · Recibida' : ` · ${cantidadEsperada} uds`}
        </div>
      </div>
      {recibida ? (
        <div
          style={{
            marginTop: 8,
            fontSize: 9,
            color: '#B8860B',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            fontWeight: 600,
          }}
        >
          CxP pendiente {fmtMoney(orden.cxp.saldo_pendiente)}
        </div>
      ) : (
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
      )}
    </button>
  )
}
