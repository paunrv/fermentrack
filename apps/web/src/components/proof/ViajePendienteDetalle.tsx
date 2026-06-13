'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useProfile } from '@/context/ProfileContext'
import { useSupabase } from '@/hooks/useSupabase'
import { fmtLitros, fmtMoney } from '@/lib/proof/format'
import type { ConfirmarLlegadaLinea, ProductoViajeRow, ViajeRow } from '@/lib/proof/destilador-types'
import {
  confirmarLlegadaDestilador,
  fetchProductosForViaje,
  fetchViajeById,
} from '@/lib/supabase/destilador'

const ESTADO_LABEL: Record<string, string> = {
  en_negociacion: 'En negociación',
  confirmado: 'Confirmado',
  en_transito: 'En tránsito',
  recibido: 'Recibido',
}

type LineaForm = ConfirmarLlegadaLinea & { litros_acordados: number }

function mermaTone(pct: number): string {
  if (pct <= 5) return '#4CAF7D'
  if (pct <= 8) return '#D4A017'
  return '#E24B4A'
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

export function ViajePendienteDetalle({
  viajeId,
  accent,
  onClose,
  onRecibido,
}: {
  viajeId: string
  accent: string
  onClose: () => void
  onRecibido: (loteId: string) => void
}) {
  const supabase = useSupabase()
  const { scope } = useProfile()
  const clerkId = scope?.clerk_id

  const [loading, setLoading] = useState(true)
  const [viaje, setViaje] = useState<ViajeRow | null>(null)
  const [productos, setProductos] = useState<ProductoViajeRow[]>([])
  const [lineas, setLineas] = useState<LineaForm[]>([])
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!clerkId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const [v, prods] = await Promise.all([
        fetchViajeById(supabase, clerkId, viajeId),
        fetchProductosForViaje(supabase, clerkId, viajeId),
      ])
      setViaje(v)
      setProductos(prods)
      if (v && v.estado !== 'recibido') {
        setLineas(
          prods.map(p => ({
            producto_viaje_id: p.id,
            litros_salida: Number(p.litros_acordados),
            litros_recibidos: Number(p.litros_acordados),
            abv: null,
            litros_acordados: Number(p.litros_acordados),
          }))
        )
      }
    } catch (e) {
      console.error('[ViajePendienteDetalle] load', e)
      setError(e instanceof Error ? e.message : 'Error al cargar')
    } finally {
      setLoading(false)
    }
  }, [supabase, clerkId, viajeId])

  useEffect(() => {
    void load()
  }, [load])

  const totalLitrosAcordados = useMemo(
    () => productos.reduce((s, p) => s + Number(p.litros_acordados), 0),
    [productos]
  )

  const puedeConfirmar =
    viaje && ['confirmado', 'en_transito'].includes(viaje.estado) && lineas.length > 0

  function updateLinea(i: number, patch: Partial<LineaForm>) {
    setLineas(prev => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))
  }

  async function handleConfirmar() {
    if (!viaje) return
    setConfirming(true)
    setError(null)
    try {
      const rows = await confirmarLlegadaDestilador(
        supabase,
        viajeId,
        lineas.map(({ producto_viaje_id, litros_salida, litros_recibidos, abv }) => ({
          producto_viaje_id,
          litros_salida,
          litros_recibidos,
          abv,
        }))
      )
      const created = rows[0]
      if (!created?.lote_id) throw new Error('No se generó el lote en bodega')
      onRecibido(created.lote_id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo confirmar la llegada')
    } finally {
      setConfirming(false)
    }
  }

  if (loading) return <DetalleSkeleton />

  if (!viaje) {
    return (
      <div
        style={{
          background: '#fff',
          borderBottom: '0.5px solid var(--hairline)',
          padding: 24,
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: 13, color: '#999' }}>Viaje no encontrado.</p>
        <button type="button" onClick={onClose} style={{ marginTop: 12, fontSize: 12, cursor: 'pointer' }}>
          Cerrar
        </button>
      </div>
    )
  }

  const nombre = productos[0]?.tipo_agave ?? 'Viaje'
  const subtitulo = `${viaje.region || '—'} · ${viaje.palenquero_nombre || 'Palenquero'}`

  return (
    <div style={{ background: '#fff', borderBottom: '0.5px solid var(--hairline)' }}>
      <div
        style={{
          padding: '28px 24px 24px',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: '#D4A017',
            }}
          />
          <span
            style={{
              fontSize: 10,
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              textTransform: 'uppercase',
              color: '#999',
              letterSpacing: '0.08em',
            }}
          >
            {ESTADO_LABEL[viaje.estado] ?? viaje.estado}
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
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          }}
        >
          {subtitulo}
        </p>
      </div>

      <div style={{ padding: '20px 24px 28px' }}>
        <div style={{ fontSize: 12, color: '#666', lineHeight: 1.7, marginBottom: 20 }}>
          <div>Fecha: {viaje.fecha}</div>
          <div>Flete: {fmtMoney(Number(viaje.costo_flete))}</div>
          <div>Litros acordados: {fmtLitros(totalLitrosAcordados)}</div>
        </div>

        {productos.map((p, i) => (
          <div
            key={p.id}
            style={{
              padding: '12px 0',
              borderTop: i ? '0.5px solid var(--hairline)' : undefined,
              fontSize: 12,
              color: '#444',
            }}
          >
            <div style={{ fontWeight: 600, color: 'var(--fg-0)' }}>{p.tipo_agave}</div>
            <div style={{ marginTop: 4, color: '#888' }}>
              {fmtLitros(Number(p.litros_acordados))} · {fmtMoney(Number(p.precio_por_litro))}/L
            </div>
          </div>
        ))}

        {puedeConfirmar ? (
          <section style={{ marginTop: 24 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600 }}>Confirmar llegada</h3>
            <p style={{ margin: '0 0 16px', fontSize: 12, color: '#888', lineHeight: 1.5 }}>
              Al confirmar se crea el lote en bodega y aparece en el canvas como Espadín.
            </p>

            {lineas.map((l, i) => {
              const prod = productos.find(p => p.id === l.producto_viaje_id)
              const salida = Number(l.litros_salida) || 0
              const recibidos = Number(l.litros_recibidos) || 0
              const merma = salida - recibidos
              const mermaPct = salida > 0 ? (100 * merma) / salida : 0

              return (
                <div
                  key={l.producto_viaje_id}
                  style={{
                    padding: 14,
                    marginBottom: 12,
                    border: '0.5px solid var(--hairline)',
                    borderRadius: 10,
                    background: 'var(--panel-2)',
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 13 }}>
                    {prod?.tipo_agave}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={{ fontSize: 10, color: '#999', textTransform: 'uppercase' }}>
                        Litros salida
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min={0}
                        value={l.litros_salida}
                        onChange={e =>
                          updateLinea(i, { litros_salida: parseFloat(e.target.value) || 0 })
                        }
                        style={field}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 10, color: '#999', textTransform: 'uppercase' }}>
                        Litros recibidos
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min={0}
                        value={l.litros_recibidos}
                        onChange={e =>
                          updateLinea(i, { litros_recibidos: parseFloat(e.target.value) || 0 })
                        }
                        style={field}
                      />
                    </div>
                  </div>
                  <div style={{ fontSize: 11, marginTop: 10, color: mermaTone(mermaPct) }}>
                    Merma {fmtLitros(merma)} ({mermaPct.toFixed(1)}%)
                  </div>
                </div>
              )
            })}

            {error && (
              <p style={{ color: '#8B2E2E', fontSize: 12, marginBottom: 12 }}>{error}</p>
            )}

            <button
              type="button"
              disabled={confirming}
              onClick={handleConfirmar}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: accent,
                color: 'var(--fg-0)',
                border: 'none',
                borderRadius: 8,
                fontWeight: 600,
                fontSize: 12,
                cursor: confirming ? 'wait' : 'pointer',
              }}
            >
              {confirming ? 'Confirmando…' : 'Confirmar llegada y crear lote'}
            </button>
          </section>
        ) : (
          <p style={{ marginTop: 16, fontSize: 12, color: '#999' }}>
            Este viaje ya fue recibido o no se puede confirmar desde aquí.
          </p>
        )}
      </div>
    </div>
  )
}
