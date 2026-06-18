'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useSupabase } from '@/hooks/useSupabase'
import { useWinemakerScope } from '@/hooks/useWinemakerScope'
import { fmtMoney } from '@/lib/proof/format'
import type { WmProductionCostRow } from '@/lib/proof/winemaker-types'
import { fetchProductionCosts } from '@/lib/supabase/winemaker'

export default function WinemakerGastosPage() {
  const supabase = useSupabase()
  const { loading: scopeLoading, ok, clerkId } = useWinemakerScope()
  const [costs, setCosts] = useState<WmProductionCostRow[]>([])
  const [dataLoading, setDataLoading] = useState(true)

  useEffect(() => {
    if (!ok || !clerkId) return
    let cancelled = false
    setDataLoading(true)
    fetchProductionCosts(supabase, clerkId, { limit: 200 })
      .then(rows => {
        if (!cancelled) setCosts(rows)
      })
      .finally(() => {
        if (!cancelled) setDataLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [ok, clerkId, supabase])

  const total = costs.reduce((s, c) => s + Number(c.amount), 0)
  const overhead = costs.filter(c => c.lot_id == null).reduce((s, c) => s + Number(c.amount), 0)

  if (scopeLoading || !ok) {
    return (
      <div style={{ padding: 32, color: 'var(--fg-2)', fontSize: 14 }}>Cargando…</div>
    )
  }

  return (
    <div style={{ padding: '24px 28px', maxWidth: 960 }}>
      <h1 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 600 }}>Gastos</h1>
      <p style={{ margin: '0 0 16px', color: 'var(--fg-2)', fontSize: 14 }}>
        Costos de lote y gastos de bodega (sin lote asignado).
      </p>

      <div style={{ display: 'flex', gap: 16, marginBottom: 24, fontSize: 14 }}>
        <span>
          Total registrado: <strong>{fmtMoney(total)}</strong>
        </span>
        <span style={{ color: 'var(--fg-2)' }}>
          Bodega (overhead): {fmtMoney(overhead)}
        </span>
      </div>

      {dataLoading ? (
        <p style={{ color: 'var(--fg-2)', fontSize: 14 }}>Cargando gastos…</p>
      ) : costs.length === 0 ? (
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
          Sin gastos registrados. Dile a PROOF cuánto pagaste en un ticket o servicio de bodega.
        </div>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
          {costs.map(c => (
            <li
              key={c.id}
              style={{
                padding: '14px 16px',
                borderRadius: 10,
                background: 'var(--bg-1)',
                border: '0.5px solid var(--border)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <strong>{c.description || c.category}</strong>
                  <div style={{ fontSize: 13, color: 'var(--fg-2)', marginTop: 4 }}>
                    {c.category} · {c.lot_id ? 'Lote' : 'Bodega'}
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: 13 }}>
                  <div>{fmtMoney(Number(c.amount))}</div>
                  <div style={{ color: 'var(--fg-2)' }}>{c.cost_date}</div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
