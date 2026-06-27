'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useProfile } from '@/context/ProfileContext'
import { useSupabase } from '@/hooks/useSupabase'
import { fmtDateOnly, fmtMoney } from '@/lib/proof/format'
import { REMISIONES_BUCKET } from '@/lib/proof/storage-remisiones'
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
  fetchCuentaPorCobrarByPedidoId,
  fetchPedidoWithItems,
  fetchRemisionByPedidoId,
  rpcRegistrarPagoCliente,
  type CuentaPorCobrarRow,
  type EstadoPedido,
  type PedidoWithItems,
} from '@/lib/supabase/distribuidor'
import { PedidoFulfillmentActions } from '@/components/proof/PedidoFulfillmentActions'

const MONO = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
const CLIENTE_ACCENT = '#2D6A4F'

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
    return CLIENTE_ACCENT
  }
  if (estado === 'entregado') return '#4CAF7D'
  if (estado === 'parcial') return '#E8A020'
  return '#999'
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        margin: '0 0 10px',
        fontSize: 9,
        color: '#CCC',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        fontFamily: MONO,
      }}
    >
      {children}
    </p>
  )
}

function PedidoDetalleSkeleton() {
  return (
    <div style={{ background: '#fff', borderBottom: '0.5px solid var(--hairline)' }}>
      <div style={{ padding: '24px 24px 20px' }}>
        <div style={{ height: 10, width: 72, background: 'var(--panel-2)', borderRadius: 4, marginBottom: 12 }} />
        <div style={{ height: 26, width: '55%', background: 'var(--panel-2)', borderRadius: 4 }} />
      </div>
    </div>
  )
}

export interface PedidoDetalleProps {
  pedidoId: string
  accent?: string
  refreshKey?: number
  onClose: () => void
}

async function fetchWithTimeout<T>(promise: Promise<T>, ms = 12_000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error('La consulta tardó demasiado')), ms)
    }),
  ])
}

export function PedidoDetalle({ pedidoId, refreshKey = 0, onClose }: PedidoDetalleProps) {
  const supabase = useSupabase()
  const { scope } = useProfile()
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [pedido, setPedido] = useState<PedidoWithItems | null>(null)
  const [cuenta, setCuenta] = useState<CuentaPorCobrarRow | null>(null)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfError, setPdfError] = useState<string | null>(null)
  const [pagoOpen, setPagoOpen] = useState(false)
  const [pagoMonto, setPagoMonto] = useState('')
  const [pagoLoading, setPagoLoading] = useState(false)
  const [pagoError, setPagoError] = useState<string | null>(null)
  const [refreshTick, setRefreshTick] = useState(0)
  const pedidoRef = useRef<PedidoWithItems | null>(null)
  pedidoRef.current = pedido

  useEffect(() => {
    let cancelled = false
    const silent = pedidoRef.current != null && refreshKey > 0
    if (!silent) {
      setLoading(true)
      setPedido(null)
    }
    setLoadError(null)

    void fetchWithTimeout(
      Promise.all([
        fetchPedidoWithItems(supabase, pedidoId),
        scope
          ? fetchCuentaPorCobrarByPedidoId(supabase, pedidoId, scope).catch(() => null)
          : Promise.resolve(null),
      ])
    )
      .then(([row, cxcRow]) => {
        if (cancelled) return
        if (row && scope && row.user_id !== scope.user_id) {
          setPedido(null)
          setCuenta(null)
          setLoadError('No se encontró el pedido.')
          return
        }
        setPedido(row)
        setCuenta(cxcRow)
      })
      .catch(e => {
        if (cancelled) return
        console.error('[PedidoDetalle] load', e)
        if (!silent) setPedido(null)
        setLoadError(e instanceof Error ? e.message : 'Error al cargar pedido')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [supabase, pedidoId, refreshKey, refreshTick, scope?.user_id])

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

  const subtotal = useMemo(() => lineas.reduce((s, l) => s + l.subtotal, 0), [lineas])
  const total = pedido ? Number(pedido.total) : 0
  const clienteNombre = pedido?.clients?.name ?? 'Cliente'
  const displayTotal = total > 0 ? total : subtotal

  const shareText = useMemo(() => {
    if (!pedido) return ''
    return buildPedidoShareText({
      numero: pedido.numero,
      cliente: clienteNombre,
      fechaEntrega: pedido.fecha_entrega,
      lineas,
      total: displayTotal,
    })
  }, [pedido, clienteNombre, lineas, displayTotal])

  async function handlePdf() {
    if (!pedido) return
    setPdfLoading(true)
    setPdfError(null)
    try {
      const entregado = pedido.estado === 'entregado' || pedido.estado === 'parcial'
      if (entregado && scope) {
        const remision = await fetchRemisionByPedidoId(supabase, pedido.id, scope)
        const path = remision?.pdf_url?.trim()
        if (path) {
          const { data, error } = await supabase.storage
            .from(REMISIONES_BUCKET)
            .createSignedUrl(path, 60 * 60)
          if (error) throw error
          if (data?.signedUrl) {
            window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
            return
          }
        }
      }

      const pdfLineas = lineas.map(l => ({
        producto: l.nombre,
        cantidad: l.cantidad,
        precioUnitario: l.precioUnitario,
        subtotal:
          l.subtotal > 0
            ? l.subtotal
            : l.precioUnitario > 0
              ? l.cantidad * l.precioUnitario
              : 0,
      }))

      const { downloadPedidoPreviewPdf } = await import('@/lib/proof/pedido-preview-pdf')
      downloadPedidoPreviewPdf({
        numeroPedido: pedido.numero,
        clienteNombre,
        fechaPedido: pedido.fecha_creacion ?? pedido.created_at,
        fechaEntrega: pedido.fecha_entrega,
        lineas: pdfLineas,
        subtotal: subtotal > 0 ? subtotal : displayTotal,
        total: displayTotal,
      })
    } catch (e) {
      setPdfError(e instanceof Error ? e.message : 'No se pudo obtener el PDF')
    } finally {
      setPdfLoading(false)
    }
  }

  async function handleRegistrarPago() {
    if (!cuenta) return
    const monto = Number(pagoMonto.replace(/,/g, ''))
    if (!Number.isFinite(monto) || monto <= 0) {
      setPagoError('Ingresa un monto válido')
      return
    }
    setPagoLoading(true)
    setPagoError(null)
    try {
      const updated = await rpcRegistrarPagoCliente(supabase, cuenta.id, monto)
      setCuenta(updated)
      setPagoOpen(false)
      setPagoMonto('')
    } catch (e) {
      setPagoError(e instanceof Error ? e.message : 'No se pudo registrar el pago')
    } finally {
      setPagoLoading(false)
    }
  }

  const cuentaVencida =
    cuenta != null &&
    cuenta.estado !== 'pagada' &&
    cuenta.fecha_vencimiento != null &&
    cuenta.fecha_vencimiento <
      new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })

  if (loading && !pedido) return <PedidoDetalleSkeleton />

  if (!pedido) {
    return (
      <div
        style={{
          background: '#fff',
          borderBottom: '0.5px solid var(--hairline)',
          padding: 24,
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: 13, color: '#999' }}>
          {loadError ?? 'No se encontró el pedido.'}
        </p>
        <button
          type="button"
          onClick={onClose}
          style={{
            marginTop: 12,
            fontSize: 12,
            border: '0.5px solid var(--line)',
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
  const condicionPago = pedido.condicion_pago ?? '—'
  const showCobro =
    pedido.estado === 'entregado' &&
    cuenta != null &&
    Number(cuenta.saldo_pendiente) > 0

  return (
    <div style={{ background: '#fff', borderBottom: '0.5px solid var(--hairline)' }}>
      {/* HERO */}
      <div
        style={{
          padding: '24px 24px 16px',
          borderBottom: '0.5px solid var(--hairline)',
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
            border: '0.5px solid var(--line)',
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

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 16,
            paddingRight: 36,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                margin: '0 0 6px',
                fontSize: 9,
                fontFamily: MONO,
                color: '#AAA',
                letterSpacing: '0.06em',
              }}
            >
              {pedido.numero}
            </p>
            <h2
              style={{
                margin: 0,
                fontSize: 22,
                fontWeight: 500,
                color: 'var(--fg-0)',
                letterSpacing: '-0.02em',
                lineHeight: 1.2,
              }}
            >
              {clienteNombre}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: estadoColor,
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: 11, fontFamily: MONO, color: '#666' }}>
                {pedidoEstadoLabel(pedido.estado)}
              </span>
              <span style={{ fontSize: 11, color: '#CCC' }}>·</span>
              <span style={{ fontSize: 11, fontFamily: MONO, color: '#888' }}>
                {condicionPago}
              </span>
            </div>
            {cuenta &&
              cuenta.estado !== 'pagada' &&
              cuenta.fecha_vencimiento &&
              Number(cuenta.saldo_pendiente) > 0 && (
                <p
                  style={{
                    margin: '8px 0 0',
                    fontSize: 11,
                    fontFamily: MONO,
                    color: cuentaVencida || cuenta.estado === 'vencida' ? '#E24B4A' : '#888',
                  }}
                >
                  Vence {fmtDateOnly(cuenta.fecha_vencimiento)}
                </p>
              )}
          </div>
          <span
            style={{
              fontSize: 22,
              fontWeight: 500,
              fontFamily: MONO,
              color: 'var(--fg-0)',
              flexShrink: 0,
            }}
          >
            {fmtMoney(displayTotal)}
          </span>
        </div>
      </div>

      {/* DATOS */}
      <div style={{ padding: '14px 24px', borderBottom: '0.5px solid var(--hairline)' }}>
        <SectionLabel>Datos</SectionLabel>
        <p style={{ margin: 0, fontSize: 12, color: '#666', fontFamily: MONO }}>
          Pedido {fmtDateOnly(pedido.fecha_creacion ?? pedido.created_at)} · Entrega{' '}
          {fmtDateOnly(pedido.fecha_entrega)}
        </p>
      </div>

      {/* PRODUCTOS */}
      <div style={{ padding: '14px 24px', borderBottom: '0.5px solid var(--hairline)' }}>
        <SectionLabel>Productos</SectionLabel>
        {lineas.length === 0 ? (
          <p style={{ margin: 0, fontSize: 12, color: '#BBB' }}>Sin líneas registradas.</p>
        ) : (
          lineas.map((l, i) => (
            <div
              key={`${l.nombre}-${i}`}
              style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                gap: 12,
                padding: '8px 0',
                borderBottom: i < lineas.length - 1 ? '0.5px solid var(--panel-2)' : 'none',
              }}
            >
              <span style={{ fontSize: 12, color: 'var(--fg-0)', flex: 1, lineHeight: 1.4 }}>
                {l.nombre}
              </span>
              <span style={{ fontSize: 11, fontFamily: MONO, color: '#888', whiteSpace: 'nowrap' }}>
                {l.cantidad.toLocaleString('es-MX')} ×{' '}
                {l.precioUnitario > 0 ? fmtMoney(l.precioUnitario) : '—'}
              </span>
              <span
                style={{
                  fontSize: 12,
                  fontFamily: MONO,
                  fontWeight: 600,
                  color: 'var(--fg-0)',
                  whiteSpace: 'nowrap',
                  minWidth: 72,
                  textAlign: 'right',
                }}
              >
                {l.subtotal > 0 ? fmtMoney(l.subtotal) : '—'}
              </span>
            </div>
          ))
        )}
      </div>

      {/* COBRO */}
      {showCobro && cuenta && (
        <div style={{ padding: '14px 24px', borderBottom: '0.5px solid var(--hairline)' }}>
          <SectionLabel>Cobro</SectionLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 20px' }}>
            <CobroStat
              label="Saldo pendiente"
              value={fmtMoney(Number(cuenta.saldo_pendiente))}
              tone={cuentaVencida || cuenta.estado === 'vencida' ? '#E24B4A' : CLIENTE_ACCENT}
            />
            <CobroStat label="Pagado" value={fmtMoney(Number(cuenta.monto_pagado))} />
            {cuenta.fecha_vencimiento && (
              <CobroStat
                label="Vence"
                value={fmtDateOnly(cuenta.fecha_vencimiento)}
                tone={cuentaVencida || cuenta.estado === 'vencida' ? '#E24B4A' : undefined}
              />
            )}
          </div>
          {!pagoOpen ? (
            <button
              type="button"
              onClick={() => {
                setPagoOpen(true)
                setPagoMonto(String(Number(cuenta.saldo_pendiente)))
                setPagoError(null)
              }}
              style={{
                marginTop: 12,
                width: '100%',
                padding: '10px 16px',
                borderRadius: 8,
                border: `0.5px solid ${CLIENTE_ACCENT}44`,
                background: `${CLIENTE_ACCENT}08`,
                fontSize: 13,
                fontWeight: 500,
                color: CLIENTE_ACCENT,
                cursor: 'pointer',
              }}
            >
              Registrar pago
            </button>
          ) : (
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input
                type="number"
                min={0}
                step="0.01"
                value={pagoMonto}
                onChange={e => setPagoMonto(e.target.value)}
                placeholder="Monto"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '0.5px solid var(--line)',
                  fontSize: 13,
                  fontFamily: MONO,
                }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  disabled={pagoLoading}
                  onClick={() => void handleRegistrarPago()}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    borderRadius: 8,
                    border: 'none',
                    background: CLIENTE_ACCENT,
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: pagoLoading ? 'wait' : 'pointer',
                  }}
                >
                  {pagoLoading ? 'Guardando…' : 'Confirmar pago'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPagoOpen(false)
                    setPagoError(null)
                  }}
                  style={{
                    padding: '10px 16px',
                    borderRadius: 8,
                    border: '0.5px solid var(--line)',
                    background: '#fff',
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
          {pagoError && (
            <p style={{ margin: '8px 0 0', fontSize: 12, color: '#E24B4A' }}>{pagoError}</p>
          )}
        </div>
      )}

      {/* ACCIONES */}
      <div
        style={{
          padding: '20px 24px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <PedidoFulfillmentActions
          pedidoId={pedido.id}
          numero={pedido.numero}
          estado={pedido.estado}
          accent={CLIENTE_ACCENT}
          fullWidth
          onUpdated={() => setRefreshTick(n => n + 1)}
        />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        <a
          href={pedidoWhatsAppUrl(shareText)}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            flex: '1 1 120px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '12px 16px',
            borderRadius: 10,
            background: '#25D366',
            color: '#fff',
            fontSize: 13,
            fontWeight: 500,
            textDecoration: 'none',
          }}
        >
          WhatsApp
        </a>
        <a
          href={pedidoMailtoUrl(pedido.numero, clienteNombre, shareText)}
          style={{
            flex: '1 1 120px',
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
            border: '0.5px solid var(--line)',
          }}
        >
          Correo
        </a>
        <button
          type="button"
          disabled={pdfLoading}
          onClick={() => void handlePdf()}
          style={{
            flex: '1 1 120px',
            padding: '12px 16px',
            borderRadius: 10,
            background: 'var(--fg-0)',
            color: '#fff',
            fontSize: 13,
            fontWeight: 500,
            border: 'none',
            cursor: pdfLoading ? 'wait' : 'pointer',
          }}
        >
          {pdfLoading ? 'Generando…' : 'PDF'}
        </button>
        </div>
      </div>

      {pdfError && (
        <p style={{ margin: '0 0 16px', padding: '0 24px', fontSize: 12, color: '#E24B4A' }}>
          {pdfError}
        </p>
      )}
    </div>
  )
}

function CobroStat({
  label,
  value,
  tone = 'var(--fg-0)',
}: {
  label: string
  value: string
  tone?: string
}) {
  return (
    <div>
      <div style={{ fontSize: 9, fontFamily: MONO, color: '#AAA', letterSpacing: '0.06em' }}>
        {label}
      </div>
      <div style={{ fontSize: 14, fontFamily: MONO, fontWeight: 600, color: tone, marginTop: 2 }}>
        {value}
      </div>
    </div>
  )
}
