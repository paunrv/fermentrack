'use client'

export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useSupabase } from '@/hooks/useSupabase'
import { useDestiladorScope } from '@/hooks/useDestiladorScope'
import { PipelineHeader, DestiladorSkeleton } from '@/components/destilador/PipelineHeader'
import { fmtLitros, fmtMoney } from '@/lib/proof/format'
import type { DestLoteEstado, LoteRow } from '@/lib/proof/destilador-types'
import { countLotesByEstado, fetchLotes } from '@/lib/supabase/destilador'

const PIPELINE: { key: DestLoteEstado; label: string }[] = [
  { key: 'en_bodega_crudo', label: 'En bodega crudo' },
  { key: 'en_produccion', label: 'En producción' },
  { key: 'terminado', label: 'Terminado' },
  { key: 'vendido_parcial', label: 'Vendido parcial' },
]

export default function DestiladorLotesPage() {
  const supabase = useSupabase()
  const { loading: scopeLoading, ok, clerkId } = useDestiladorScope()
  const [filter, setFilter] = useState<DestLoteEstado | null>(null)
  const [counts, setCounts] = useState<Record<DestLoteEstado, number>>({
    en_bodega_crudo: 0,
    en_produccion: 0,
    terminado: 0,
    vendido_parcial: 0,
  })
  const [lotes, setLotes] = useState<LoteRow[]>([])
  const [dataLoading, setDataLoading] = useState(true)

  useEffect(() => {
    if (!ok || !clerkId) return
    let cancelled = false
    setDataLoading(true)
    Promise.all([
      countLotesByEstado(supabase, clerkId),
      fetchLotes(supabase, clerkId, { estado: filter ?? undefined, limit: 100 }),
    ])
      .then(([c, rows]) => {
        if (cancelled) return
        setCounts(c)
        setLotes(rows)
      })
      .finally(() => {
        if (!cancelled) setDataLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [ok, clerkId, supabase, filter])

  if (scopeLoading || !ok) {
    return (
      <div style={{ padding: 28, maxWidth: 960, margin: '0 auto' }}>
        <DestiladorSkeleton />
      </div>
    )
  }

  return (
    <div style={{ padding: '28px 28px 80px', maxWidth: 960, margin: '0 auto' }}>
      <h1 style={{ margin: '0 0 20px', fontSize: 26, fontWeight: 700 }}>Lotes</h1>
      {dataLoading ? (
        <DestiladorSkeleton />
      ) : (
        <>
          <PipelineHeader
            stages={PIPELINE.map(p => ({
              key: p.key,
              label: p.label,
              count: counts[p.key],
              active: filter === p.key,
              onClick: () => setFilter(prev => (prev === p.key ? null : p.key)),
            }))}
          />
          <div style={{ border: '0.5px solid var(--hairline)' }}>
            {lotes.length === 0 ? (
              <p style={{ padding: 16, color: 'var(--fg-2)' }}>Sin lotes en este estado.</p>
            ) : (
              lotes.map((l, i) => {
                const pv = l.productos_viaje
                const precioL = pv ? Number(pv.precio_por_litro) : 0
                const flete = pv?.flete_proporcional ? Number(pv.flete_proporcional) : 0
                const litrosA = pv ? Number(pv.litros_acordados) : Number(l.litros_recibidos)
                const costoLitro =
                  litrosA > 0
                    ? precioL + flete / litrosA
                    : precioL
                const dias = Math.max(
                  0,
                  Math.floor(
                    (Date.now() - new Date(l.fecha_recepcion).getTime()) / 86400000
                  )
                )
                return (
                  <Link
                    key={l.id}
                    href={`/dashboard/destilador/lotes/${l.id}`}
                    style={{
                      display: 'block',
                      padding: '14px 16px',
                      textDecoration: 'none',
                      color: 'inherit',
                      borderTop: i ? '0.5px solid var(--hairline)' : undefined,
                    }}
                  >
                    <div className="mono" style={{ fontSize: 13, color: 'var(--gold)' }}>
                      {l.numero_lote}
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 600, marginTop: 4 }}>
                      {l.tipo_agave}
                    </div>
                    <div className="mono" style={{ fontSize: 12, color: 'var(--fg-2)', marginTop: 6 }}>
                      {fmtLitros(l.litros_disponibles_granel)} granel ·{' '}
                      {l.estado.replace(/_/g, ' ')}
                    </div>
                    {l.estado === 'en_bodega_crudo' && (
                      <div className="mono" style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 4 }}>
                        {fmtMoney(costoLitro)}/L · {dias} d en bodega
                        {dias > 30 && (
                          <span style={{ color: 'var(--warn)', marginLeft: 6 }}>· &gt;30 d</span>
                        )}
                      </div>
                    )}
                  </Link>
                )
              })
            )}
          </div>
        </>
      )}
    </div>
  )
}
