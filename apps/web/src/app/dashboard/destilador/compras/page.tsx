'use client'

export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useSupabase } from '@/hooks/useSupabase'
import { useDestiladorScope } from '@/hooks/useDestiladorScope'
import { PipelineHeader, DestiladorSkeleton } from '@/components/destilador/PipelineHeader'
import { fmtMoney } from '@/lib/proof/format'
import type { DestViajeEstado, ViajeRow } from '@/lib/proof/destilador-types'
import {
  fetchComprasPipelineCounts,
  fetchProductosViaje,
  fetchViajes,
  sumSaldosPalenqueros,
} from '@/lib/supabase/destilador'

const ESTADO_LABEL: Record<DestViajeEstado, string> = {
  en_negociacion: 'En negociación',
  confirmado: 'Confirmado',
  en_transito: 'En tránsito',
  recibido: 'Recibido',
}

export default function DestiladorComprasPage() {
  const supabase = useSupabase()
  const { loading: scopeLoading, ok, clerkId } = useDestiladorScope()
  const [viajes, setViajes] = useState<ViajeRow[]>([])
  const [pipeline, setPipeline] = useState({
    enTransito: 0,
    enBodegaCrudo: 0,
    enProduccion: 0,
    terminado: 0,
  })
  const [deboPalenqueros, setDeboPalenqueros] = useState(0)
  const [dataLoading, setDataLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!ok || !clerkId) return
    let cancelled = false
    setDataLoading(true)
    setError(null)
    Promise.all([
      fetchViajes(supabase, clerkId, { limit: 80 }),
      fetchComprasPipelineCounts(supabase, clerkId),
      sumSaldosPalenqueros(supabase, clerkId),
    ])
      .then(([v, pipe, debo]) => {
        if (cancelled) return
        setViajes(v)
        setPipeline(pipe)
        setDeboPalenqueros(debo)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        const msg = e instanceof Error ? e.message : 'Error al cargar compras'
        setError(msg)
      })
      .finally(() => {
        if (!cancelled) setDataLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [ok, clerkId, supabase])

  const [productosByViaje, setProductosByViaje] = useState<
    Record<string, { agaves: string[]; saldo: number }>
  >({})

  useEffect(() => {
    if (!clerkId || viajes.length === 0) {
      setProductosByViaje({})
      return
    }
    let cancelled = false
    fetchProductosViaje(
      supabase,
      viajes.map(v => v.id)
    ).then(rows => {
      if (cancelled) return
      const map: Record<string, { agaves: string[]; saldo: number }> = {}
      for (const p of rows) {
        const entry = map[p.viaje_id] ?? { agaves: [], saldo: 0 }
        entry.agaves.push(p.tipo_agave)
        entry.saldo += Number(p.saldo_pendiente ?? 0)
        map[p.viaje_id] = entry
      }
      setProductosByViaje(map)
    })
    return () => {
      cancelled = true
    }
  }, [clerkId, supabase, viajes])

  const viajesActivos = useMemo(
    () => viajes.filter(v => v.estado !== 'recibido').length,
    [viajes]
  )

  const ultimasCompras = useMemo(() => {
    const recibidos = viajes.filter(v => v.estado === 'recibido').slice(0, 3)
    return recibidos
  }, [viajes])

  if (scopeLoading || !ok) {
    return (
      <div style={{ padding: '28px 28px 80px', maxWidth: 960, margin: '0 auto' }}>
        <DestiladorSkeleton lines={5} />
      </div>
    )
  }

  return (
    <div style={{ padding: '28px 28px 80px', maxWidth: 960, margin: '0 auto' }}>
      <header style={{ marginBottom: 20 }}>
        <p className="eyebrow" style={{ margin: '0 0 8px', color: 'var(--fg-3)' }}>
          Patrón · Compras Oaxaca
        </p>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: 'var(--fg-0)' }}>
          Compras
        </h1>
      </header>

      {dataLoading ? (
        <DestiladorSkeleton lines={6} />
      ) : (
        <>
          <PipelineHeader
            stages={[
              { key: 'transito', label: 'En tránsito', count: pipeline.enTransito },
              { key: 'crudo', label: 'En bodega crudo', count: pipeline.enBodegaCrudo },
              { key: 'prod', label: 'En producción', count: pipeline.enProduccion },
              { key: 'term', label: 'Terminado', count: pipeline.terminado },
            ]}
          />

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: 12,
              marginBottom: 28,
            }}
          >
            <KpiCard label="Debo a palenqueros" value={fmtMoney(deboPalenqueros)} tone="var(--crit)" />
            <KpiCard label="Viajes activos" value={String(viajesActivos)} mono />
            <KpiCard
              label="Últimas compras"
              value={ultimasCompras.length ? `${ultimasCompras.length} recibidos` : '—'}
            />
          </div>

          {error && (
            <p style={{ color: 'var(--crit)', fontSize: 13, marginBottom: 16 }}>
              {error.includes('does not exist') || error.includes('relation')
                ? 'Esquema Destilador pendiente: aplica la migración 20250602000000 en Supabase.'
                : error}
            </p>
          )}

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--fg-1)' }}>
              Viajes
            </h2>
            <Link
              href="/dashboard/destilador/compras/nuevo"
              style={{
                padding: '8px 14px',
                background: 'var(--gold)',
                color: 'var(--ink)',
                fontSize: 11,
                fontWeight: 600,
                textDecoration: 'none',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              Nuevo viaje
            </Link>
          </div>

          {viajes.length === 0 && !error ? (
            <p style={{ color: 'var(--fg-2)', fontSize: 14 }}>
              Sin viajes registrados. Empieza con un nuevo viaje a Oaxaca.
            </p>
          ) : (
            <div style={{ border: '0.5px solid var(--hairline)' }}>
              {viajes.map((v, i) => {
                const meta = productosByViaje[v.id]
                return (
                  <Link
                    key={v.id}
                    href={`/dashboard/destilador/compras/${v.id}`}
                    style={{
                      display: 'block',
                      padding: '14px 16px',
                      textDecoration: 'none',
                      color: 'inherit',
                      borderTop: i ? '0.5px solid var(--hairline)' : undefined,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 12,
                        flexWrap: 'wrap',
                      }}
                    >
                      <div>
                        <span
                          className="mono"
                          style={{ fontSize: 12, color: 'var(--fg-2)' }}
                        >
                          {v.fecha} · {v.region || 'Sin región'}
                        </span>
                        <div style={{ fontSize: 15, fontWeight: 600, marginTop: 4 }}>
                          {v.palenquero_nombre || 'Palenquero'}
                        </div>
                        {meta?.agaves.length ? (
                          <div
                            style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 4 }}
                          >
                            {meta.agaves.join(' · ')}
                          </div>
                        ) : null}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: 11, color: 'var(--info)' }}>
                          {ESTADO_LABEL[v.estado]}
                        </span>
                        {meta ? (
                          <div
                            className="mono"
                            style={{
                              fontSize: 14,
                              marginTop: 6,
                              color: meta.saldo > 0 ? 'var(--warn)' : 'var(--ok)',
                            }}
                          >
                            {fmtMoney(meta.saldo)} pend.
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function KpiCard({
  label,
  value,
  tone,
  mono,
}: {
  label: string
  value: string
  tone?: string
  mono?: boolean
}) {
  return (
    <div
      style={{
        padding: '14px 16px',
        background: 'var(--panel)',
        border: '0.5px solid var(--hairline)',
      }}
    >
      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--fg-3)' }}>
        {label}
      </div>
      <div
        className={mono ? 'mono' : undefined}
        style={{
          fontSize: 18,
          fontWeight: 600,
          marginTop: 8,
          color: tone ?? 'var(--fg-0)',
        }}
      >
        {value}
      </div>
    </div>
  )
}
