'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useSupabase } from '@/hooks/useSupabase'
import { useWinemakerScope } from '@/hooks/useWinemakerScope'
import type { WmDocumentRow } from '@/lib/proof/winemaker-types'
import { formatSupplyLineLabel } from '@/lib/proof/wm-supply-taxonomy'
import { fetchDocuments } from '@/lib/supabase/winemaker'

export default function WinemakerDocumentosPage() {
  const supabase = useSupabase()
  const { loading: scopeLoading, ok, clerkId } = useWinemakerScope()
  const [docs, setDocs] = useState<WmDocumentRow[]>([])
  const [dataLoading, setDataLoading] = useState(true)

  useEffect(() => {
    if (!ok || !clerkId) return
    let cancelled = false
    setDataLoading(true)
    fetchDocuments(supabase, clerkId, { limit: 100, withLines: true })
      .then(rows => {
        if (!cancelled) setDocs(rows)
      })
      .finally(() => {
        if (!cancelled) setDataLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [ok, clerkId, supabase])

  if (scopeLoading || !ok) {
    return (
      <div style={{ padding: 32, color: 'var(--fg-2)', fontSize: 14 }}>Cargando…</div>
    )
  }

  return (
    <div style={{ padding: '24px 28px', maxWidth: 960 }}>
      <h1 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 600 }}>Documentos</h1>
      <p style={{ margin: '0 0 24px', color: 'var(--fg-2)', fontSize: 14 }}>
        Tickets, facturas, XML y análisis de laboratorio — evidencia inmutable de tu operación.
      </p>

      {dataLoading ? (
        <p style={{ color: 'var(--fg-2)', fontSize: 14 }}>Cargando documentos…</p>
      ) : docs.length === 0 ? (
        <div
          style={{
            padding: 32,
            borderRadius: 12,
            border: '1px dashed var(--border)',
            color: 'var(--fg-2)',
            fontSize: 14,
            lineHeight: 1.6,
          }}
        >
          Sin documentos aún. Sube un ticket desde PROOF — clasificamos proveedor e insumos
          (uva, corchos, botellas…).
        </div>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
          {docs.map(d => (
            <li
              key={d.id}
              style={{
                padding: '14px 16px',
                borderRadius: 10,
                background: 'var(--bg-1)',
                border: '0.5px solid var(--border)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <strong>{d.vendor || d.original_filename || d.document_type}</strong>
                  <div style={{ fontSize: 13, color: 'var(--fg-2)', marginTop: 4 }}>
                    {d.document_type}
                    {typeof d.parsed_json === 'object' &&
                    d.parsed_json &&
                    'total' in d.parsed_json &&
                    d.parsed_json.total != null
                      ? ` · $${Number(d.parsed_json.total).toLocaleString('es-MX')}`
                      : ''}
                  </div>
                </div>
                <div style={{ fontSize: 13, color: 'var(--fg-2)' }}>{d.document_date}</div>
              </div>
              {(d.wm_document_lines?.length ?? 0) > 0 ? (
                <div style={{ fontSize: 12, color: 'var(--fg-2)', marginTop: 8 }}>
                  {d.wm_document_lines!
                    .map(l => formatSupplyLineLabel(l.supply_kind, l.varietal))
                    .join(' · ')}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
