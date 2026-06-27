'use client'

export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { useSupabase } from '@/hooks/useSupabase'
import { useDestiladorScope } from '@/hooks/useDestiladorScope'
import { DestiladorSkeleton } from '@/components/destilador/PipelineHeader'
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
      setError(err instanceof Error ? err.message : 'No se pudo iniciar la corrida')
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
        ← Producción
      </Link>
      <h1 style={{ margin: '16px 0 24px', fontSize: 24 }}>Nueva corrida</h1>

      {lotes.length === 0 ? (
        <p style={{ color: 'var(--fg-2)' }}>
          No hay lotes en bodega crudo.{' '}
          <Link href="/dashboard/destilador/compras" style={{ color: 'var(--gold)' }}>
            Recibe un viaje primero
          </Link>
          .
        </p>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={lbl}>Lote</label>
            <select value={loteId} onChange={e => setLoteId(e.target.value)} style={inp}>
              {lotes.map(l => (
                <option key={l.id} value={l.id}>
                  {l.numero_lote} · {l.tipo_agave} ({l.litros_disponibles_granel} L)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={lbl}>Bodega embotellado</label>
            <select value={bodegaId} onChange={e => setBodegaId(e.target.value)} style={inp}>
              {bodegas.map(b => (
                <option key={b.id} value={b.id}>
                  {b.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={lbl}>Formato</label>
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
            <label style={lbl}>Litros a embotellar</label>
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
              ~{estimadas} botellas estimadas
            </p>
          </div>
          <div>
            <label style={lbl}>Modo</label>
            <select value={modo} onChange={e => setModo(e.target.value as DestCorridaModo)} style={inp}>
              <option value="equipo">Equipo</option>
              <option value="manual">Manual</option>
            </select>
          </div>
          {modo === 'equipo' ? (
            <div>
              <label style={lbl}>Costo corrida</label>
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
                <label style={lbl}>Personas</label>
                <input value={personas} onChange={e => setPersonas(e.target.value)} style={inp} />
              </div>
              <div>
                <label style={lbl}>Horas est.</label>
                <input value={horas} onChange={e => setHoras(e.target.value)} style={inp} />
              </div>
              <div>
                <label style={lbl}>$/hora</label>
                <input value={tarifa} onChange={e => setTarifa(e.target.value)} style={inp} />
              </div>
            </div>
          )}
          {error && <p style={{ color: 'var(--crit)', fontSize: 13 }}>{error}</p>}
          <button type="submit" disabled={saving} style={btn}>
            {saving ? 'Iniciando…' : 'Iniciar corrida'}
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
