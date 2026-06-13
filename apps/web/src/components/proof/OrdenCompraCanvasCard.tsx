'use client'

import { fmtMoney, parseDateOnlyLocal } from '@/lib/proof/format'
import type {
  ItemOrdenCompraDistribuidorRow,
  OrdenCompraConCxP,
  OrdenCompraDistribuidorWithItems,
  PagoProveedorRow,
} from '@/lib/supabase/distribuidor'

const MONO = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
const FG = 'var(--fg-0)'

type OrdenInput = OrdenCompraDistribuidorWithItems | OrdenCompraConCxP
type CardEstado = 'en_transito' | 'recibida' | 'problema'

const ESTADO_STYLE = {
  en_transito: {
    dot: '#F59E0B',
    text: 'En tránsito',
    border: '#F59E0B22',
    line: '#F59E0B',
  },
  recibida: {
    dot: '#4CAF7D',
    text: 'Recibida',
    border: '#4CAF7D22',
    line: '#4CAF7D',
  },
  problema: {
    dot: '#E24B4A',
    text: 'Requiere atención',
    border: '#E24B4A22',
    line: '#E24B4A',
  },
} as const

function isConCxP(orden: OrdenInput): orden is OrdenCompraConCxP {
  return 'cxp' in orden && orden.cxp != null
}

function hasDiscrepancia(items: ItemOrdenCompraDistribuidorRow[]): boolean {
  return items.some(
    i => i.cantidad_recibida != null && i.cantidad_recibida !== i.cantidad_ordenada
  )
}

function resolveCardEstado(orden: OrdenInput): CardEstado {
  if (orden.estado === 'cancelada' || hasDiscrepancia(orden.items_orden_compra_distribuidor ?? [])) {
    return 'problema'
  }
  if (orden.estado === 'recibida' || orden.estado === 'parcial') {
    return 'recibida'
  }
  return 'en_transito'
}

function buildConcepto(items: ItemOrdenCompraDistribuidorRow[]): string {
  if (items.length === 0) return 'Sin productos'
  if (items.length === 1) {
    const it = items[0]!
    if (it.cantidad_ordenada > 1) {
      return `${it.cantidad_ordenada} ${it.producto_nombre}`
    }
    return it.producto_nombre
  }
  return items.map(i => i.producto_nombre).join(' · ')
}

function fmtApertura(iso: string): string {
  return parseDateOnlyLocal(iso).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
  })
}

function ordinalPago(n: number): string {
  const map = ['1er', '2do', '3er', '4to', '5to', '6to', '7mo', '8vo', '9no', '10mo']
  return map[n - 1] ?? `${n}º`
}

function fmtPagoFecha(fecha: string): string {
  return parseDateOnlyLocal(fecha).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
  })
}

function montoOrden(orden: OrdenInput): number {
  const cxp = isConCxP(orden) ? orden.cxp : null
  if (cxp) return Number(cxp.monto_total)
  if (Number(orden.total_acordado) > 0) return Number(orden.total_acordado)
  const items = orden.items_orden_compra_distribuidor ?? []
  return items.reduce((s, i) => s + Number(i.subtotal ?? i.cantidad_ordenada * i.costo_unitario), 0)
}

export function OrdenCompraCanvasCard({
  orden,
  selected = false,
  onClick,
}: {
  orden: OrdenInput
  accent?: string
  selected?: boolean
  onClick: () => void
}) {
  const cardEstado = resolveCardEstado(orden)
  const style = ESTADO_STYLE[cardEstado]
  const items = orden.items_orden_compra_distribuidor ?? []
  const concepto = buildConcepto(items)
  const cxp = isConCxP(orden) ? orden.cxp : null
  const pagos: PagoProveedorRow[] = cxp?.pagos ?? []
  const liquidado = cxp != null && Number(cxp.saldo_pendiente) <= 0
  const statusLineColor =
    cardEstado === 'problema'
      ? ESTADO_STYLE.problema.line
      : liquidado && cardEstado === 'recibida'
        ? ESTADO_STYLE.recibida.line
        : style.line

  const pagoLabel =
    cardEstado === 'en_transito' || !cxp
      ? 'Total'
      : liquidado
        ? 'Liquidado'
        : 'Saldo'
  const pagoValor =
    cardEstado === 'en_transito' || !cxp
      ? montoOrden(orden)
      : liquidado
        ? Number(cxp.monto_total)
        : Number(cxp.saldo_pendiente)

  const borderColor = selected ? FG : style.border

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Orden ${orden.numero_orden}${selected ? ', seleccionado' : ''}`}
      style={{
        width: '100%',
        textAlign: 'left',
        background: selected ? 'var(--panel-2)' : '#fff',
        border: selected ? `1.5px solid ${FG}` : `0.5px solid ${borderColor}`,
        borderRadius: 12,
        padding: 0,
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transition: 'border-color 0.15s ease',
      }}
    >
      <div style={{ padding: '14px 14px 10px' }}>
        <div
          style={{
            fontSize: 9,
            fontFamily: MONO,
            color: '#AAA',
            letterSpacing: '0.04em',
            marginBottom: 6,
          }}
        >
          {orden.numero_orden} · {orden.proveedor_nombre || 'Proveedor'}
        </div>
        <div
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: FG,
            lineHeight: 1.3,
            marginBottom: 6,
          }}
        >
          {concepto}
        </div>
        <div style={{ fontSize: 10, fontFamily: MONO, color: '#CCC' }}>
          {fmtApertura(orden.created_at)}
        </div>
      </div>

      <div
        style={{
          padding: '10px 14px 15px',
          borderTop: '0.5px solid var(--panel-2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <span
            className={cardEstado === 'problema' ? 'oc-card-dot-pulse' : undefined}
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: style.dot,
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: 10,
              fontFamily: MONO,
              color: style.dot,
              letterSpacing: '0.02em',
            }}
          >
            {style.text}
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            gap: 8,
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontFamily: MONO,
              color: pagoLabel === 'Liquidado' ? '#4CAF7D' : '#AAA',
            }}
          >
            {pagoLabel}
          </span>
          <span
            style={{
              fontSize: 12,
              fontFamily: MONO,
              fontWeight: 600,
              color: FG,
            }}
          >
            {fmtMoney(pagoValor)}
          </span>
        </div>

        {pagos.length > 0 && (
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 3 }}>
            {pagos.map((p, i) => (
              <div
                key={p.id}
                style={{
                  fontSize: 10,
                  fontFamily: MONO,
                  color: '#BBB',
                }}
              >
                {ordinalPago(i + 1)} pago {fmtMoney(Number(p.monto))} · {fmtPagoFecha(p.fecha_pago)}
              </div>
            ))}
          </div>
        )}
      </div>

      <span
        aria-hidden
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 3,
          background: statusLineColor,
        }}
      />

      <style>{`
        @keyframes oc-dot-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.45; transform: scale(0.85); }
        }
        .oc-card-dot-pulse {
          animation: oc-dot-pulse 1.4s ease-in-out infinite;
        }
      `}</style>
    </button>
  )
}
