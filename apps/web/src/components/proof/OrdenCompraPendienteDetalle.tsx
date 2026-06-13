'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSupabase } from '@/hooks/useSupabase'
import { fmtMoney } from '@/lib/proof/format'
import type {
  ItemOrdenCompraDistribuidorRow,
  OrdenCompraDistribuidorWithItems,
} from '@/lib/supabase/distribuidor'
import {
  confirmarLlegadaOrdenCompraDistribuidor,
  fetchOrdenCompraDistribuidorWithItems,
} from '@/lib/supabase/distribuidor'

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

type LineaForm = {
  item_id: string
  producto_nombre: string
  cantidad_ordenada: number
  cantidad_recibida: number
}

function DetalleSkeleton() {
  return (
    <div style={{ background: '#fff', borderBottom: '0.5px solid var(--hairline)' }}>
      <div style={{ padding: '28px 24px 24px' }}>
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

export function OrdenCompraPendienteDetalle({
  ordenId,
  accent,
  onClose,
  onRecibido,
}: {
  ordenId: string
  accent: string
  onClose: () => void
  onRecibido: () => void
}) {
  const supabase = useSupabase()
  const [loading, setLoading] = useState(true)
  const [orden, setOrden] = useState<OrdenCompraDistribuidorWithItems | null>(null)
  const [lineas, setLineas] = useState<LineaForm[]>([])
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void fetchOrdenCompraDistribuidorWithItems(supabase, ordenId)
      .then(data => {
        if (cancelled) return
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
      })
      .catch(e => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Error cargando orden')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [supabase, ordenId])

  const puedeConfirmar = orden != null && ['pendiente', 'parcial'].includes(orden.estado)

  const totalRecibido = useMemo(
    () => lineas.reduce((s, l) => s + (Number(l.cantidad_recibida) || 0), 0),
    [lineas]
  )

  const updateLinea = useCallback((index: number, patch: Partial<LineaForm>) => {
    setLineas(prev => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)))
  }, [])

  const handleConfirmar = async () => {
    if (!orden) return
    setConfirming(true)
    setError(null)
    try {
      await confirmarLlegadaOrdenCompraDistribuidor(
        supabase,
        orden.id,
        lineas.map(l => ({
          item_id: l.item_id,
          cantidad_recibida: Math.max(0, Math.floor(Number(l.cantidad_recibida) || 0)),
        }))
      )
      onRecibido()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo confirmar la llegada')
    } finally {
      setConfirming(false)
    }
  }

  if (loading) return <DetalleSkeleton />
  if (!orden) {
    return (
      <div style={{ padding: 24, background: '#fff', borderBottom: '0.5px solid var(--hairline)' }}>
        <p style={{ margin: 0, fontSize: 13, color: '#888' }}>Orden no encontrada.</p>
      </div>
    )
  }

  const items = orden.items_orden_compra_distribuidor ?? []
  const nombre =
    items.length === 1 ? items[0]!.producto_nombre : `${items.length} productos`

  return (
    <div style={{ background: '#fff', borderBottom: '0.5px solid var(--hairline)' }}>
      <div style={{ padding: '28px 24px 20px', position: 'relative' }}>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          style={{
            position: 'absolute',
            top: 20,
            right: 20,
            border: 'none',
            background: '#fff',
            color: '#999',
            cursor: 'pointer',
            fontSize: 16,
            lineHeight: 1,
          }}
        >
          ×
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <span style={{ fontSize: 14 }} aria-hidden>
            🚚
          </span>
          <span
            style={{
              fontSize: 10,
              fontFamily: 'ui-monospace, monospace',
              textTransform: 'uppercase',
              color: '#999',
              letterSpacing: '0.08em',
            }}
          >
            Por recibir · {orden.numero_orden}
          </span>
        </div>
        <h2
          style={{
            margin: 0,
            fontSize: 26,
            fontWeight: 500,
            color: 'var(--fg-0)',
            letterSpacing: '-0.02em',
            paddingRight: 36,
          }}
        >
          {nombre}
        </h2>
        <p
          style={{
            margin: '6px 0 0',
            fontSize: 11,
            color: '#BBB',
            fontFamily: 'ui-monospace, monospace',
          }}
        >
          {orden.proveedor_nombre}
          {orden.fecha_estimada ? ` · ETA ${orden.fecha_estimada}` : ''}
        </p>
      </div>

      <div style={{ padding: '20px 24px 28px' }}>
        <div style={{ fontSize: 12, color: '#666', lineHeight: 1.7, marginBottom: 20 }}>
          <div>Total acordado: {fmtMoney(Number(orden.total_acordado))}</div>
        </div>

        {items.map((it, i) => (
          <div
            key={it.id}
            style={{
              padding: '12px 0',
              borderTop: i ? '0.5px solid var(--hairline)' : undefined,
              fontSize: 12,
              color: '#444',
            }}
          >
            <div style={{ fontWeight: 600, color: 'var(--fg-0)' }}>{it.producto_nombre}</div>
            <div style={{ marginTop: 4, color: '#888' }}>
              {it.cantidad_ordenada} uds · {fmtMoney(Number(it.costo_unitario))}/ud
            </div>
          </div>
        ))}

        {puedeConfirmar ? (
          <section style={{ marginTop: 24 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600 }}>Confirmar llegada</h3>
            <p style={{ margin: '0 0 16px', fontSize: 12, color: '#888', lineHeight: 1.5 }}>
              Al confirmar se actualiza el stock en bodega. Puedes registrar recepción parcial.
            </p>

            {lineas.map((l, i) => (
              <div
                key={l.item_id}
                style={{
                  padding: 14,
                  marginBottom: 12,
                  border: '0.5px solid var(--hairline)',
                  borderRadius: 10,
                  background: 'var(--panel-2)',
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 13 }}>
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

            {error && (
              <p style={{ color: '#8B2E2E', fontSize: 12, marginBottom: 12 }}>{error}</p>
            )}

            <button
              type="button"
              disabled={confirming || totalRecibido <= 0}
              onClick={() => void handleConfirmar()}
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
              }}
            >
              {confirming
                ? 'Actualizando stock…'
                : `Recibir ${totalRecibido} unidades en bodega`}
            </button>
          </section>
        ) : (
          <p style={{ margin: 0, fontSize: 12, color: '#888' }}>
            Esta orden ya está {orden.estado}.
          </p>
        )}
      </div>
    </div>
  )
}
