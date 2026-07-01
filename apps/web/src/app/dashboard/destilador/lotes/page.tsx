'use client'

export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useSupabase } from '@/hooks/useSupabase'
import { useDestiladorScope } from '@/hooks/useDestiladorScope'
import { PipelineHeader, DestiladorSkeleton } from '@/components/destilador/PipelineHeader'
import { loteStatusLabel } from '@/lib/proof/distiller-i18n'
import { fmtLitros, fmtMoney } from '@/lib/proof/format'
import type { DestLoteEstado, LoteRow } from '@/lib/proof/destilador-types'
import { countLotesByEstado, fetchLotes } from '@/lib/supabase/destilador'

const PIPELINE_KEYS: DestLoteEstado[] = [
  'en_bodega_crudo',
  'en_produccion',
  'terminado',
  'vendido_parcial',
]

export default function DestiladorLotesPage() {
  const t = useTranslations('distiller.lotes')
  const tCommon = useTranslations('distiller.common')
  const tStatus = useTranslations('distiller.status.lote')
  const supabase = useSupabase()
  const { loading: scopeLoading, ok, userId } = useDestiladorScope()
  const [filter, setFilter] = useState<DestLoteEstado | null>(null)
  const [counts, setCounts] = useState<Record<DestLoteEstado, number>>({
    en_bodega_crudo: 0,
    en_produccion: 0,
    terminado: 0,
    vendido_parcial: 0,
  })
  const [lotes, setLotes] = useState<LoteRow[]>([])
  const [dataLoading, setDataLoading] = useState(true)

  const pipeline = useMemo(
    () =>
      PIPELINE_KEYS.map(key => ({
        key,
        label: loteStatusLabel(tStatus, key),
        count: counts[key],
        active: filter === key,
        onClick: () => setFilter(prev => (prev === key ? null : key)),
      })),
    [counts, filter, tStatus]
  )

  useEffect(() => {
    if (!ok || !userId) return
    let cancelled = false
    setDataLoading(true)
    Promise.all([
      countLotesByEstado(supabase, userId),
      fetchLotes(supabase, userId, { estado: filter ?? undefined, limit: 100 }),
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
  }, [ok, userId, supabase, filter])

  if (scopeLoading || !ok) {
    return (
      <div style={{ padding: 28, maxWidth: 960, margin: '0 auto' }}>
        <DestiladorSkeleton />
      </div>
    )
  }

  return (
    <div style={{ padding: '28px 28px 80px', maxWidth: 960, margin: '0 auto' }}>
      <h1 style={{ margin: '0 0 20px', fontSize: 26, fontWeight: 700 }}>{t('title')}</h1>
      {dataLoading ? (
        <DestiladorSkeleton />
      ) : (
        <>
          <PipelineHeader stages={pipeline} />
          <div style={{ border: '0.5px solid var(--hairline)' }}>
            {lotes.length === 0 ? (
              <p style={{ padding: 16, color: 'var(--fg-2)' }}>{t('empty')}</p>
            ) : (
              lotes.map((l, i) => {
                const pv = l.productos_viaje
                const precioL = pv ? Number(pv.precio_por_litro) : 0
                const flete = pv?.flete_proporcional ? Number(pv.flete_proporcional) : 0
                const litrosA = pv ? Number(pv.litros_acordados) : Number(l.litros_recibidos)
                const costoLitro = litrosA > 0 ? precioL + flete / litrosA : precioL
                const dias = Math.max(
                  0,
                  Math.floor(
                    (Date.now() - new Date(l.fecha_recepcion).getTime()) / 86400000
                  )
                )
                const status = loteStatusLabel(tStatus, l.estado)
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
                      {t('listBulkStatus', {
                        liters: fmtLitros(l.litros_disponibles_granel),
                        status,
                      })}
                    </div>
                    {l.estado === 'en_bodega_crudo' && (
                      <div className="mono" style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 4 }}>
                        {t('costDaysLine', {
                          cost: fmtMoney(costoLitro),
                          days: tCommon('daysInCellar', { days: dias }),
                        })}
                        {dias > 30 && (
                          <span style={{ color: 'var(--warn)', marginLeft: 6 }}>
                            {tCommon('over30Days')}
                          </span>
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
