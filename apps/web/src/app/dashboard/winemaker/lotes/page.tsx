'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useSupabase } from '@/hooks/useSupabase'
import { useWinemakerScope } from '@/hooks/useWinemakerScope'
import { WM_LOT_STATUS_LABEL, type WmWineLotRow } from '@/lib/proof/winemaker-types'
import { countWineLotsByStatus, fetchWineLots } from '@/lib/supabase/winemaker'

export default function WinemakerLotesPage() {
  const supabase = useSupabase()
  const { loading: scopeLoading, ok, userId } = useWinemakerScope()
  const [lotes, setLotes] = useState<WmWineLotRow[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [dataLoading, setDataLoading] = useState(true)

  useEffect(() => {
    if (!ok || !userId) return
    let cancelled = false
    setDataLoading(true)
    Promise.all([countWineLotsByStatus(supabase, userId), fetchWineLots(supabase, userId)])
      .then(([c, rows]) => {
        if (cancelled) return
        setCounts(c)
        setLotes(rows)
      })
      .finally(() => {
        if (!cancelled) setDataLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [ok, userId, supabase])

  if (scopeLoading || !ok) {
    return (
      <div style={{ padding: 32, color: 'var(--fg-2)', fontSize: 14 }}>Cargando…</div>
    )
  }

  return (
    <div style={{ padding: '24px 28px', maxWidth: 960 }}>
      <h1 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 600 }}>Lotes de vino</h1>
      <p style={{ margin: '0 0 24px', color: 'var(--fg-2)', fontSize: 14 }}>
        Fermentación, envejecimiento y embotellado — cada lote con su historial.
      </p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
        {Object.entries(counts).map(([status, n]) =>
          n > 0 ? (
            <span
              key={status}
              style={{
                fontSize: 12,
                padding: '4px 10px',
                borderRadius: 999,
                background: 'var(--bg-2)',
                color: 'var(--fg-1)',
              }}
            >
              {WM_LOT_STATUS_LABEL[status as keyof typeof WM_LOT_STATUS_LABEL] ?? status}: {n}
            </span>
          ) : null
        )}
      </div>

      {dataLoading ? (
        <p style={{ color: 'var(--fg-2)', fontSize: 14 }}>Cargando lotes…</p>
      ) : lotes.length === 0 ? (
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
          Aún no hay lotes. Pregúntale a PROOF en Inicio o registra el primero cuando subas la
          cosecha.
        </div>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
          {lotes.map(l => (
            <li
              key={l.id}
              style={{
                padding: '14px 16px',
                borderRadius: 10,
                background: 'var(--bg-1)',
                border: '0.5px solid var(--border)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <strong>{l.name || l.lot_code}</strong>
                  <div style={{ fontSize: 13, color: 'var(--fg-2)', marginTop: 4 }}>
                    {l.varietal || 'Sin varietal'} · {l.lot_code}
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: 13 }}>
                  <div>{WM_LOT_STATUS_LABEL[l.status]}</div>
                  {l.liters_initial != null ? (
                    <div style={{ color: 'var(--fg-2)' }}>
                      {Number(l.liters_initial).toLocaleString('es-MX')} L
                    </div>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
