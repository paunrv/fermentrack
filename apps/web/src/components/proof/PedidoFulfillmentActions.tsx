'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useSupabase } from '@/hooks/useSupabase'
import {
  rpcActualizarEstadoPedido,
  type EstadoPedido,
} from '@/lib/supabase/distribuidor'
import { PedidoEntregaButton } from '@/components/proof/PedidoEntregaButton'

const ENTREGABLE: EstadoPedido[] = ['confirmado', 'preparando', 'en_ruta', 'parcial']

export function PedidoFulfillmentActions({
  pedidoId,
  numero,
  estado,
  accent = 'var(--proof-accent)',
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
  const t = useTranslations('distributor.pedidos.detail.fulfillment')
  const tCommon = useTranslations('distributor.common')
  const supabase = useSupabase()
  const [loading, setLoading] = useState<'preparando' | 'en_ruta' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const avanceByEstado: Partial<
    Record<EstadoPedido, { estado: 'preparando' | 'en_ruta'; label: string }>
  > = {
    confirmado: { estado: 'preparando', label: t('markPreparing') },
    preparando: { estado: 'en_ruta', label: t('markInRoute') },
    parcial: { estado: 'preparando', label: t('markPreparing') },
  }

  const avance = avanceByEstado[estado as EstadoPedido]
  const canEntregar = ENTREGABLE.includes(estado as EstadoPedido)

  async function handleAvance(target: 'preparando' | 'en_ruta') {
    setLoading(target)
    setError(null)
    try {
      await rpcActualizarEstadoPedido(supabase, pedidoId, target)
      onUpdated?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : tCommon('errorGeneric'))
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
          {loading === avance.estado ? t('updating') : avance.label}
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
        <p style={{ margin: 0, fontSize: 12, color: 'var(--crit)' }}>
          {numero ? `${numero}: ` : ''}
          {error}
        </p>
      ) : null}
    </div>
  )
}
