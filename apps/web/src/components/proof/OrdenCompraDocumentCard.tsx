'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useProfile } from '@/context/ProfileContext'
import { useSupabase } from '@/hooks/useSupabase'
import {
  CategoriaLiquidoBadge,
  CategoriaLiquidoPicker,
} from '@/components/proof/CategoriaLiquidoBadge'
import { fmtMoney, parseDateOnlyLocal } from '@/lib/proof/format'
import {
  resolveOrdenCompraItemCategoria,
  uniqueCategoriasOrdenCompraItems,
} from '@/lib/proof/categoria-liquido'
import {
  buildOrdenCompraShareText,
  ordenCompraMailtoUrl,
  ordenCompraWhatsAppUrl,
} from '@/lib/proof/orden-compra-share'
import { PROOF_CANVAS_CONTENT_WIDTH } from '@/lib/proof/proof-canvas-copy'
import type {
  ItemOrdenCompraDistribuidorRow,
  OrdenCompraDistribuidorWithItems,
  PagoProveedorRow,
} from '@/lib/supabase/distribuidor'
import {
  confirmarLlegadaOrdenCompraDistribuidor,
  fetchCuentaPorPagarByOrdenId,
  fetchOrdenCompraDistribuidorWithItems,
  lineasRecepcionCompleta,
  pendienteIngresoUnidades,
  rpcRegistrarPagoProveedor,
  updateSkuCartera,
  type MetodoPagoProveedor,
} from '@/lib/supabase/distribuidor'
import type { CategoriaLiquido } from '@/lib/proof/types'

const field: React.CSSProperties = {
  width: '100%',
  marginTop: 4,
  padding: '8px 10px',
  background: 'var(--panel-2)',
  border: '0.5px solid var(--hairline)',
  borderRadius: 8,
  fontSize: 12,
  color: 'var(--fg-0)',
  outline: 'none',
}

const METODOS_PAGO: { value: MetodoPagoProveedor; label: string }[] = [
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'cheque', label: 'Cheque' },
]

type LineaForm = {
  item_id: string
  producto_nombre: string
  cantidad_ordenada: number
  cantidad_recibida: number
}

function DetalleSkeleton() {
  return (
    <div
      style={{
        background: 'var(--color-background-primary)',
        borderBottom: '0.5px solid var(--color-border-tertiary)',
      }}
    >
      <div style={{ padding: '28px 24px 24px', maxWidth: PROOF_CANVAS_CONTENT_WIDTH, margin: '0 auto' }}>
        <div
          style={{
            height: 28,
            width: '50%',
            background: 'var(--panel-2)',
            borderRadius: 4,
            marginBottom: 8,
          }}
        />
        <div style={{ height: 12, width: '35%', background: 'var(--panel-2)', borderRadius: 4 }} />
      </div>
    </div>
  )
}

function estadoLabel(estado: string): string {
  switch (estado) {
    case 'recibida':
      return 'Recibida'
    case 'parcial':
      return 'Recepción parcial'
    case 'cancelada':
      return 'Cancelada'
    default:
      return 'En tránsito'
  }
}

export function OrdenCompraDocumentCard({
  ordenId,
  accent,
  onClose,
  onUpdated,
}: {
  ordenId: string
  accent: string
  onClose?: () => void
  onUpdated?: () => void
}) {
  const supabase = useSupabase()
  const { scope } = useProfile()
  const [loading, setLoading] = useState(true)
  const [orden, setOrden] = useState<OrdenCompraDistribuidorWithItems | null>(null)
  const [pagos, setPagos] = useState<PagoProveedorRow[]>([])
  const [cxp, setCxp] = useState<{
    id: string
    monto_total: number
    monto_pagado: number
    saldo_pendiente: number
  } | null>(null)
  const [lineas, setLineas] = useState<LineaForm[]>([])
  const [confirming, setConfirming] = useState(false)
  const [showAjusteRecepcion, setShowAjusteRecepcion] = useState(false)
  const [savingCategoriaSkuId, setSavingCategoriaSkuId] = useState<string | null>(null)
  const [pagoMonto, setPagoMonto] = useState('')
  const [pagoMetodo, setPagoMetodo] = useState<MetodoPagoProveedor>('transferencia')
  const [pagoLoading, setPagoLoading] = useState(false)
  const [pagoError, setPagoError] = useState<string | null>(null)
  const [showAjustePago, setShowAjustePago] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchOrdenCompraDistribuidorWithItems(supabase, ordenId)
      setOrden(data)
      const items = data?.items_orden_compra_distribuidor ?? []
      setLineas(
        items.map((it: ItemOrdenCompraDistribuidorRow) => ({
          item_id: it.id,
          producto_nombre: it.producto_nombre,
          cantidad_ordenada: it.cantidad_ordenada,
          cantidad_recibida:
            it.cantidad_recibida != null ? it.cantidad_recibida : it.cantidad_ordenada,
        }))
      )

      const cuenta = await fetchCuentaPorPagarByOrdenId(supabase, ordenId)
      if (cuenta) {
        const saldo = Number(cuenta.cuenta.saldo_pendiente)
        setCxp({
          id: cuenta.cuenta.id,
          monto_total: Number(cuenta.cuenta.monto_total),
          monto_pagado: Number(cuenta.cuenta.monto_pagado),
          saldo_pendiente: saldo,
        })
        setPagoMonto(saldo > 0 ? String(saldo) : '')
        setPagos(cuenta.pagos)
      } else {
        setCxp(null)
        setPagos([])
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando orden')
    } finally {
      setLoading(false)
    }
  }, [ordenId, supabase])

  useEffect(() => {
    void reload()
  }, [reload])

  const puedeConfirmar = orden != null && ['pendiente', 'parcial'].includes(orden.estado)
  const recibida = orden != null && (orden.estado === 'recibida' || orden.estado === 'parcial')
  const items = orden?.items_orden_compra_distribuidor ?? []
  const pendienteIngreso = pendienteIngresoUnidades(items)

  const totalRecibido = useMemo(
    () => lineas.reduce((s, l) => s + (Number(l.cantidad_recibida) || 0), 0),
    [lineas]
  )

  const shareText = useMemo(() => {
    if (!orden) return ''
    const items = orden.items_orden_compra_distribuidor ?? []
    return buildOrdenCompraShareText({
      numero: orden.numero_orden,
      proveedor: orden.proveedor_nombre,
      fecha: orden.created_at,
      estado: orden.estado,
      lineas: items.map(it => ({
        producto_nombre: it.producto_nombre,
        cantidad_ordenada: it.cantidad_ordenada,
        cantidad_recibida: it.cantidad_recibida,
      })),
      cxp: cxp ? { ...cxp, pagos } : null,
    })
  }, [orden, cxp, pagos])

  const updateLinea = useCallback((index: number, patch: Partial<LineaForm>) => {
    setLineas(prev => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)))
  }, [])

  const handleConfirmar = async (lineasConfirmar: { item_id: string; cantidad_recibida: number }[]) => {
    if (!orden) return
    setConfirming(true)
    setError(null)
    try {
      await confirmarLlegadaOrdenCompraDistribuidor(supabase, orden.id, lineasConfirmar)
      setShowAjusteRecepcion(false)
      await reload()
      onUpdated?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo confirmar la llegada')
    } finally {
      setConfirming(false)
    }
  }

  const handleConfirmarIngresoCompleto = () => {
    if (!orden || items.length === 0) return
    void handleConfirmar(lineasRecepcionCompleta(items))
  }

  const handleCategoriaChange = async (skuId: string, categoria: CategoriaLiquido) => {
    if (!scope) return
    setSavingCategoriaSkuId(skuId)
    setError(null)
    try {
      await updateSkuCartera(supabase, scope, skuId, { categoria_liquido: categoria })
      await reload()
      onUpdated?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo actualizar la categoría')
    } finally {
      setSavingCategoriaSkuId(null)
    }
  }

  const handleRegistrarPago = async (montoOverride?: number) => {
    if (!cxp || cxp.saldo_pendiente <= 0) return
    const monto =
      montoOverride ?? Number(String(pagoMonto).replace(/,/g, '').trim())
    if (!Number.isFinite(monto) || monto <= 0) {
      setPagoError('Ingresa un monto válido')
      return
    }
    if (monto > cxp.saldo_pendiente + 0.01) {
      setPagoError(`El monto no puede superar el saldo (${fmtMoney(cxp.saldo_pendiente)})`)
      return
    }
    setPagoLoading(true)
    setPagoError(null)
    try {
      await rpcRegistrarPagoProveedor(supabase, cxp.id, monto, pagoMetodo)
      setShowAjustePago(false)
      await reload()
      onUpdated?.()
    } catch (e) {
      setPagoError(e instanceof Error ? e.message : 'No se pudo registrar el pago')
    } finally {
      setPagoLoading(false)
    }
  }

  const handleLiquidarSaldo = () => {
    if (!cxp) return
    setPagoMonto(String(cxp.saldo_pendiente))
    void handleRegistrarPago(cxp.saldo_pendiente)
  }

  if (loading) return <DetalleSkeleton />
  if (!orden) {
    return (
      <div
        style={{
          padding: 24,
          background: 'var(--color-background-primary)',
          borderBottom: '0.5px solid var(--color-border-tertiary)',
        }}
      >
        <p style={{ margin: 0, fontSize: 13, color: '#888' }}>Orden no encontrada.</p>
      </div>
    )
  }

  const itemsDisplay = orden.items_orden_compra_distribuidor ?? []
  const categoriasOrden = uniqueCategoriasOrdenCompraItems(itemsDisplay)
  const titulo =
    itemsDisplay.length === 1 ? itemsDisplay[0]!.producto_nombre : `${itemsDisplay.length} productos`
  const fechaOrden = parseDateOnlyLocal(orden.created_at).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  return (
    <article
      aria-label={`Orden de compra ${orden.numero_orden}`}
      style={{
        background: 'var(--color-background-primary)',
        borderBottom: '0.5px solid var(--color-border-tertiary)',
      }}
    >
      <div style={{ maxWidth: PROOF_CANVAS_CONTENT_WIDTH, margin: '0 auto' }}>
        <header style={{ padding: '24px 20px 16px', position: 'relative' }}>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                border: 'none',
                background: 'transparent',
                color: 'var(--color-text-tertiary)',
                cursor: 'pointer',
                fontSize: 18,
                lineHeight: 1,
              }}
            >
              ×
            </button>
          ) : null}
          <div
            style={{
              fontSize: 10,
              fontFamily: 'ui-monospace, monospace',
              textTransform: 'uppercase',
              color: 'var(--color-text-tertiary)',
              letterSpacing: '0.08em',
              marginBottom: 8,
            }}
          >
            Orden de compra · {orden.numero_orden}
          </div>
          <h2
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 500,
              color: 'var(--color-text-primary)',
              letterSpacing: '-0.02em',
              paddingRight: onClose ? 28 : 0,
              fontFamily: 'var(--font-display)',
            }}
          >
            {titulo}
          </h2>
          <p
            style={{
              margin: '6px 0 0',
              fontSize: 12,
              color: 'var(--color-text-tertiary)',
              fontFamily: 'var(--font-display)',
            }}
          >
            {orden.proveedor_nombre} · {fechaOrden}
          </p>
          <p
            style={{
              margin: '8px 0 0',
              fontSize: 11,
              fontFamily: 'ui-monospace, monospace',
              color: accent,
            }}
          >
            {estadoLabel(orden.estado)}
          </p>
          {categoriasOrden.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
              {categoriasOrden.map(cat => (
                <CategoriaLiquidoBadge key={cat} categoria={cat} />
              ))}
            </div>
          ) : null}
        </header>

        <section style={{ padding: '0 20px 16px' }}>
          {itemsDisplay.map((it, i) => {
            const categoria = resolveOrdenCompraItemCategoria(it)
            const skuId = it.sku_id ?? it.skus?.id ?? null
            return (
            <div
              key={it.id}
              style={{
                padding: '10px 0',
                borderTop: i ? '0.5px solid var(--color-border-tertiary)' : undefined,
                fontSize: 13,
                fontFamily: 'var(--font-display)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' }}>
                <div style={{ fontWeight: 500, color: 'var(--color-text-primary)', flex: 1 }}>
                  {it.producto_nombre}
                </div>
                {!skuId ? <CategoriaLiquidoBadge categoria={categoria} /> : null}
              </div>
              {skuId ? (
                <CategoriaLiquidoPicker
                  value={categoria}
                  saving={savingCategoriaSkuId === skuId}
                  onChange={cat => void handleCategoriaChange(skuId, cat)}
                />
              ) : null}
              <div style={{ marginTop: 4, fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                {recibida && it.cantidad_recibida != null
                  ? `${it.cantidad_recibida} / ${it.cantidad_ordenada} uds`
                  : `${it.cantidad_ordenada} uds`}
                {Number(it.costo_unitario) > 0
                  ? ` · ${fmtMoney(Number(it.costo_unitario))}/ud`
                  : ''}
              </div>
            </div>
            )
          })}
        </section>

        {puedeConfirmar && pendienteIngreso > 0 ? (
          <section
            style={{
              margin: '0 20px 16px',
              padding: 14,
              borderRadius: 12,
              border: `0.5px solid color-mix(in srgb, ${accent} 35%, var(--color-border-tertiary))`,
              background: `color-mix(in srgb, ${accent} 8%, var(--color-background-primary))`,
            }}
          >
            <p
              style={{
                margin: '0 0 10px',
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--color-text-primary)',
                fontFamily: 'var(--font-display)',
                lineHeight: 1.45,
              }}
            >
              {pendienteIngreso.toLocaleString('es-MX')} u. pendientes de ingreso a bodega
            </p>
            <p
              style={{
                margin: '0 0 12px',
                fontSize: 12,
                color: 'var(--color-text-tertiary)',
                lineHeight: 1.5,
                fontFamily: 'var(--font-display)',
              }}
            >
              Al confirmar, el stock queda disponible para vender. Después podrás registrar pagos al
              proveedor.
            </p>
            {error ? (
              <p style={{ color: '#8B2E2E', fontSize: 12, marginBottom: 10 }}>{error}</p>
            ) : null}
            <button
              type="button"
              disabled={confirming}
              onClick={handleConfirmarIngresoCompleto}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: 10,
                border: 'none',
                background: accent,
                color: '#fff',
                fontSize: 13,
                fontWeight: 600,
                cursor: confirming ? 'wait' : 'pointer',
                opacity: confirming ? 0.7 : 1,
                fontFamily: 'var(--font-display)',
              }}
            >
              {confirming
                ? 'Ingresando a bodega…'
                : `Confirmar ingreso (${pendienteIngreso.toLocaleString('es-MX')} u.)`}
            </button>
            <button
              type="button"
              disabled={confirming}
              onClick={() => setShowAjusteRecepcion(v => !v)}
              style={{
                width: '100%',
                marginTop: 8,
                padding: '8px 12px',
                borderRadius: 8,
                border: 'none',
                background: 'transparent',
                color: 'var(--color-text-tertiary)',
                fontSize: 12,
                cursor: confirming ? 'default' : 'pointer',
                fontFamily: 'var(--font-display)',
              }}
            >
              {showAjusteRecepcion ? 'Ocultar ajuste de cantidades' : 'Ajustar cantidades'}
            </button>
          </section>
        ) : null}

        {recibida && cxp ? (
          <>
            <section
              style={{
                margin: '0 20px 16px',
                padding: 12,
                borderRadius: 10,
                background: 'var(--color-background-tertiary)',
                fontSize: 12,
                fontFamily: 'var(--font-display)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: 'var(--color-text-tertiary)' }}>Total</span>
                <span style={{ fontWeight: 600 }}>{fmtMoney(cxp.monto_total)}</span>
              </div>
              {cxp.monto_pagado > 0 ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: 'var(--color-text-tertiary)' }}>Pagado</span>
                  <span style={{ fontWeight: 500 }}>{fmtMoney(cxp.monto_pagado)}</span>
                </div>
              ) : null}
              {pagos.map(p => (
                <div
                  key={p.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    color: 'var(--color-text-tertiary)',
                    marginTop: 4,
                  }}
                >
                  <span>
                    Pago · {p.metodo} ·{' '}
                    {parseDateOnlyLocal(p.fecha_pago).toLocaleDateString('es-MX', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                  <span>{fmtMoney(Number(p.monto))}</span>
                </div>
              ))}
              {cxp.saldo_pendiente > 0 ? (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: 8,
                    fontWeight: 600,
                    color: 'var(--color-text-primary)',
                  }}
                >
                  <span>Saldo</span>
                  <span>{fmtMoney(cxp.saldo_pendiente)}</span>
                </div>
              ) : (
                <div style={{ marginTop: 8, color: '#4CAF7D', fontWeight: 500 }}>Liquidada</div>
              )}
            </section>

            {cxp.saldo_pendiente > 0 ? (
              <section
                style={{
                  margin: '0 20px 16px',
                  padding: 14,
                  borderRadius: 12,
                  border: `0.5px solid color-mix(in srgb, ${accent} 35%, var(--color-border-tertiary))`,
                  background: `color-mix(in srgb, ${accent} 8%, var(--color-background-primary))`,
                }}
              >
                <p
                  style={{
                    margin: '0 0 10px',
                    fontSize: 13,
                    fontWeight: 500,
                    color: 'var(--color-text-primary)',
                    fontFamily: 'var(--font-display)',
                    lineHeight: 1.45,
                  }}
                >
                  Saldo pendiente con {orden.proveedor_nombre}: {fmtMoney(cxp.saldo_pendiente)}
                </p>
                {pagoError ? (
                  <p style={{ color: '#8B2E2E', fontSize: 12, marginBottom: 10 }}>{pagoError}</p>
                ) : null}
                <button
                  type="button"
                  disabled={pagoLoading}
                  onClick={() => void handleLiquidarSaldo()}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: 10,
                    border: 'none',
                    background: accent,
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: pagoLoading ? 'wait' : 'pointer',
                    opacity: pagoLoading ? 0.7 : 1,
                    fontFamily: 'var(--font-display)',
                  }}
                >
                  {pagoLoading
                    ? 'Registrando pago…'
                    : `Registrar pago · ${fmtMoney(cxp.saldo_pendiente)}`}
                </button>
                <button
                  type="button"
                  disabled={pagoLoading}
                  onClick={() => setShowAjustePago(v => !v)}
                  style={{
                    width: '100%',
                    marginTop: 8,
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--color-text-tertiary)',
                    fontSize: 12,
                    cursor: pagoLoading ? 'default' : 'pointer',
                    fontFamily: 'var(--font-display)',
                  }}
                >
                  {showAjustePago ? 'Ocultar ajuste de pago' : 'Pago parcial u otro método'}
                </button>

                {showAjustePago ? (
                  <div style={{ marginTop: 12 }}>
                    <label
                      style={{
                        display: 'block',
                        fontSize: 10,
                        color: 'var(--color-text-tertiary)',
                        textTransform: 'uppercase',
                        marginBottom: 4,
                      }}
                    >
                      Monto
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      max={cxp.saldo_pendiente}
                      value={pagoMonto}
                      onChange={e => setPagoMonto(e.target.value)}
                      style={field}
                    />
                    <div
                      role="group"
                      aria-label="Método de pago"
                      style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}
                    >
                      {METODOS_PAGO.map(m => {
                        const selected = pagoMetodo === m.value
                        return (
                          <button
                            key={m.value}
                            type="button"
                            disabled={pagoLoading}
                            onClick={() => setPagoMetodo(m.value)}
                            aria-pressed={selected}
                            style={{
                              padding: '6px 10px',
                              borderRadius: 8,
                              border: selected
                                ? `1px solid ${accent}`
                                : '1px solid var(--color-border-tertiary)',
                              background: selected
                                ? `color-mix(in srgb, ${accent} 12%, transparent)`
                                : 'transparent',
                              color: selected ? accent : 'var(--color-text-tertiary)',
                              fontSize: 11,
                              fontWeight: 500,
                              cursor: pagoLoading ? 'default' : 'pointer',
                              fontFamily: 'var(--font-display)',
                            }}
                          >
                            {m.label}
                          </button>
                        )
                      })}
                    </div>
                    <button
                      type="button"
                      disabled={pagoLoading}
                      onClick={() => void handleRegistrarPago()}
                      style={{
                        width: '100%',
                        marginTop: 12,
                        padding: '10px 16px',
                        borderRadius: 10,
                        border: `0.5px solid ${accent}`,
                        background: 'var(--color-background-primary)',
                        color: accent,
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: pagoLoading ? 'wait' : 'pointer',
                        fontFamily: 'var(--font-display)',
                      }}
                    >
                      Confirmar pago parcial
                    </button>
                  </div>
                ) : null}
              </section>
            ) : null}
          </>
        ) : !recibida ? (
          <p
            style={{
              margin: '0 20px 16px',
              fontSize: 12,
              color: 'var(--color-text-tertiary)',
              fontFamily: 'var(--font-display)',
            }}
          >
            Los pagos al proveedor estarán disponibles después de confirmar la llegada.
          </p>
        ) : null}

        <div
          style={{
            padding: '0 20px 16px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <a
            href={ordenCompraWhatsAppUrl(shareText)}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              flex: '1 1 100px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '10px 14px',
              borderRadius: 8,
              background: '#25D366',
              color: '#fff',
              fontSize: 12,
              fontWeight: 500,
              textDecoration: 'none',
              fontFamily: 'var(--font-display)',
            }}
          >
            WhatsApp
          </a>
          <a
            href={ordenCompraMailtoUrl(orden.numero_orden, orden.proveedor_nombre, shareText)}
            style={{
              flex: '1 1 100px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '10px 14px',
              borderRadius: 8,
              background: 'var(--color-background-primary)',
              color: 'var(--color-text-primary)',
              fontSize: 12,
              fontWeight: 500,
              textDecoration: 'none',
              border: '0.5px solid var(--color-border-tertiary)',
              fontFamily: 'var(--font-display)',
            }}
          >
            Correo
          </a>
        </div>

        {puedeConfirmar && showAjusteRecepcion ? (
          <section style={{ padding: '8px 20px 24px' }}>
            <h3
              style={{
                margin: '0 0 8px',
                fontSize: 13,
                fontWeight: 600,
                fontFamily: 'var(--font-display)',
              }}
            >
              Ajustar recepción
            </h3>
            <p
              style={{
                margin: '0 0 12px',
                fontSize: 12,
                color: 'var(--color-text-tertiary)',
                lineHeight: 1.5,
                fontFamily: 'var(--font-display)',
              }}
            >
              Indica el total recibido por producto (acumulado).
            </p>

            {lineas.map((l, i) => (
              <div
                key={l.item_id}
                style={{
                  padding: 12,
                  marginBottom: 10,
                  border: '0.5px solid var(--color-border-tertiary)',
                  borderRadius: 10,
                  background: 'var(--color-background-tertiary)',
                }}
              >
                <div
                  style={{
                    fontWeight: 500,
                    marginBottom: 8,
                    fontSize: 13,
                    fontFamily: 'var(--font-display)',
                  }}
                >
                  {l.producto_nombre}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 10, color: '#999', textTransform: 'uppercase' }}>
                      Ordenado
                    </label>
                    <input
                      type="number"
                      readOnly
                      value={l.cantidad_ordenada}
                      style={{ ...field, color: '#888' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 10, color: '#999', textTransform: 'uppercase' }}>
                      Recibido
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={l.cantidad_recibida}
                      onChange={e =>
                        updateLinea(i, {
                          cantidad_recibida: parseInt(e.target.value, 10) || 0,
                        })
                      }
                      style={field}
                    />
                  </div>
                </div>
              </div>
            ))}

            {showAjusteRecepcion && error ? (
              <p style={{ color: '#8B2E2E', fontSize: 12, marginBottom: 12 }}>{error}</p>
            ) : null}

            <button
              type="button"
              disabled={confirming || totalRecibido <= 0}
              onClick={() =>
                void handleConfirmar(
                  lineas.map(l => ({
                    item_id: l.item_id,
                    cantidad_recibida: Math.max(0, Math.floor(Number(l.cantidad_recibida) || 0)),
                  }))
                )
              }
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: 10,
                border: 'none',
                background: accent,
                color: '#fff',
                fontSize: 13,
                fontWeight: 600,
                cursor: confirming || totalRecibido <= 0 ? 'not-allowed' : 'pointer',
                opacity: confirming || totalRecibido <= 0 ? 0.6 : 1,
                fontFamily: 'var(--font-display)',
              }}
            >
              {confirming
                ? 'Actualizando stock…'
                : `Recibir ${totalRecibido} unidades en bodega`}
            </button>
          </section>
        ) : null}
      </div>
    </article>
  )
}
