'use client'

export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useSupabase } from '@/hooks/useSupabase'
import { useDestiladorScope } from '@/hooks/useDestiladorScope'
import { DestiladorSkeleton } from '@/components/destilador/PipelineHeader'
import { VuOpsPage } from '@/components/proof/VuOpsPage'
import { fmtMoney } from '@/lib/proof/format'
import type { CorridaRow, StockBotellaRow, StockEtiquetaRow } from '@/lib/proof/destilador-types'
import {
  fetchCorridas,
  fetchStockBotellas,
  fetchStockEtiquetas,
  isDestSchemaMissingError,
} from '@/lib/supabase/destilador'

export default function DestiladorProduccionPage() {
  const t = useTranslations('distiller.produccion')
  const tCommon = useTranslations('distiller.common')
  const supabase = useSupabase()
  const { loading: scopeLoading, ok, userId } = useDestiladorScope()
  const [botellas, setBotellas] = useState<StockBotellaRow[]>([])
  const [etiquetas, setEtiquetas] = useState<StockEtiquetaRow[]>([])
  const [corridas, setCorridas] = useState<CorridaRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [dataLoading, setDataLoading] = useState(true)

  useEffect(() => {
    if (!ok || !userId) return
    let cancelled = false
    setDataLoading(true)
    Promise.all([
      fetchStockBotellas(supabase, userId),
      fetchStockEtiquetas(supabase, userId),
      fetchCorridas(supabase, userId, { limit: 30 }),
    ])
      .then(([b, e, c]) => {
        if (cancelled) return
        setBotellas(b)
        setEtiquetas(e)
        setCorridas(c)
        setError(null)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const fallback = t('errors.loadFailed')
        setError(err instanceof Error ? err.message : fallback)
      })
      .finally(() => {
        if (!cancelled) setDataLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [ok, userId, supabase])

  const alertaInsumo = useMemo(() => {
    const b0 = botellas.some(b => b.cantidad_disponible <= 0)
    const e0 = etiquetas.some(e => e.cantidad_disponible <= 0)
    return b0 || e0 || botellas.length === 0
  }, [botellas, etiquetas])

  const activas = corridas.filter(c => c.estado === 'activa')

  const newRunLink = (
    <Link
      href="/dashboard/destilador/produccion/nueva"
      style={{
        padding: '8px 14px',
        background: 'var(--gold)',
        color: 'var(--ink)',
        fontSize: 11,
        fontWeight: 600,
        textDecoration: 'none',
        textTransform: 'uppercase',
      }}
    >
      {t('newRun')}
    </Link>
  )

  if (scopeLoading || !ok) {
    return (
      <VuOpsPage title={t('title')}>
        <DestiladorSkeleton />
      </VuOpsPage>
    )
  }

  return (
    <VuOpsPage title={t('title')} actions={newRunLink}>
      {dataLoading ? (
        <DestiladorSkeleton lines={5} />
      ) : (
        <>
          {error && (
            <p style={{ color: 'var(--crit)', fontSize: 13, marginBottom: 16 }}>
              {isDestSchemaMissingError(error) ? t('errors.schemaPending') : error}
            </p>
          )}

          {alertaInsumo && (
            <p
              style={{
                padding: 12,
                marginBottom: 20,
                border: '0.5px solid var(--warn)',
                color: 'var(--warn)',
                fontSize: 13,
              }}
            >
              {t('stockCritical')}
            </p>
          )}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: 10,
              marginBottom: 28,
            }}
          >
            {botellas.map(b => (
              <div
                key={b.formato}
                style={{
                  padding: 12,
                  border: '0.5px solid var(--hairline)',
                  background: 'var(--panel)',
                }}
              >
                <div style={{ fontSize: 10, color: 'var(--fg-3)', textTransform: 'uppercase' }}>
                  {t('bottleStock', { format: b.formato })}
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 18,
                    marginTop: 6,
                    color: b.cantidad_disponible <= 0 ? 'var(--crit)' : 'var(--fg-0)',
                  }}
                >
                  {b.cantidad_disponible}
                </div>
              </div>
            ))}
            {etiquetas.slice(0, 6).map((e, i) => (
              <div
                key={`${e.tipo}-${i}`}
                style={{
                  padding: 12,
                  border: '0.5px solid var(--hairline)',
                  background: 'var(--panel)',
                }}
              >
                <div style={{ fontSize: 10, color: 'var(--fg-3)' }}>{e.tipo}</div>
                <div
                  className="mono"
                  style={{
                    fontSize: 16,
                    marginTop: 6,
                    color: e.cantidad_disponible <= 0 ? 'var(--crit)' : 'var(--fg-0)',
                  }}
                >
                  {e.cantidad_disponible}
                </div>
              </div>
            ))}
          </div>

          {activas.length > 0 && (
            <section style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>{t('activeRuns')}</h2>
              {activas.map(c => (
                <Link
                  key={c.id}
                  href={`/dashboard/destilador/produccion/${c.id}`}
                  style={{
                    display: 'block',
                    padding: 14,
                    marginBottom: 8,
                    border: '0.5px solid var(--gold)',
                    textDecoration: 'none',
                    color: 'inherit',
                  }}
                >
                  <span className="mono" style={{ color: 'var(--gold)' }}>
                    {c.lotes?.numero_lote ?? tCommon('lot')} · {c.formato_botella}
                  </span>
                  <div style={{ fontSize: 13, marginTop: 4, color: 'var(--fg-2)' }}>
                    {t('activeRunLine', { liters: c.litros_asignados })}
                  </div>
                </Link>
              ))}
            </section>
          )}

          <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>{t('recent')}</h2>
          <div style={{ border: '0.5px solid var(--hairline)' }}>
            {corridas.filter(c => c.estado === 'completada').length === 0 ? (
              <p style={{ padding: 16, color: 'var(--fg-2)' }}>{t('completedEmpty')}</p>
            ) : (
              corridas
                .filter(c => c.estado === 'completada')
                .map((c, i) => (
                  <div
                    key={c.id}
                    style={{
                      padding: '12px 14px',
                      borderTop: i ? '0.5px solid var(--hairline)' : undefined,
                    }}
                  >
                    <span className="mono" style={{ fontSize: 12 }}>
                      {t('completedLine', {
                        lot: c.lotes?.numero_lote ?? tCommon('lot'),
                        bottles: c.botellas_producidas,
                        pct: Number(c.merma_porcentaje).toFixed(1),
                      })}
                    </span>
                    {c.costo_real_por_botella != null && (
                      <span style={{ marginLeft: 10, color: 'var(--gold)', fontSize: 12 }}>
                        {fmtMoney(Number(c.costo_real_por_botella))}/bt
                      </span>
                    )}
                  </div>
                ))
            )}
          </div>
        </>
      )}
    </VuOpsPage>
  )
}
