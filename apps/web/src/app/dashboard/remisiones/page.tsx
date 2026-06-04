'use client'

export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useProfile } from '@/context/ProfileContext'
import { useSupabase } from '@/hooks/useSupabase'
import { ConnectedProofAIBar } from '@/components/proof/ConnectedProofAIBar'
import { fmtBottles } from '@/lib/proof/format'
import { fetchRecepcionesRemision, type RecepcionRemisionListRow } from '@/lib/supabase'

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function RemisionesPage() {
  const { scope } = useProfile()
  const supabase = useSupabase()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<RecepcionRemisionListRow[]>([])

  useEffect(() => {
    if (!scope) return
    let cancelled = false
    setLoading(true)
    fetchRecepcionesRemision(supabase, scope)
      .then(data => {
        if (!cancelled) setRows(data)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [scope?.clerk_id, scope?.profile_type_v2, supabase])

  return (
    <div style={{ padding: '28px 28px 100px', maxWidth: 800, margin: '0 auto' }}>
      <h1 style={{ margin: '0 0 8px', fontSize: 28, fontWeight: 800, color: 'var(--fg-0)' }}>
        Remisiones
      </h1>
      <p style={{ margin: '0 0 24px', fontSize: 14, color: 'var(--fg-2)' }}>
        Recepciones confirmadas con evidencia — historial de entradas.
      </p>

      {loading ? (
        <p style={{ color: 'var(--fg-3)', fontSize: 13 }}>Cargando…</p>
      ) : rows.length === 0 ? (
        <div
          style={{
            padding: 40,
            textAlign: 'center',
            border: '1px solid var(--hairline)',
            borderRadius: 'var(--radius-card)',
            background: 'var(--panel)',
            color: 'var(--fg-3)',
            fontSize: 13,
          }}
        >
          Sin remisiones. Confirma una recepción en{' '}
          <Link href="/dashboard/recepcion" style={{ color: 'var(--gold)' }}>
            Entrada foto
          </Link>
          .
        </div>
      ) : (
        <div style={{ border: '1px solid var(--hairline)', borderRadius: 'var(--radius-card)' }}>
          {rows.map((r, i) => (
            <Link
              key={r.id}
              href={`/dashboard/remisiones/${r.id}`}
              style={{
                display: 'block',
                padding: '16px 18px',
                borderBottom: i < rows.length - 1 ? '1px solid var(--hairline)' : 'none',
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <div className="mono" style={{ fontSize: 12, color: 'var(--gold)', marginBottom: 4 }}>
                    {r.codigo}
                  </div>
                  <div style={{ fontWeight: 600, color: 'var(--fg-0)' }}>{r.productor}</div>
                  <div style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 4 }}>
                    {fmtDateTime(r.fecha_recepcion)} · {fmtBottles(r.botellas_recibidas)} bts
                    {r.discrepancias_count > 0 && (
                      <span style={{ color: 'var(--warn)' }}>
                        {' '}
                        · {r.discrepancias_count} discrepancia
                        {r.discrepancias_count === 1 ? '' : 's'}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  {r.foto_urls?.length > 0 && (
                    <span className="mono" style={{ fontSize: 10, color: 'var(--ok)' }}>
                      FOTO
                    </span>
                  )}
                  {r.estado === 'con_discrepancias' && (
                    <div className="mono" style={{ fontSize: 10, color: 'var(--warn)', marginTop: 4 }}>
                      CON DISC.
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <ConnectedProofAIBar
        pantalla="remisiones"
        profileType="distributor"
        hints={{ pantalla: { count: rows.length } }}
        fallback={{
          mensaje: 'Las remisiones reflejan recepciones confirmadas con evidencia en Storage.',
        }}
      />
    </div>
  )
}
