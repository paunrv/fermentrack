'use client'

export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useProfile } from '@/context/ProfileContext'
import { useSupabase } from '@/hooks/useSupabase'
import { fetchPedidos, type PedidoRow, type EstadoPedido } from '@/lib/supabase'
import { fmtMoney } from '@/lib/proof/format'

const ESTADO_LABEL: Record<EstadoPedido, string> = {
  borrador: 'Borrador',
  confirmado: 'Confirmado',
  preparando: 'Preparando',
  en_ruta: 'En ruta',
  entregado: 'Entregado',
  parcial: 'Parcial',
  cancelado: 'Cancelado',
}

export default function PedidosPage() {
  const { scope } = useProfile()
  const supabase = useSupabase()
  const [rows, setRows] = useState<PedidoRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!scope) return
    let cancelled = false
    setLoading(true)
    fetchPedidos(supabase, scope, { limit: 50 })
      .then(data => {
        if (!cancelled) setRows(data)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [scope?.clerk_id, scope?.profile_type_v2])

  return (
    <div style={{ padding: '28px 28px 80px', maxWidth: 900, margin: '0 auto' }}>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 24,
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1 style={{ margin: '0 0 6px', fontSize: 28, fontWeight: 800, color: 'var(--fg-0)' }}>
            Pedidos
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--fg-2)' }}>
            Toma de pedidos en campo · entrega y anticipo
          </p>
        </div>
        <Link
          href="/dashboard/pedidos/nuevo"
          style={{
            padding: '10px 16px',
            background: 'var(--gold)',
            color: 'var(--ink)',
            fontWeight: 600,
            fontSize: 12,
            textDecoration: 'none',
            borderRadius: 'var(--radius-sm)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          Toma de pedidos
        </Link>
      </header>

      {loading ? (
        <p style={{ color: 'var(--fg-3)' }}>Cargando…</p>
      ) : rows.length === 0 ? (
        <p style={{ color: 'var(--fg-2)' }}>
          Sin pedidos.{' '}
          <Link href="/dashboard/pedidos/nuevo" style={{ color: 'var(--gold)' }}>
            Crear el primero
          </Link>
        </p>
      ) : (
        <div style={{ border: '1px solid var(--hairline)', borderRadius: 'var(--radius-card)' }}>
          {rows.map((p, i) => (
            <Link
              key={p.id}
              href={`/dashboard/pedidos/${p.id}`}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '14px 16px',
                borderBottom: i < rows.length - 1 ? '1px solid var(--hairline)' : 'none',
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <div>
                <span className="mono" style={{ fontSize: 12, color: 'var(--gold)' }}>
                  {p.numero}
                </span>
                <div style={{ fontSize: 13, color: 'var(--fg-2)', marginTop: 4 }}>
                  {(p as PedidoRow & { clients?: { name: string } }).clients?.name ?? 'Cliente'}
                  {p.etiqueta_nombre ? ` · ${p.etiqueta_nombre}` : ''}
                  {' · '}
                  Entrega {p.fecha_entrega} · {ESTADO_LABEL[p.estado]}
                </div>
              </div>
              <span className="mono" style={{ fontWeight: 600, color: 'var(--fg-0)' }}>
                {fmtMoney(Number(p.total))}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
