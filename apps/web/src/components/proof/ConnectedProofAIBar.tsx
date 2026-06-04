'use client'

import { ProofAIBar } from './ProofAIBar'
import { useProfile } from '@/context/ProfileContext'
import { useProofContextBar } from '@/hooks/useProofContextBar'
import {
  toAgentProfileType,
  type AgentContextHints,
  type AgentProfileType,
} from '@/lib/proof/agent-context-types'

export function ConnectedProofAIBar({
  pantalla,
  vista,
  profileType: profileTypeProp,
  hints,
  enabled = true,
  fallback,
  onActionClick,
}: {
  pantalla: string
  vista?: string
  profileType?: AgentProfileType
  hints?: AgentContextHints
  enabled?: boolean
  fallback?: { mensaje: string; accionLabel?: string; accionHref?: string }
  onActionClick?: () => void
}) {
  const { scope, activeProfile } = useProfile()
  const profileType: AgentProfileType | null =
    profileTypeProp ?? toAgentProfileType(activeProfile?.profile_type_v2)

  const { mensaje, accionLabel, accionHref, loading } = useProofContextBar({
    pantalla,
    vista,
    profileType,
    hints,
    enabled: enabled && Boolean(scope?.clerk_id) && profileType != null,
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
