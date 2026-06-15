'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useProfile } from '@/context/ProfileContext'
import { useSupabase } from '@/hooks/useSupabase'
import { OrdenCompraCanvasCard } from '@/components/proof/OrdenCompraCanvasCard'
import { OrdenCompraPendienteDetalle } from '@/components/proof/OrdenCompraPendienteDetalle'
import {
  fetchOrdenesCompraDistribuidorPendientes,
  type OrdenCompraDistribuidorWithItems,
} from '@/lib/supabase/distribuidor'

export function ProofOrdenCompraPanel({
  accent,
  initialOrdenId,
  onDismiss,
}: {
  accent: string
  initialOrdenId?: string | null
  onDismiss?: () => void
}) {
  const supabase = useSupabase()
  const { scope } = useProfile()
  const [ordenes, setOrdenes] = useState<OrdenCompraDistribuidorWithItems[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(initialOrdenId ?? null)
  const [collapsed, setCollapsed] = useState(false)

  const reload = useCallback(async () => {
    if (!scope) return
    setLoading(true)
    try {
      const data = await fetchOrdenesCompraDistribuidorPendientes(supabase, scope)
      setOrdenes(data)
    } finally {
      setLoading(false)
    }
  }, [scope, supabase])

  useEffect(() => {
    void reload()
  }, [reload])

  useEffect(() => {
    if (initialOrdenId) {
      setSelectedId(initialOrdenId)
      setCollapsed(false)
    }
  }, [initialOrdenId])

  if (!scope) return null

  const selected = ordenes.find(o => o.id === selectedId)

  if (collapsed) {
    return (
      <div
        style={{
          flexShrink: 0,
          padding: '8px 20px',
          borderBottom: '0.5px solid var(--color-border-tertiary)',
          background: 'var(--color-background-primary)',
        }}
      >
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: 'var(--color-text-primary)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'var(--font-display)',
          }}
        >
          {ordenes.length} OC pendiente{ordenes.length === 1 ? '' : 's'} · Ver
        </button>
      </div>
    )
  }

  if (selectedId && (selected || initialOrdenId === selectedId)) {
    return (
      <div
        style={{
          flexShrink: 0,
          maxHeight: 'min(52vh, 420px)',
          overflowY: 'auto',
          borderBottom: '0.5px solid var(--color-border-tertiary)',
          background: 'var(--color-background-primary)',
        }}
      >
        <OrdenCompraPendienteDetalle
          ordenId={selectedId}
          accent={accent}
          onClose={() => {
            setSelectedId(null)
            onDismiss?.()
          }}
          onRecibido={() => {
            void reload()
            setSelectedId(null)
            onDismiss?.()
          }}
        />
      </div>
    )
  }

  if (loading && ordenes.length === 0) return null
  if (ordenes.length === 0) return null

  return (
    <section
      aria-label="Órdenes de compra pendientes"
      style={{
        flexShrink: 0,
        padding: '12px 20px',
        borderBottom: '0.5px solid var(--color-border-tertiary)',
        background: 'var(--color-background-primary)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 10,
          maxWidth: 720,
          marginLeft: 'auto',
          marginRight: 'auto',
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: 12,
            fontWeight: 500,
            color: 'var(--color-text-tertiary)',
            fontFamily: 'var(--font-display)',
          }}
        >
          Órdenes de compra pendientes
        </h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Link
            href="/dashboard/distribuidor/compras/nuevo"
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: accent,
              textDecoration: 'none',
            }}
          >
            + Nueva OC
          </Link>
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            aria-label="Ocultar órdenes de compra"
            style={{
              fontSize: 12,
              color: 'var(--color-text-tertiary)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Ocultar
          </button>
        </div>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 10,
          maxWidth: 720,
          margin: '0 auto',
        }}
      >
        {ordenes.map(o => (
          <OrdenCompraCanvasCard
            key={o.id}
            orden={o}
            accent={accent}
            selected={selectedId === o.id}
            onClick={() => setSelectedId(o.id)}
          />
        ))}
      </div>
    </section>
  )
}
