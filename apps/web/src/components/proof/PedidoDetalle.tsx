'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useProfile } from '@/context/ProfileContext'
import { useSupabase } from '@/hooks/useSupabase'
import {
  generarRemisionPedidoAction,
  obtenerRemisionPedidoAction,
} from '@/app/actions/remisiones-distribuidor'
import { fmtDateOnly, fmtMoney } from '@/lib/proof/format'
import {
  buildPedidoShareText,
  pedidoMailtoUrl,
  pedidoWhatsAppUrl,
  type PedidoShareLine,
} from '@/lib/proof/pedido-share'
import {
  formatLineaToma,
  parseTomaPedidoNotas,
} from '@/lib/proof/toma-pedido-client'
import {
  fetchPedidoWithItems,
  type EstadoPedido,
  type PedidoWithItems,
} from '@/lib/supabase/distribuidor'

const MONO = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'

function pedidoEstadoLabel(estado: EstadoPedido): string {
  const labels: Record<EstadoPedido, string> = {
    borrador: 'Borrador',
    confirmado: 'Confirmado',
    preparando: 'Preparando',
    en_ruta: 'En ruta',
    entregado: 'Entregado',
    parcial: 'Parcial',
    cancelado: 'Cancelado',
  }
  return labels[estado] ?? estado
}

function pedidoEstadoColor(estado: EstadoPedido): string {
  if (estado === 'confirmado' || estado === 'preparando' || estado === 'en_ruta') {
    return '#C2410C'
  }
  if (estado === 'entregado') return '#4CAF7D'
  if (estado === 'parcial') return '#E8A020'
  return '#999'
}

function DataPair({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 12,
        padding: '8px 0',
        borderBottom: '0.5px solid #F4F2EE',
      }}
    >
      <span style={{ fontSize: 12, color: '#AAA' }}>{label}</span>
      <span
        style={{
          fontSize: 13,
          color: valueColor ?? '#1A1A1A',
          fontFamily: MONO,
          textAlign: 'right',
        }}
      >
        {value}
      </span>
    </div>
  )
}

function PedidoDetalleSkeleton() {
  return (
    <div style={{ background: '#fff', borderBottom: '0.5px solid #EEECEA' }}>
      <div style={{ padding: '28px 24px 24px' }}>
        <div style={{ height: 10, width: 72, background: '#F4F2EE', borderRadius: 4, marginBottom: 12 }} />
        <div style={{ height: 26, width: '55%', background: '#F4F2EE', borderRadius: 4, marginBottom: 8 }} />
        <div style={{ height: 12, width: 80, background: '#F4F2EE', borderRadius: 4 }} />
      </div>
      {[0, 1, 2].map(i => (
        <div key={i} style={{ padding: '12px 24px', borderBottom: '0.5px solid #F4F2EE' }}>
          <div style={{ height: 14, width: '70%', background: '#F4F2EE', borderRadius: 4 }} />
        </div>
      ))}
    </div>
  )
}

export interface PedidoDetalleProps {
  pedidoId: string
  accent?: string
  onClose: () => void
}

export function PedidoDetalle({ pedidoId, onClose }: PedidoDetalleProps) {
  const supabase = useSupabase()
  const { scope } = useProfile()
  const [loading, setLoading] = useState(true)
  const [pedido, setPedido] = useState<PedidoWithItems | null>(null)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfError, setPdfError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!scope) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const row = await fetchPedidoWithItems(supabase, pedidoId)
      if (row && row.clerk_id !== scope.clerk_id) {
        setPedido(null)
        return
      }
      setPedido(row)
    } catch (e) {
      console.error('[PedidoDetalle] load', e)
      setPedido(null)
    } finally {
      setLoading(false)
    }
  }, [supabase, pedidoId, scope])

  useEffect(() => {
    void load()
  }, [load])

  const toma = useMemo(
    () => parseTomaPedidoNotas(pedido?.notas ?? null),
    [pedido?.notas]
  )

  const lineas = useMemo((): PedidoShareLine[] => {
    if (!pedido) return []
    if (pedido.items_pedido.length > 0) {
      return pedido.items_pedido.map(it => ({
        nombre: it.nombre,
        cantidad: it.cantidad,
        precioUnitario: Number(it.precio_unitario),
        subtotal: Number(it.subtotal),
      }))
    }
    if (toma?.lineas.length) {
      return toma.lineas.map(l => ({
        nombre: `${l.etiqueta} (${formatLineaToma(l)})`,
        cantidad: l.cantidad,
        precioUnitario: 0,
        subtotal: 0,
      }))
    }
    if (pedido.etiqueta_nombre) {
      return [
        {
          nombre: pedido.etiqueta_nombre,
          cantidad: 1,
          precioUnitario: Number(pedido.total),
          subtotal: Number(pedido.total),
        },
      ]
    }
    return []
  }, [pedido, toma])

  const subtotal = useMemo(
    () => lineas.reduce((s, l) => s + l.subtotal, 0),
    [lineas]
  )
  const total = pedido ? Number(pedido.total) : 0
  const descuento = subtotal > total && total > 0 ? subtotal - total : 0
  const anticipoMonto =
    toma?.anticipo_monto != null && toma.anticipo_monto > 0 ? toma.anticipo_monto : null

  const clienteNombre = pedido?.clients?.name ?? 'Cliente'

  const shareText = useMemo(() => {
    if (!pedido) return ''
    return buildPedidoShareText({
      numero: pedido.numero,
      cliente: clienteNombre,
      fechaEntrega: pedido.fecha_entrega,
      lineas,
      total: total > 0 ? total : subtotal,
    })
  }, [pedido, clienteNombre, lineas, total, subtotal])

  async function handlePdf() {
    if (!pedido || pedido.estado !== 'entregado') return
    setPdfLoading(true)
    setPdfError(null)
    try {
      const existing = await obtenerRemisionPedidoAction(pedido.id)
      if (existing?.downloadUrl) {
        window.open(existing.downloadUrl, '_blank', 'noopener,noreferrer')
        return
      }
      const generated = await generarRemisionPedidoAction(pedido.id)
      window.open(generated.downloadUrl, '_blank', 'noopener,noreferrer')
    } catch (e) {
      setPdfError(e instanceof Error ? e.message : 'No se pudo obtener el PDF')
    } finally {
      setPdfLoading(false)
    }
  }

  if (loading) return <PedidoDetalleSkeleton />

  if (!pedido) {
    return (
      <div
        style={{
          background: '#fff',
          borderBottom: '0.5px solid #EEECEA',
          padding: 24,
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: 13, color: '#999' }}>No se encontró el pedido.</p>
        <button
          type="button"
          onClick={onClose}
          style={{
            marginTop: 12,
            fontSize: 12,
            border: '0.5px solid #E0DDD6',
            borderRadius: 8,
            padding: '8px 16px',
            background: '#fff',
            cursor: 'pointer',
          }}
        >
          Cerrar
        </button>
      </div>
    )
  }

  const estadoColor = pedidoEstadoColor(pedido.estado)
  const canPdf = pedido.estado === 'entregado'
  const displayTotal = total > 0 ? total : subtotal

  return (
    <div style={{ background: '#fff', borderBottom: '0.5px solid #EEECEA' }}>
      {/* Header */}
      <div
        style={{
          padding: '28px 24px 20px',
          borderBottom: '0.5px solid #EEECEA',
          position: 'relative',
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar detalle"
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            width: 28,
            height: 28,
            border: '0.5px solid #E0DDD6',
            borderRadius: 8,
            background: '#fff',
            color: '#999',
            cursor: 'pointer',
            fontSize: 16,
            lineHeight: 1,
          }}
        >
          ×
        </button>

        <p
          style={{
            margin: '0 0 8px',
            fontSize: 11,
            fontFamily: MONO,
            color: '#AAA',
            letterSpacing: '0.04em',
          }}
        >
          {pedido.numero}
        </p>

        <h2
          style={{
            margin: 0,
            fontSize: 22,
            fontWeight: 500,
            color: '#1A1A1A',
            letterSpacing: '-0.02em',
            paddingRight: 36,
          }}
        >
          {clienteNombre}
        </h2>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: estadoColor,
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: 12, color: '#666' }}>{pedidoEstadoLabel(pedido.estado)}</span>
        </div>
      </div>

      {/* Datos del pedido */}
      <div style={{ padding: '16px 24px', borderBottom: '0.5px solid #EEECEA' }}>
        <p
          style={{
            margin: '0 0 8px',
            fontSize: 9,
            color: '#CCC',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            fontFamily: MONO,
          }}
        >
          Datos del pedido
        </p>
        <DataPair
          label="Fecha de pedido"
          value={fmtDateOnly(pedido.fecha_creacion ?? pedido.created_at)}
        />
        <DataPair label="Fecha de entrega" value={fmtDateOnly(pedido.fecha_entrega)} />
        {anticipoMonto != null && (
          <DataPair label="Anticipo" value={fmtMoney(anticipoMonto)} valueColor="#C2410C" />
        )}
        {pedido.condicion_pago && !anticipoMonto && (
          <DataPair label="Condición de pago" value={pedido.condicion_pago} />
        )}
        <div style={{ borderBottom: 'none' }} />
      </div>

      {/* Productos */}
      <div style={{ padding: '16px 24px', borderBottom: '0.5px solid #EEECEA' }}>
        <p
          style={{
            margin: '0 0 12px',
            fontSize: 9,
            color: '#CCC',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            fontFamily: MONO,
          }}
        >
          Productos
        </p>
        <div style={{ maxHeight: 220, overflowY: 'auto' }}>
          {lineas.length === 0 ? (
            <p style={{ margin: 0, fontSize: 12, color: '#BBB' }}>Sin líneas registradas.</p>
          ) : (
            lineas.map((l, i) => (
              <div
                key={`${l.nombre}-${i}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto auto auto',
                  gap: '8px 16px',
                  alignItems: 'baseline',
                  padding: '10px 0',
                  borderBottom: i < lineas.length - 1 ? '0.5px solid #F4F2EE' : 'none',
                }}
              >
                <span style={{ fontSize: 12, color: '#1A1A1A', lineHeight: 1.4 }}>{l.nombre}</span>
                <span style={{ fontSize: 12, fontFamily: MONO, color: '#666', whiteSpace: 'nowrap' }}>
                  {l.cantidad.toLocaleString('es-MX')}
                </span>
                <span style={{ fontSize: 12, fontFamily: MONO, color: '#999', whiteSpace: 'nowrap' }}>
                  {l.precioUnitario > 0 ? fmtMoney(l.precioUnitario) : '—'}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    fontFamily: MONO,
                    fontWeight: 600,
                    color: '#1A1A1A',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {l.subtotal > 0 ? fmtMoney(l.subtotal) : '—'}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Totales */}
      <div style={{ padding: '16px 24px', borderBottom: '0.5px solid #EEECEA' }}>
        {subtotal > 0 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: descuento > 0 ? 8 : 12,
            }}
          >
            <span style={{ fontSize: 12, color: '#AAA' }}>Subtotal</span>
            <span style={{ fontSize: 13, fontFamily: MONO, color: '#666' }}>{fmtMoney(subtotal)}</span>
          </div>
        )}
        {descuento > 0 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}
          >
            <span style={{ fontSize: 12, color: '#AAA' }}>Descuento</span>
            <span style={{ fontSize: 13, fontFamily: MONO, color: '#C2410C' }}>
              −{fmtMoney(descuento)}
            </span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: '#1A1A1A' }}>Total</span>
          <span
            style={{
              fontSize: 16,
              fontWeight: 500,
              fontFamily: MONO,
              color: '#C2410C',
            }}
          >
            {fmtMoney(displayTotal)}
          </span>
        </div>
      </div>

      {/* Acciones compartir */}
      <div
        style={{
          padding: '20px 24px 24px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        <a
          href={pedidoWhatsAppUrl(shareText)}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            flex: '1 1 140px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '12px 16px',
            borderRadius: 10,
            background: '#25D366',
            color: '#fff',
            fontSize: 13,
            fontWeight: 500,
            textDecoration: 'none',
            border: 'none',
          }}
        >
          WhatsApp
        </a>
        <a
          href={pedidoMailtoUrl(pedido.numero, clienteNombre, shareText)}
          style={{
            flex: '1 1 140px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '12px 16px',
            borderRadius: 10,
            background: '#fff',
            color: '#666',
            fontSize: 13,
            fontWeight: 500,
            textDecoration: 'none',
            border: '0.5px solid #E0DDD6',
          }}
        >
          Correo
        </a>
        <button
          type="button"
          disabled={!canPdf || pdfLoading}
          title={canPdf ? 'Descargar remisión PDF' : 'Disponible cuando el pedido esté entregado'}
          onClick={() => void handlePdf()}
          className="pedido-detalle-pdf-btn"
          style={{
            flex: '1 1 140px',
            padding: '12px 16px',
            borderRadius: 10,
            background: canPdf ? '#1A1A1A' : '#E8E6E0',
            color: canPdf ? '#fff' : '#999',
            fontSize: 13,
            fontWeight: 500,
            border: 'none',
            cursor: canPdf && !pdfLoading ? 'pointer' : 'not-allowed',
            transition: 'background 0.15s ease',
          }}
        >
          {pdfLoading ? 'Generando…' : canPdf ? 'Descargar PDF' : 'PDF al entregar'}
        </button>
      </div>

      {pdfError && (
        <p style={{ margin: '0 0 16px', padding: '0 24px', fontSize: 12, color: '#E24B4A' }}>
          {pdfError}
        </p>
      )}

      <style>{`
        .pedido-detalle-pdf-btn:not(:disabled):hover {
          background: #C2410C !important;
        }
      `}</style>
    </div>
  )
}
