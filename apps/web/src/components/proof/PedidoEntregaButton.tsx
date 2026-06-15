'use client'

import { useState } from 'react'
import { useSupabase } from '@/hooks/useSupabase'
import { generarRemisionPedidoAction } from '@/app/actions/remisiones-distribuidor'
import { rpcEntregarPedido, type EstadoPedido } from '@/lib/supabase/distribuidor'

const ENTREGABLE: EstadoPedido[] = ['confirmado', 'preparando', 'en_ruta', 'parcial']

export function PedidoEntregaButton({
  pedidoId,
  estado,
  accent = '#2D6A4F',
  onEntregado,
  fullWidth = false,
}: {
  pedidoId: string
  estado: EstadoPedido | string
  accent?: string
  onEntregado?: () => void
  fullWidth?: boolean
}) {
  const supabase = useSupabase()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!ENTREGABLE.includes(estado as EstadoPedido)) return null

  async function handleEntregar() {
    setLoading(true)
    setError(null)
    try {
      await rpcEntregarPedido(supabase, pedidoId, false)
      try {
        await generarRemisionPedidoAction(pedidoId)
      } catch {
        /* remisión opcional — pedido ya entregado */
      }
      onEntregado?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo marcar como entregado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={fullWidth ? { width: '100%' } : undefined}>
      <button
        type="button"
        disabled={loading}
        onClick={() => void handleEntregar()}
        style={{
          width: fullWidth ? '100%' : undefined,
          flex: fullWidth ? undefined : '1 1 140px',
          padding: '12px 16px',
          borderRadius: 10,
          border: 'none',
          background: accent,
          color: '#fff',
          fontSize: 13,
          fontWeight: 600,
          cursor: loading ? 'wait' : 'pointer',
        }}
      >
        {loading ? 'Entregando…' : 'Marcar entregado'}
      </button>
      {error ? (
        <p style={{ margin: '8px 0 0', fontSize: 12, color: '#E24B4A' }}>{error}</p>
      ) : null}
    </div>
  )
}
