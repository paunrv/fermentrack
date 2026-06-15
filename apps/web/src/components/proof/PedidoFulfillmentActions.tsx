'use client'

import { useState } from 'react'
import { useSupabase } from '@/hooks/useSupabase'
import {
  rpcActualizarEstadoPedido,
  type EstadoPedido,
} from '@/lib/supabase/distribuidor'
import { PedidoEntregaButton } from '@/components/proof/PedidoEntregaButton'

const ENTREGABLE: EstadoPedido[] = ['confirmado', 'preparando', 'en_ruta', 'parcial']

const AVANCE: Partial<
  Record<EstadoPedido, { estado: 'preparando' | 'en_ruta'; label: string }>
> = {
  confirmado: { estado: 'preparando', label: 'Marcar preparando' },
  preparando: { estado: 'en_ruta', label: 'Marcar en ruta' },
  parcial: { estado: 'preparando', label: 'Marcar preparando' },
}

export function PedidoFulfillmentActions({
  pedidoId,
  numero,
  estado,
  accent = '#2D6A4F',
  onUpdated,
  fullWidth = false,
}: {
  pedidoId: string
  numero?: string
  estado: EstadoPedido | string
  accent?: string
  onUpdated?: () => void
  fullWidth?: boolean
}) {
  const supabase = useSupabase()
  const [loading, setLoading] = useState<'preparando' | 'en_ruta' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const avance = AVANCE[estado as EstadoPedido]
  const canEntregar = ENTREGABLE.includes(estado as EstadoPedido)

  async function handleAvance(target: 'preparando' | 'en_ruta') {
    setLoading(target)
    setError(null)
    try {
      await rpcActualizarEstadoPedido(supabase, pedidoId, target)
      onUpdated?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo actualizar el pedido')
    } finally {
      setLoading(null)
    }
  }

  if (!avance && !canEntregar) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {avance ? (
        <button
          type="button"
          disabled={loading != null}
          onClick={() => void handleAvance(avance.estado)}
          style={{
            width: fullWidth ? '100%' : undefined,
            padding: '12px 16px',
            borderRadius: 10,
            border: `1px solid ${accent}`,
            background: 'transparent',
            color: accent,
            fontSize: 13,
            fontWeight: 600,
            cursor: loading ? 'wait' : 'pointer',
          }}
        >
          {loading === avance.estado ? 'Actualizando…' : avance.label}
        </button>
      ) : null}

      {canEntregar ? (
        <PedidoEntregaButton
          pedidoId={pedidoId}
          estado={estado}
          accent={accent}
          fullWidth={fullWidth}
          onEntregado={onUpdated}
        />
      ) : null}

      {error ? (
        <p style={{ margin: 0, fontSize: 12, color: '#E24B4A' }}>
          {numero ? `${numero}: ` : ''}
          {error}
        </p>
      ) : null}
    </div>
  )
}
