'use client'

export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useSupabase } from '@/hooks/useSupabase'
import { useDestiladorScope } from '@/hooks/useDestiladorScope'
import { DestiladorSkeleton } from '@/components/destilador/PipelineHeader'
import { viajeStatusLabel } from '@/lib/proof/distiller-i18n'
import { fmtLitros, fmtMoney } from '@/lib/proof/format'
import type { ConfirmarLlegadaLinea, ProductoViajeRow, ViajeRow } from '@/lib/proof/destilador-types'
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

export default function DetalleViajePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const t = useTranslations('distiller.compras.detail')
  const tCommon = useTranslations('distiller.common')
  const tViaje = useTranslations('distiller.status.viaje')
  const supabase = useSupabase()
  const { loading: scopeLoading, ok, userId } = useDestiladorScope()
  const [viaje, setViaje] = useState<ViajeRow | null>(null)
  const [productos, setProductos] = useState<ProductoViajeRow[]>([])
  const [lineas, setLineas] = useState<LineaForm[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resultado, setResultado] = useState<string | null>(null)

  useEffect(() => {
    if (!ok || !userId || !id) return
    let cancelled = false
    setDataLoading(true)
    setError(null)
    Promise.all([
      fetchViajeById(supabase, userId, id),
      fetchProductosForViaje(supabase, userId, id),
    ])
      .then(([v, prods]) => {
        if (cancelled) return
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
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          const fallback = t('errors.loadFailed')
          setError(e instanceof Error ? e.message : fallback)
        }
      })
      .finally(() => {
        if (!cancelled) setDataLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [ok, userId, id, supabase])

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
    if (!viaje || !id) return
    setConfirming(true)
    setError(null)
    setResultado(null)
    try {
      const rows = await confirmarLlegadaDestilador(
        supabase,
        id,
        lineas.map(({ producto_viaje_id, litros_salida, litros_recibidos, abv }) => ({
          producto_viaje_id,
          litros_salida,
          litros_recibidos,
          abv,
        }))
      )
      setResultado(
        t('receivedSuccess', {
          lots: rows.map(r => `${r.numero_lote} (${r.tipo_agave})`).join(', '),
        })
      )
      router.push('/dashboard')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('errors.confirmFailed'))
    } finally {
      setConfirming(false)
    }
  }

  if (scopeLoading || !ok) {
    return (
      <div style={{ padding: 28, maxWidth: 720, margin: '0 auto' }}>
        <DestiladorSkeleton />
      </div>
    )
  }

  if (dataLoading) {
    return (
      <div style={{ padding: 28, maxWidth: 720, margin: '0 auto' }}>
        <DestiladorSkeleton lines={6} />
      </div>
    )
  }

  if (!viaje) {
    return (
      <div style={{ padding: 28, maxWidth: 720, margin: '0 auto' }}>
        <p style={{ color: 'var(--crit)' }}>{tCommon('notFound.trip')}</p>
        <Link href="/dashboard/destilador/compras">{tCommon('backToPurchases')}</Link>
      </div>
    )
  }

  return (
    <div style={{ padding: '28px 28px 80px', maxWidth: 720, margin: '0 auto' }}>
      <Link href="/dashboard/destilador/compras" style={{ color: 'var(--fg-3)', fontSize: 12 }}>
        {tCommon('backToPurchases')}
      </Link>

      <header style={{ margin: '16px 0 24px' }}>
        <h1 style={{ margin: '0 0 8px', fontSize: 24, color: 'var(--fg-0)' }}>
          {viaje.palenquero_nombre || tCommon('trip')}
        </h1>
        <p className="mono" style={{ margin: 0, fontSize: 12, color: 'var(--fg-2)' }}>
          {viaje.fecha} · {viaje.region} · {viajeStatusLabel(tViaje, viaje.estado)}
        </p>
        {viaje.comunidad && (
          <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--fg-3)' }}>{viaje.comunidad}</p>
        )}
      </header>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>{t('summary')}</h2>
        <div className="mono" style={{ fontSize: 12, color: 'var(--fg-1)', lineHeight: 1.7 }}>
          <div>
            {t('fleteTotal')} {fmtMoney(Number(viaje.costo_flete))}
          </div>
          <div>
            {t('litrosViaje')} {fmtLitros(totalLitrosAcordados)}
          </div>
        </div>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>{t('products')}</h2>
        <div style={{ border: '0.5px solid var(--hairline)' }}>
          {productos.map((p, i) => (
            <div
              key={p.id}
              style={{
                padding: '12px 14px',
                borderTop: i ? '0.5px solid var(--hairline)' : undefined,
              }}
            >
              <div style={{ fontWeight: 600 }}>{p.tipo_agave}</div>
              <div className="mono" style={{ fontSize: 12, color: 'var(--fg-2)', marginTop: 4 }}>
                {fmtLitros(Number(p.litros_acordados))} ·{' '}
                {t('pricePerLiter', { price: fmtMoney(Number(p.precio_por_litro)) })}
                {' · '}
                {t('total')} {fmtMoney(Number(p.total_acordado))}
                {' · '}
                {t('pending')} {fmtMoney(Number(p.saldo_pendiente))}
              </div>
              {p.flete_proporcional != null && (
                <div className="mono" style={{ fontSize: 11, color: 'var(--info)', marginTop: 4 }}>
                  {t('fleteProporcional')} {fmtMoney(Number(p.flete_proporcional))}
                </div>
              )}
              {p.merma_litros != null && (
                <div className="mono" style={{ fontSize: 11, marginTop: 4 }}>
                  {t('merma')} {fmtLitros(Number(p.merma_litros))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {viaje.estado === 'recibido' ? (
        <p style={{ color: 'var(--ok)', fontSize: 14 }}>
          {t('receivedMessage')}{' '}
          <Link href="/dashboard/destilador/lotes" style={{ color: 'var(--gold)' }}>
            {t('lotsLink')}
          </Link>
          .
        </p>
      ) : puedeConfirmar ? (
        <section>
          <h2 style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>{t('confirmTitle')}</h2>
          <p style={{ fontSize: 13, color: 'var(--fg-2)', marginBottom: 16 }}>{t('confirmDescription')}</p>

          {lineas.map((l, i) => {
            const prod = productos.find(p => p.id === l.producto_viaje_id)
            const salida = Number(l.litros_salida) || 0
            const recibidos = Number(l.litros_recibidos) || 0
            const merma = salida - recibidos
            const mermaPct = salida > 0 ? (100 * merma) / salida : 0
            const fleteProp =
              totalLitrosAcordados > 0 && prod
                ? (Number(viaje.costo_flete) * Number(prod.litros_acordados)) /
                  totalLitrosAcordados
                : 0

            return (
              <div
                key={l.producto_viaje_id}
                style={{
                  padding: 14,
                  marginBottom: 12,
                  border: '0.5px solid var(--hairline)',
                  background: 'var(--panel)',
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 10 }}>{prod?.tipo_agave}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 10, color: 'var(--fg-3)', textTransform: 'uppercase' }}>
                      {t('litrosSalida')}
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min={0}
                      className="mono"
                      value={l.litros_salida}
                      onChange={e =>
                        updateLinea(i, { litros_salida: parseFloat(e.target.value) || 0 })
                      }
                      style={{
                        width: '100%',
                        marginTop: 4,
                        padding: 8,
                        background: 'var(--ink)',
                        border: '0.5px solid var(--hairline)',
                        color: 'var(--fg-0)',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 10, color: 'var(--fg-3)', textTransform: 'uppercase' }}>
                      {t('litrosRecibidos')}
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min={0}
                      className="mono"
                      value={l.litros_recibidos}
                      onChange={e =>
                        updateLinea(i, { litros_recibidos: parseFloat(e.target.value) || 0 })
                      }
                      style={{
                        width: '100%',
                        marginTop: 4,
                        padding: 8,
                        background: 'var(--ink)',
                        border: '0.5px solid var(--hairline)',
                        color: 'var(--fg-0)',
                      }}
                    />
                  </div>
                </div>
                <div style={{ marginTop: 10 }}>
                  <label style={{ fontSize: 10, color: 'var(--fg-3)', textTransform: 'uppercase' }}>
                    {t('abv')}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min={0}
                    max={100}
                    className="mono"
                    value={l.abv ?? ''}
                    onChange={e =>
                      updateLinea(i, {
                        abv: e.target.value === '' ? null : parseFloat(e.target.value),
                      })
                    }
                    style={{
                      width: '100%',
                      marginTop: 4,
                      padding: 8,
                      background: 'var(--ink)',
                      border: '0.5px solid var(--hairline)',
                      color: 'var(--fg-0)',
                    }}
                  />
                </div>
                <div className="mono" style={{ fontSize: 12, marginTop: 10, lineHeight: 1.6 }}>
                  <span style={{ color: mermaTone(mermaPct) }}>
                    {t('mermaLine', {
                      litros: fmtLitros(merma),
                      pct: mermaPct.toFixed(1),
                    })}
                  </span>
                  {mermaPct > 8 && (
                    <span style={{ color: 'var(--crit)', marginLeft: 8 }}>{t('mermaAlert')}</span>
                  )}
                  <br />
                  <span style={{ color: 'var(--info)' }}>
                    {t('fleteEst')} {fmtMoney(Math.round(fleteProp * 100) / 100)}
                  </span>
                </div>
              </div>
            )
          })}

          {error && <p style={{ color: 'var(--crit)', fontSize: 13 }}>{error}</p>}
          {resultado && <p style={{ color: 'var(--ok)', fontSize: 13 }}>{resultado}</p>}

          <button
            type="button"
            disabled={confirming}
            onClick={handleConfirmar}
            style={{
              marginTop: 8,
              padding: '12px 16px',
              background: 'var(--gold)',
              color: 'var(--ink)',
              border: 'none',
              fontWeight: 600,
              fontSize: 12,
              textTransform: 'uppercase',
              cursor: confirming ? 'wait' : 'pointer',
            }}
          >
            {confirming ? t('confirming') : t('confirmButton')}
          </button>
        </section>
      ) : (
        <p style={{ color: 'var(--fg-2)', fontSize: 13 }}>{t('cannotConfirm')}</p>
      )}
    </div>
  )
}
