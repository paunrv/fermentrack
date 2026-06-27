'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useSupabase } from '@/hooks/useSupabase'
import { fetchOwnerOrganizationId, stageLabel, varietalNamesFromInputs } from '@/lib/supabase/winemaker-owner-home'

type LotDetail = {
  id: string
  code: string
  current_stage: string | null
  status: string
  notes: string | null
  varietal: string | null
}

export default function LoteDetailPage() {
  const params = useParams<{ id: string }>()
  const lotId = params.id
  const supabase = useSupabase()
  const [lot, setLot] = useState<LotDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) throw new Error('No autenticado')

        const orgId = await fetchOwnerOrganizationId(supabase, user.id)
        if (!orgId) throw new Error('Sin organización')

        const { data, error: lotError } = await supabase
          .from('lots')
          .select('id, code, current_stage, status, notes, lot_grape_inputs(varietals(name))')
          .eq('id', lotId)
          .eq('organization_id', orgId)
          .maybeSingle()

        if (lotError) throw lotError
        if (!data) throw new Error('Lote no encontrado')

        const varietalNames = varietalNamesFromInputs(data.lot_grape_inputs)

        if (!cancelled) {
          setLot({
            id: data.id,
            code: data.code,
            current_stage: data.current_stage,
            status: data.status,
            notes: data.notes,
            varietal: varietalNames.length > 0 ? varietalNames.join(', ') : null,
          })
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Error al cargar el lote')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [lotId, supabase])

  return (
    <div
      style={{
        minHeight: '100%',
        background: 'var(--canvas)',
        color: 'var(--fg-0)',
        padding: '16px 16px calc(16px + var(--proof-bottom-nav))',
      }}
    >
      <Link
        href="/dashboard"
        style={{ fontSize: 13, color: 'var(--fg-3)', textDecoration: 'none', fontWeight: 600 }}
      >
        ← Inicio
      </Link>

      {loading ? (
        <p style={{ marginTop: 24, fontSize: 14, color: 'var(--fg-3)' }}>Cargando lote…</p>
      ) : error || !lot ? (
        <p style={{ marginTop: 24, fontSize: 14, color: 'var(--crit)' }}>{error ?? 'Lote no encontrado'}</p>
      ) : (
        <div style={{ marginTop: 20 }}>
          <h1 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>
            {lot.code}
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--fg-3)' }}>
            {stageLabel(lot.current_stage)}
            {lot.varietal ? ` · ${lot.varietal}` : ''}
          </p>
          <p style={{ margin: '12px 0 0', fontSize: 12, color: 'var(--fg-2)' }}>
            Estado: {lot.status}
          </p>
          {lot.notes ? (
            <p style={{ margin: '16px 0 0', fontSize: 13, color: 'var(--fg-2)' }}>{lot.notes}</p>
          ) : null}
        </div>
      )}
    </div>
  )
}
