'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useProfile } from '@/context/ProfileContext'
import { useSupabase } from '@/hooks/useSupabase'
import { OrdenCompraDocumentCard } from '@/components/proof/OrdenCompraDocumentCard'
import { OrdenCompraCanvasCard } from '@/components/proof/OrdenCompraCanvasCard'
import {
  confirmarLlegadaOrdenCompraDistribuidor,
  fetchOrdenesCompraDistribuidorPendientes,
  lineasRecepcionCompleta,
  type OrdenCompraDistribuidorWithItems,
} from '@/lib/supabase/distribuidor'

export function ProofOrdenCompraPanel({
  accent,
  initialOrdenId,
  onDismiss,
  onIngresoConfirmado,
  className,
}: {
  accent: string
  initialOrdenId?: string | null
  onDismiss?: () => void
  onIngresoConfirmado?: () => void
  className?: string
}) {
  const supabase = useSupabase()
  const { scope } = useProfile()
  const [ordenes, setOrdenes] = useState<OrdenCompraDistribuidorWithItems[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(initialOrdenId ?? null)
  const [collapsed, setCollapsed] = useState(false)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

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

  const handleConfirmIngreso = useCallback(
    async (ordenId: string) => {
      const orden = ordenes.find(o => o.id === ordenId)
      if (!orden) return
      const items = orden.items_orden_compra_distribuidor ?? []
      if (items.length === 0) return
      setConfirmingId(ordenId)
      try {
        await confirmarLlegadaOrdenCompraDistribuidor(
          supabase,
          ordenId,
          lineasRecepcionCompleta(items)
        )
        await reload()
        onIngresoConfirmado?.()
      } finally {
        setConfirmingId(null)
      }
    },
    [ordenes, supabase, reload, onIngresoConfirmado]
  )

  if (!scope) return null

  const selected = ordenes.find(o => o.id === selectedId)

  if (collapsed) {
    return (
      <div
        className={className ? `${className} proof-canvas-oc-panel` : 'proof-canvas-oc-panel'}
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
        className={className ? `${className} proof-canvas-oc-panel` : 'proof-canvas-oc-panel'}
        style={{
          flexShrink: 0,
          maxHeight: 'min(58vh, 480px)',
          overflowY: 'auto',
          borderBottom: '0.5px solid var(--color-border-tertiary)',
          background: 'var(--color-background-primary)',
        }}
      >
        <OrdenCompraDocumentCard
          ordenId={selectedId}
          accent={accent}
          onClose={() => {
            setSelectedId(null)
            onDismiss?.()
          }}
          onUpdated={() => {
            void reload()
            onIngresoConfirmado?.()
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
      className={className ? `${className} proof-canvas-oc-panel` : 'proof-canvas-oc-panel'}
      style={{
        flexShrink: 0,
        padding: '12px 20px',
        borderBottom: '0.5px solid var(--color-border-tertiary)',
        background: 'var(--color-background-primary)',
      }}
    >
      <div
        className="proof-canvas-oc-panel__header"
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
        className="proof-canvas-oc-panel__grid"
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
            onConfirmIngreso={ordenId => void handleConfirmIngreso(ordenId)}
            confirmingIngreso={confirmingId === o.id}
          />
        ))}
      </div>
    </section>
  )
}
