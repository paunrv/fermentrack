'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useState } from 'react'
import { useSupabase } from '@/hooks/useSupabase'
import { useWinemakerScope } from '@/hooks/useWinemakerScope'
import { WM_SUPPLY_KIND_LABEL } from '@/lib/proof/wm-supply-taxonomy'
import type { WmSupplierRow } from '@/lib/proof/winemaker-types'
import { fetchDocuments, fetchSuppliers } from '@/lib/supabase/winemaker'

export default function WinemakerProveedoresPage() {
  const supabase = useSupabase()
  const { loading: scopeLoading, ok, userId } = useWinemakerScope()
  const [suppliers, setSuppliers] = useState<WmSupplierRow[]>([])
  const [insumosBySupplier, setInsumosBySupplier] = useState<Record<string, string[]>>({})
  const [dataLoading, setDataLoading] = useState(true)

  useEffect(() => {
    if (!ok || !userId) return
    let cancelled = false
    setDataLoading(true)
    Promise.all([
      fetchSuppliers(supabase, userId),
      fetchDocuments(supabase, userId, { limit: 200, withLines: true }),
    ])
      .then(([rows, docs]) => {
        if (cancelled) return
        setSuppliers(rows)
        const map: Record<string, Set<string>> = {}
        for (const doc of docs) {
          for (const line of doc.wm_document_lines ?? []) {
            const sid = line.supplier_id ?? doc.supplier_id
            if (!sid) continue
            if (!map[sid]) map[sid] = new Set()
            map[sid].add(WM_SUPPLY_KIND_LABEL[line.supply_kind] ?? line.supply_kind)
          }
        }
        const out: Record<string, string[]> = {}
        for (const [id, set] of Object.entries(map)) {
          out[id] = [...set]
        }
        setInsumosBySupplier(out)
      })
      .finally(() => {
        if (!cancelled) setDataLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [ok, userId, supabase])

  const sorted = useMemo(
    () => [...suppliers].sort((a, b) => a.name.localeCompare(b.name, 'es')),
    [suppliers]
  )

  if (scopeLoading || !ok) {
    return <div style={{ padding: 32, color: 'var(--fg-2)', fontSize: 14 }}>Cargando…</div>
  }

  return (
    <div style={{ padding: '24px 28px', maxWidth: 960 }}>
      <h1 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 600 }}>Proveedores</h1>
      <p style={{ margin: '0 0 24px', color: 'var(--fg-2)', fontSize: 14, lineHeight: 1.5 }}>
        Catálogo que PROOF construye al subir tickets: uva, corchos, botellas, etiquetas y más.
      </p>

      {dataLoading ? (
        <p style={{ color: 'var(--fg-2)', fontSize: 14 }}>Cargando proveedores…</p>
      ) : sorted.length === 0 ? (
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
          Aún no hay proveedores. Sube un ticket desde PROOF y guardamos el proveedor con el tipo de
          insumo detectado.
        </div>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
          {sorted.map(s => (
            <li
              key={s.id}
              style={{
                padding: '14px 16px',
                borderRadius: 10,
                background: 'var(--bg-1)',
                border: '0.5px solid var(--border)',
              }}
            >
              <strong>{s.name}</strong>
              {(insumosBySupplier[s.id]?.length ?? 0) > 0 ? (
                <div style={{ fontSize: 13, color: 'var(--fg-2)', marginTop: 6 }}>
                  Insumos: {insumosBySupplier[s.id]?.join(' · ')}
                </div>
              ) : (
                <div style={{ fontSize: 13, color: 'var(--fg-2)', marginTop: 6 }}>
                  Sin líneas clasificadas aún
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
