'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useSupabase } from '@/hooks/useSupabase'
import { generarRemisionPedidoAction } from '@/app/actions/remisiones-distribuidor'
import { rpcEntregarPedido, type EstadoPedido } from '@/lib/supabase/distribuidor'

const ENTREGABLE: EstadoPedido[] = ['confirmado', 'preparando', 'en_ruta', 'parcial']

export function PedidoEntregaButton({
  pedidoId,
  estado,
  accent = 'var(--proof-accent)',
  onEntregado,
  fullWidth = false,
}: {
  pedidoId: string
  estado: EstadoPedido | string
  accent?: string
  onEntregado?: () => void
  fullWidth?: boolean
}) {
  const t = useTranslations('distributor.pedidos.detail.fulfillment')
  const tCommon = useTranslations('distributor.common')
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
      setError(e instanceof Error ? e.message : tCommon('errorGeneric'))
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
          color: 'var(--ink)',
          fontSize: 13,
          fontWeight: 600,
          cursor: loading ? 'wait' : 'pointer',
        }}
      >
        {loading ? t('delivering') : t('markDelivered')}
      </button>
      {error ? (
        <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--crit)' }}>{error}</p>
      ) : null}
    </div>
  )
}
