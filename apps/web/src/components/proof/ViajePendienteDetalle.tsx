'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useProfile } from '@/context/ProfileContext'
import { useSupabase } from '@/hooks/useSupabase'
import { fmtLitros, fmtMoney } from '@/lib/proof/format'
import { viajeStatusLabel } from '@/lib/proof/distiller-i18n'
import type { ConfirmarLlegadaLinea, DestViajeEstado, ProductoViajeRow, ViajeRow } from '@/lib/proof/destilador-types'
import {
  confirmarLlegadaDestilador,
  fetchProductosForViaje,
  fetchViajeById,
} from '@/lib/supabase/destilador'

type LineaForm = ConfirmarLlegadaLinea & { litros_acordados: number }

function mermaTone(pct: number): string {
  if (pct <= 5) return 'var(--ok)'
  if (pct <= 8) return 'var(--warn)'
  return 'var(--crit)'
}

function DetalleSkeleton() {
  return (
    <div style={{ background: 'var(--surface-card)', borderBottom: '0.5px solid var(--hairline)' }}>
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
  const t = useTranslations('distiller.common')
  const tViaje = useTranslations('distiller.status.viaje')
  const tDetail = useTranslations('distiller.compras.detail')
  const supabase = useSupabase()
  const { scope } = useProfile()
  const userId = scope?.user_id

  const [loading, setLoading] = useState(true)
  const [viaje, setViaje] = useState<ViajeRow | null>(null)
  const [productos, setProductos] = useState<ProductoViajeRow[]>([])
  const [lineas, setLineas] = useState<LineaForm[]>([])
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const [v, prods] = await Promise.all([
        fetchViajeById(supabase, userId, viajeId),
        fetchProductosForViaje(supabase, userId, viajeId),
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
      setError(e instanceof Error ? e.message : tDetail('errors.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [supabase, userId, viajeId, tDetail])

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
      if (!created?.lote_id) throw new Error(tDetail('errors.lotNotCreated'))
      onRecibido(created.lote_id)
    } catch (e) {
      setError(e instanceof Error ? e.message : tDetail('errors.confirmFailed'))
    } finally {
      setConfirming(false)
    }
  }

  if (loading) return <DetalleSkeleton />

  if (!viaje) {
    return (
      <div
        style={{
          background: 'var(--surface-card)',
          borderBottom: '0.5px solid var(--hairline)',
          padding: 24,
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: 13, color: 'var(--fg-3)' }}>{t('notFound.trip')}</p>
        <button type="button" onClick={onClose} style={{ marginTop: 12, fontSize: 12, cursor: 'pointer' }}>
          {t('close')}
        </button>
      </div>
    )
  }

  const nombre = productos[0]?.tipo_agave ?? t('trip')
  const subtitulo = `${viaje.region || t('dash')} · ${viaje.palenquero_nombre || t('palenquero')}`

  return (
    <div style={{ background: 'var(--surface-card)', borderBottom: '0.5px solid var(--hairline)' }}>
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
          aria-label={t('closeAria')}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            width: 28,
            height: 28,
            border: '0.5px solid var(--line)',
            borderRadius: 8,
            background: 'var(--surface-card)',
            color: 'var(--fg-3)',
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
              background: 'var(--warn)',
            }}
          />
          <span
            style={{
              fontSize: 10,
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              textTransform: 'uppercase',
              color: 'var(--fg-3)',
              letterSpacing: '0.08em',
            }}
          >
            {viajeStatusLabel(tViaje, viaje.estado as DestViajeEstado)}
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
            color: 'var(--fg-3)',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          }}
        >
          {subtitulo}
        </p>
      </div>

      <div style={{ padding: '20px 24px 28px' }}>
        <div style={{ fontSize: 12, color: 'var(--fg-2)', lineHeight: 1.7, marginBottom: 20 }}>
          <div>{tDetail('metaFecha', { date: viaje.fecha })}</div>
          <div>{tDetail('metaFlete', { amount: fmtMoney(Number(viaje.costo_flete)) })}</div>
          <div>{tDetail('metaLitros', { liters: fmtLitros(totalLitrosAcordados) })}</div>
        </div>

        {productos.map((p, i) => (
          <div
            key={p.id}
            style={{
              padding: '12px 0',
              borderTop: i ? '0.5px solid var(--hairline)' : undefined,
              fontSize: 12,
              color: 'var(--fg-1)',
            }}
          >
            <div style={{ fontWeight: 600, color: 'var(--fg-0)' }}>{p.tipo_agave}</div>
            <div style={{ marginTop: 4, color: 'var(--fg-3)' }}>
              {fmtLitros(Number(p.litros_acordados))} ·{' '}
              {tDetail('pricePerLiterShort', { price: fmtMoney(Number(p.precio_por_litro)) })}
            </div>
          </div>
        ))}

        {puedeConfirmar ? (
          <section style={{ marginTop: 24 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600 }}>
              {tDetail('confirmTitle')}
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: 12, color: 'var(--fg-3)', lineHeight: 1.5 }}>
              {tDetail('confirmDescriptionCanvas')}
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
                      <label style={{ fontSize: 10, color: 'var(--fg-3)', textTransform: 'uppercase' }}>
                        {tDetail('litrosSalida')}
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
                      <label style={{ fontSize: 10, color: 'var(--fg-3)', textTransform: 'uppercase' }}>
                        {tDetail('litrosRecibidos')}
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
                    {tDetail('mermaLine', {
                      litros: fmtLitros(merma),
                      pct: mermaPct.toFixed(1),
                    })}
                  </div>
                </div>
              )
            })}

            {error && (
              <p style={{ color: 'var(--crit)', fontSize: 12, marginBottom: 12 }}>{error}</p>
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
              {confirming ? tDetail('confirming') : tDetail('confirmButtonSingular')}
            </button>
          </section>
        ) : (
          <p style={{ marginTop: 16, fontSize: 12, color: 'var(--fg-3)' }}>
            {tDetail('alreadyReceived')}
          </p>
        )}
      </div>
    </div>
  )
}
