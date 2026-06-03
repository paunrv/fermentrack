'use client'

export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { useSupabase } from '@/hooks/useSupabase'
import { useDestiladorScope } from '@/hooks/useDestiladorScope'
import { DestiladorSkeleton } from '@/components/destilador/PipelineHeader'
import type { CorridaRow } from '@/lib/proof/destilador-types'
import {
  FORMATO_LITROS,
  cerrarCorridaDestilador,
  estimateBotellas,
} from '@/lib/supabase/destilador'

function mermaTone(pct: number): string {
  if (pct <= 5) return 'var(--ok)'
  if (pct <= 8) return 'var(--warn)'
  return 'var(--crit)'
}

export default function CerrarCorridaPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = useSupabase()
  const { loading: scopeLoading, ok, clerkId } = useDestiladorScope()
  const [corrida, setCorrida] = useState<CorridaRow | null>(null)
  const [producidas, setProducidas] = useState('')
  const [defectuosas, setDefectuosas] = useState('0')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!ok || !clerkId || !id) return
    supabase
      .from('corridas_embotellado')
      .select('*, lotes ( numero_lote, tipo_agave )')
      .eq('id', id)
      .eq('clerk_id', clerkId)
      .maybeSingle()
      .then(({ data, error: err }) => {
        if (err) throw err
        setCorrida(data as CorridaRow | null)
        if (data) {
          const est = estimateBotellas(
            Number(data.litros_asignados),
            data.formato_botella as CorridaRow['formato_botella']
          )
          setProducidas(String(est))
        }
      })
  }, [ok, clerkId, id, supabase])

  const mermaPct = useMemo(() => {
    if (!corrida) return 0
    const litros = Number(corrida.litros_asignados)
    const prod = parseInt(producidas, 10) || 0
    const usados = prod * FORMATO_LITROS[corrida.formato_botella]
    if (litros <= 0) return 0
    return (100 * (litros - usados)) / litros
  }, [corrida, producidas])

  async function handleCerrar(e: React.FormEvent) {
    e.preventDefault()
    if (!id) return
    setSaving(true)
    setError(null)
    try {
      const res = await cerrarCorridaDestilador(
        supabase,
        id,
        parseInt(producidas, 10) || 0,
        parseInt(defectuosas, 10) || 0
      )
      router.push(`/dashboard/destilador/lotes/${res.lote_id}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cerrar')
    } finally {
      setSaving(false)
    }
  }

  if (scopeLoading || !ok) {
    return (
      <div style={{ padding: 28, maxWidth: 720, margin: '0 auto' }}>
        <DestiladorSkeleton />
      </div>
    )
  }

  if (!corrida) {
    return (
      <div style={{ padding: 28 }}>
        <p>Corrida no encontrada.</p>
        <Link href="/dashboard/destilador/produccion">← Producción</Link>
      </div>
    )
  }

  if (corrida.estado === 'completada') {
    return (
      <div style={{ padding: 28, maxWidth: 720, margin: '0 auto' }}>
        <p style={{ color: 'var(--ok)' }}>Corrida ya completada.</p>
        <Link href={`/dashboard/destilador/lotes/${corrida.lote_id}`}>Ver lote</Link>
      </div>
    )
  }

  return (
    <div style={{ padding: '28px 28px 80px', maxWidth: 720, margin: '0 auto' }}>
      <Link href="/dashboard/destilador/produccion" style={{ color: 'var(--fg-3)', fontSize: 12 }}>
        ← Producción
      </Link>
      <h1 style={{ margin: '16px 0 8px', fontSize: 24 }}>Cerrar corrida</h1>
      <p className="mono" style={{ fontSize: 12, color: 'var(--fg-2)' }}>
        {corrida.lotes?.numero_lote} · {corrida.formato_botella} · {corrida.litros_asignados} L
      </p>

      <form onSubmit={handleCerrar} style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={lbl}>Botellas producidas</label>
          <input
            type="number"
            min={0}
            value={producidas}
            onChange={e => setProducidas(e.target.value)}
            style={inp}
            className="mono"
            required
          />
        </div>
        <div>
          <label style={lbl}>Botellas defectuosas</label>
          <input
            type="number"
            min={0}
            value={defectuosas}
            onChange={e => setDefectuosas(e.target.value)}
            style={inp}
            className="mono"
          />
        </div>
        <p className="mono" style={{ fontSize: 13, color: mermaTone(mermaPct) }}>
          Merma estimada: {mermaPct.toFixed(1)}%
          {mermaPct > 8 && ' · Alerta >8%'}
        </p>
        <p style={{ fontSize: 12, color: 'var(--fg-3)' }}>
          Al cerrar: descuenta botellas vacías, genera cajas (12 bt) y calcula costo real por botella.
        </p>
        {error && <p style={{ color: 'var(--crit)', fontSize: 13 }}>{error}</p>}
        <button type="submit" disabled={saving} style={btn}>
          {saving ? 'Cerrando…' : 'Cerrar corrida'}
        </button>
      </form>
    </div>
  )
}

const lbl: React.CSSProperties = {
  display: 'block',
  fontSize: 10,
  textTransform: 'uppercase',
  color: 'var(--fg-3)',
  marginBottom: 6,
}
const inp: React.CSSProperties = {
  width: '100%',
  padding: 10,
  background: 'var(--panel)',
  border: '0.5px solid var(--hairline)',
  color: 'var(--fg-0)',
}
const btn: React.CSSProperties = {
  padding: '12px 16px',
  background: 'var(--gold)',
  color: 'var(--ink)',
  border: 'none',
  fontWeight: 600,
  fontSize: 12,
  textTransform: 'uppercase',
}
