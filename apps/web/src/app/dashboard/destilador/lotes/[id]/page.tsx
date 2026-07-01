'use client'

export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useSupabase } from '@/hooks/useSupabase'
import { useDestiladorScope } from '@/hooks/useDestiladorScope'
import { useDistillerContextMessage } from '@/hooks/useDistillerContextMessage'
import { DestiladorSkeleton } from '@/components/destilador/PipelineHeader'
import { loteStatusLabel } from '@/lib/proof/distiller-i18n'
import { fmtLitros, fmtMoney } from '@/lib/proof/format'
import type { CorridaRow, LoteRow } from '@/lib/proof/destilador-types'
import {
  FORMATO_LITROS,
  fetchCorridasByLote,
  fetchLoteById,
} from '@/lib/supabase/destilador'

function LoteBar({
  granel,
  embotellado,
  merma,
  litrosRecibidos,
  labels,
}: {
  granel: number
  embotellado: number
  merma: number
  litrosRecibidos: number
  labels: { embotellado: string; granel: string; merma: string; embotShort: string; granelShort: string; mermaShort: string }
}) {
  const total = Math.max(litrosRecibidos, granel + embotellado + merma, 1)
  const pct = (n: number) => `${Math.min(100, (100 * n) / total).toFixed(1)}%`
  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', height: 10, overflow: 'hidden' }}>
        <div style={{ width: pct(embotellado), background: 'var(--gold)' }} title={labels.embotellado} />
        <div style={{ width: pct(granel), background: 'var(--info)' }} title={labels.granel} />
        <div style={{ width: pct(merma), background: 'var(--warn)' }} title={labels.merma} />
      </div>
      <div className="mono" style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 11, color: 'var(--fg-3)' }}>
        <span>
          {labels.embotShort} {fmtLitros(embotellado)}
        </span>
        <span>
          {labels.granelShort} {fmtLitros(granel)}
        </span>
        <span>
          {labels.mermaShort} {fmtLitros(merma)}
        </span>
      </div>
    </div>
  )
}

export default function DetalleLotePage() {
  const { id } = useParams<{ id: string }>()
  const t = useTranslations('distiller.lotes.detail')
  const tCommon = useTranslations('distiller.common')
  const tStatus = useTranslations('distiller.status.lote')
  const contextMessage = useDistillerContextMessage()
  const supabase = useSupabase()
  const { loading: scopeLoading, ok, userId } = useDestiladorScope()
  const [lote, setLote] = useState<LoteRow | null>(null)
  const [corridas, setCorridas] = useState<CorridaRow[]>([])
  const [dataLoading, setDataLoading] = useState(true)

  const barLabels = useMemo(
    () => ({
      embotellado: t('barEmbotellado'),
      granel: t('barGranel'),
      merma: t('barMerma'),
      embotShort: t('embotShort'),
      granelShort: t('granelShort'),
      mermaShort: t('mermaShort'),
    }),
    [t]
  )

  useEffect(() => {
    if (!ok || !userId || !id) return
    let cancelled = false
    setDataLoading(true)
    Promise.all([
      fetchLoteById(supabase, userId, id),
      fetchCorridasByLote(supabase, userId, id),
    ])
      .then(([l, c]) => {
        if (cancelled) return
        setLote(l)
        setCorridas(c)
      })
      .finally(() => {
        if (!cancelled) setDataLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [ok, userId, id, supabase])

  const stats = useMemo(() => {
    if (!lote) return null
    const recibidos = Number(lote.litros_recibidos)
    const granel = Number(lote.litros_disponibles_granel)
    let embotellado = 0
    let merma = 0
    for (const c of corridas) {
      if (c.estado === 'completada') {
        embotellado +=
          c.botellas_producidas * FORMATO_LITROS[c.formato_botella]
        merma += Number(c.merma_litros ?? 0)
      } else if (c.estado === 'activa') {
        embotellado += Number(c.litros_asignados)
      }
    }
    const activa = corridas.find(c => c.estado === 'activa')
    const ultimaCerrada = corridas.find(c => c.estado === 'completada')
    const dias = Math.max(
      0,
      Math.floor((Date.now() - new Date(lote.fecha_recepcion).getTime()) / 86400000)
    )
    return { recibidos, granel, embotellado, merma, activa, ultimaCerrada, dias }
  }, [lote, corridas])

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

  if (!lote || !stats) {
    return (
      <div style={{ padding: 28, maxWidth: 720, margin: '0 auto' }}>
        <p style={{ color: 'var(--crit)' }}>{tCommon('notFound.lot')}</p>
        <Link href="/dashboard/destilador/lotes">{tCommon('backToLots')}</Link>
      </div>
    )
  }

  const pv = lote.productos_viaje
  const costoLitro =
    pv && Number(pv.litros_acordados) > 0
      ? Number(pv.precio_por_litro) +
        Number(pv.flete_proporcional ?? 0) / Number(pv.litros_acordados)
      : null

  return (
    <div style={{ padding: '28px 28px 80px', maxWidth: 720, margin: '0 auto' }}>
      <Link href="/dashboard/destilador/lotes" style={{ color: 'var(--fg-3)', fontSize: 12 }}>
        {tCommon('backToLots')}
      </Link>

      <header style={{ margin: '16px 0 20px' }}>
        <p className="mono" style={{ margin: 0, fontSize: 13, color: 'var(--gold)' }}>
          {lote.numero_lote}
        </p>
        <h1 style={{ margin: '8px 0 4px', fontSize: 24 }}>{lote.tipo_agave}</h1>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--fg-2)' }}>
          {lote.maestro} · {lote.comunidad} · {loteStatusLabel(tStatus, lote.estado)}
        </p>
      </header>

      <div
        style={{
          padding: 14,
          marginBottom: 20,
          border: '0.5px solid var(--hairline)',
          background: 'var(--panel)',
          fontSize: 13,
          color: 'var(--fg-1)',
        }}
      >
        {contextMessage(lote.estado, {
          diasEnBodega: stats.dias,
          litrosGranel: stats.granel,
        })}
      </div>

      <LoteBar
        granel={stats.granel}
        embotellado={stats.embotellado}
        merma={stats.merma}
        litrosRecibidos={stats.recibidos}
        labels={barLabels}
      />

      <section className="mono" style={{ marginTop: 24, fontSize: 12, lineHeight: 1.8, color: 'var(--fg-2)' }}>
        <div>
          {t('received')} {fmtLitros(stats.recibidos)}
        </div>
        {lote.abv != null && (
          <div>
            {t('abv')} {lote.abv}%
          </div>
        )}
        {costoLitro != null && (
          <div>
            {t('costMezcal')} {fmtMoney(costoLitro)}/L
          </div>
        )}
        {stats.ultimaCerrada?.costo_real_por_botella != null && (
          <div style={{ color: 'var(--gold)' }}>
            {t('costPerBottle')} {fmtMoney(Number(stats.ultimaCerrada.costo_real_por_botella))}
          </div>
        )}
      </section>

      {stats.activa && (
        <Link
          href={`/dashboard/destilador/produccion/${stats.activa.id}`}
          style={{
            display: 'inline-block',
            marginTop: 20,
            padding: '10px 14px',
            background: 'var(--gold)',
            color: 'var(--ink)',
            fontSize: 11,
            fontWeight: 600,
            textDecoration: 'none',
            textTransform: 'uppercase',
          }}
        >
          {t('closeActiveRun')}
        </Link>
      )}

      {lote.estado === 'en_bodega_crudo' && (
        <Link
          href={`/dashboard/destilador/produccion/nueva?lote=${lote.id}`}
          style={{
            display: 'inline-block',
            marginTop: 12,
            marginLeft: stats.activa ? 12 : 0,
            padding: '10px 14px',
            border: '0.5px solid var(--gold)',
            color: 'var(--gold)',
            fontSize: 11,
            fontWeight: 600,
            textDecoration: 'none',
            textTransform: 'uppercase',
          }}
        >
          {t('newRun')}
        </Link>
      )}
    </div>
  )
}
