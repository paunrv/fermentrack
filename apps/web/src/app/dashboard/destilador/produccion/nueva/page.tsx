'use client'

export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useSupabase } from '@/hooks/useSupabase'
import { useDestiladorScope } from '@/hooks/useDestiladorScope'
import { DestiladorSkeleton } from '@/components/destilador/PipelineHeader'
import { corridaModoLabel } from '@/lib/proof/distiller-i18n'
import type { DestCorridaModo, DestFormatoBotella, LoteRow } from '@/lib/proof/destilador-types'
import {
  estimateBotellas,
  fetchBodegas,
  fetchLotesCrudo,
  iniciarCorridaDestilador,
} from '@/lib/supabase/destilador'

export default function NuevaCorridaPage() {
  const router = useRouter()
  const search = useSearchParams()
  const t = useTranslations('distiller.produccion.nueva')
  const tCommon = useTranslations('distiller.common')
  const tModo = useTranslations('distiller.status.modo')
  const supabase = useSupabase()
  const { loading, ok, userId } = useDestiladorScope()
  const [lotes, setLotes] = useState<LoteRow[]>([])
  const [bodegas, setBodegas] = useState<{ id: string; nombre: string }[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [loteId, setLoteId] = useState(search.get('lote') ?? '')
  const [bodegaId, setBodegaId] = useState('')
  const [formato, setFormato] = useState<DestFormatoBotella>('750ml')
  const [litros, setLitros] = useState('')
  const [modo, setModo] = useState<DestCorridaModo>('equipo')
  const [costoCorrida, setCostoCorrida] = useState('')
  const [personas, setPersonas] = useState('2')
  const [horas, setHoras] = useState('')
  const [tarifa, setTarifa] = useState('')

  useEffect(() => {
    if (!ok || !userId) return
    Promise.all([fetchLotesCrudo(supabase, userId), fetchBodegas(supabase, userId)]).then(
      ([l, b]) => {
        setLotes(l)
        setBodegas(b)
        const emb = b.find(x => x.es_embotellado) ?? b[0]
        if (emb) setBodegaId(emb.id)
        const pre = search.get('lote')
        if (pre && l.some(x => x.id === pre)) setLoteId(pre)
        else if (l[0]) setLoteId(l[0].id)
      }
    )
  }, [ok, userId, supabase, search])

  const loteSel = lotes.find(l => l.id === loteId)
  const litrosNum = parseFloat(litros) || (loteSel ? Number(loteSel.litros_disponibles_granel) : 0)
  const estimadas = useMemo(
    () => estimateBotellas(litrosNum, formato),
    [litrosNum, formato]
  )

  useEffect(() => {
    if (loteSel && !litros) {
      setLitros(String(loteSel.litros_disponibles_granel))
    }
  }, [loteSel, litros])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!userId || !loteId || !bodegaId) return
    setSaving(true)
    setError(null)
    try {
      const { corridaId } = await iniciarCorridaDestilador(supabase, userId, {
        lote_id: loteId,
        bodega_id: bodegaId,
        formato_botella: formato,
        litros_asignados: litrosNum,
        modo,
        costo_corrida: modo === 'equipo' ? parseFloat(costoCorrida) || 0 : undefined,
        personas: modo === 'manual' ? parseInt(personas, 10) || 1 : undefined,
        horas_estimadas: modo === 'manual' ? parseFloat(horas) || 0 : undefined,
        tarifa_hora: modo === 'manual' ? parseFloat(tarifa) || 0 : undefined,
      })
      router.push(`/dashboard/destilador/produccion/${corridaId}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('errors.startFailed'))
    } finally {
      setSaving(false)
    }
  }

  if (loading || !ok) {
    return (
      <div style={{ padding: 28, maxWidth: 720, margin: '0 auto' }}>
        <DestiladorSkeleton />
      </div>
    )
  }

  return (
    <div style={{ padding: '28px 28px 80px', maxWidth: 720, margin: '0 auto' }}>
      <Link href="/dashboard/destilador/produccion" style={{ color: 'var(--fg-3)', fontSize: 12 }}>
        {tCommon('backToProduction')}
      </Link>
      <h1 style={{ margin: '16px 0 24px', fontSize: 24 }}>{t('title')}</h1>

      {lotes.length === 0 ? (
        <p style={{ color: 'var(--fg-2)' }}>
          {t('noLots')}{' '}
          <Link href="/dashboard/destilador/compras" style={{ color: 'var(--gold)' }}>
            {t('receiveFirst')}
          </Link>
          .
        </p>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={lbl}>{t('fields.lote')}</label>
            <select value={loteId} onChange={e => setLoteId(e.target.value)} style={inp}>
              {lotes.map(l => (
                <option key={l.id} value={l.id}>
                  {l.numero_lote} · {l.tipo_agave} ({l.litros_disponibles_granel} L)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={lbl}>{t('fields.bodega')}</label>
            <select value={bodegaId} onChange={e => setBodegaId(e.target.value)} style={inp}>
              {bodegas.map(b => (
                <option key={b.id} value={b.id}>
                  {b.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={lbl}>{t('fields.formato')}</label>
            <select
              value={formato}
              onChange={e => setFormato(e.target.value as DestFormatoBotella)}
              style={inp}
            >
              <option value="750ml">750ml</option>
              <option value="500ml">500ml</option>
              <option value="200ml">200ml</option>
            </select>
          </div>
          <div>
            <label style={lbl}>{t('fields.litros')}</label>
            <input
              type="number"
              step="0.1"
              min={0}
              value={litros}
              onChange={e => setLitros(e.target.value)}
              style={inp}
              className="mono"
              required
            />
            <p className="mono" style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 6 }}>
              {t('estimatedBottles', { count: estimadas })}
            </p>
          </div>
          <div>
            <label style={lbl}>{t('fields.modo')}</label>
            <select value={modo} onChange={e => setModo(e.target.value as DestCorridaModo)} style={inp}>
              <option value="equipo">{corridaModoLabel(tModo, 'equipo')}</option>
              <option value="manual">{corridaModoLabel(tModo, 'manual')}</option>
            </select>
          </div>
          {modo === 'equipo' ? (
            <div>
              <label style={lbl}>{t('fields.costoCorrida')}</label>
              <input
                type="number"
                min={0}
                value={costoCorrida}
                onChange={e => setCostoCorrida(e.target.value)}
                style={inp}
                className="mono"
              />
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <div>
                <label style={lbl}>{t('fields.personas')}</label>
                <input value={personas} onChange={e => setPersonas(e.target.value)} style={inp} />
              </div>
              <div>
                <label style={lbl}>{t('fields.horasEst')}</label>
                <input value={horas} onChange={e => setHoras(e.target.value)} style={inp} />
              </div>
              <div>
                <label style={lbl}>{t('fields.tarifaHora')}</label>
                <input value={tarifa} onChange={e => setTarifa(e.target.value)} style={inp} />
              </div>
            </div>
          )}
          {error && <p style={{ color: 'var(--crit)', fontSize: 13 }}>{error}</p>}
          <button type="submit" disabled={saving} style={btn}>
            {saving ? t('starting') : t('start')}
          </button>
        </form>
      )}
    </div>
  )
}

const lbl: React.CSSProperties = {
  display: 'block',
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'var(--fg-3)',
  marginBottom: 6,
}
const inp: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  background: 'var(--panel)',
  border: '0.5px solid var(--hairline)',
  color: 'var(--fg-0)',
  fontSize: 13,
}
const btn: React.CSSProperties = {
  padding: '12px 16px',
  background: 'var(--gold)',
  color: 'var(--ink)',
  border: 'none',
  fontWeight: 600,
  fontSize: 12,
  textTransform: 'uppercase',
  cursor: 'pointer',
}
