'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { LabReportCard } from '@/components/proof/LabReportCard'
import { useSupabase } from '@/hooks/useSupabase'
import { fetchLabReports } from '@/lib/proof/fetch-lab-reports'
import { fetchOwnerOrganizationId } from '@/lib/supabase/winemaker-owner-home'
import type { LabReportWithSamples } from '@proof/types'

export default function LabReportsPage() {
  const supabase = useSupabase()
  const [reports, setReports] = useState<LabReportWithSamples[]>([])
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
        if (!user) throw new Error('notAuthenticated')

        const orgId = await fetchOwnerOrganizationId(supabase, user.id)
        if (!orgId) throw new Error('noOrganization')

        const data = await fetchLabReports(supabase, orgId)
        if (!cancelled) setReports(data)
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof Error && err.message === 'notAuthenticated'
              ? 'Inicia sesión para ver los informes de laboratorio.'
              : err instanceof Error && err.message === 'noOrganization'
                ? 'No hay bodega activa para mostrar análisis.'
                : 'No se pudieron cargar los informes de laboratorio.'
          setError(message)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [supabase])

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

      <header style={{ marginTop: 20, marginBottom: 20 }}>
        <h1
          style={{
            margin: '0 0 6px',
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: '-0.02em',
          }}
        >
          Análisis de laboratorio
        </h1>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--fg-3)', lineHeight: 1.45 }}>
          Informes importados con muestras y parámetros medidos. Solo lectura.
        </p>
      </header>

      {loading ? (
        <p style={{ fontSize: 14, color: 'var(--fg-3)' }}>Cargando informes…</p>
      ) : error ? (
        <p style={{ fontSize: 14, color: 'var(--crit)' }}>{error}</p>
      ) : reports.length === 0 ? (
        <div
          style={{
            padding: 20,
            borderRadius: 12,
            border: '0.5px dashed var(--hairline)',
            background: 'var(--panel)',
          }}
        >
          <p style={{ margin: 0, fontSize: 14, color: 'var(--fg-2)' }}>
            Aún no hay informes de laboratorio registrados.
          </p>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--fg-3)' }}>
            Cuando importes un PDF de Ardoa, CETyS u otro laboratorio, aparecerá aquí con sus
            muestras y resultados.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {reports.map(report => (
            <LabReportCard key={report.id} report={report} />
          ))}
        </div>
      )}
    </div>
  )
}
