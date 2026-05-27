'use client'

import { ProofAIBar } from './ProofAIBar'
import { useProofContextBar } from '@/hooks/useProofContextBar'

export function ConnectedProofAIBar({
  pantalla,
  vista,
  contexto,
  enabled = true,
  fallback,
  onActionClick,
}: {
  pantalla: string
  vista?: string
  contexto?: Record<string, unknown>
  enabled?: boolean
  fallback?: { mensaje: string; accionLabel?: string; accionHref?: string }
  onActionClick?: () => void
}) {
  const { mensaje, accionLabel, accionHref, loading } = useProofContextBar({
    pantalla,
    vista,
    contexto,
    enabled,
    fallback,
  })

  return (
    <ProofAIBar
      message={loading && !mensaje ? 'PROOF analizando tu operación…' : mensaje || fallback?.mensaje || '…'}
      actionLabel={accionLabel}
      actionHref={onActionClick ? undefined : accionHref}
      onActionClick={onActionClick}
    />
  )
}
