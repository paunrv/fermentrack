'use client'

export const dynamic = 'force-dynamic'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useProfile } from '@/context/ProfileContext'
import { useProofContextBar } from '@/hooks/useProofContextBar'
import {
  ProofCanvasShell,
  type ProofMessage,
} from '@/components/proof/ProofCanvasShell'
import { ProofOrdenCompraPanel } from '@/components/proof/ProofOrdenCompraPanel'
import { toAgentProfileType } from '@/lib/proof/agent-context-types'
import { profileTypeFromV2 } from '@/lib/proof/canvas-kpi'
import { getProfileTheme } from '@/lib/proof/profile-theme'
import {
  DISTILLER_QUICK_ACTIONS,
  DISTRIBUTOR_MODE_ACTIONS,
  DISTRIBUTOR_BODEGA_LENS_ACTIONS,
  DISTRIBUTOR_COMPRA_LENS_ACTIONS,
  DISTRIBUTOR_VENTA_LENS_ACTIONS,
} from '@/lib/proof/proof-canvas-copy'

export default function DashboardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { scope, activeProfile, loading: profileLoading, reload: reloadProfile } = useProfile()

  const agentProfileType = toAgentProfileType(activeProfile?.profile_type_v2)
  const profileType = profileTypeFromV2(activeProfile?.profile_type_v2)
  const theme = getProfileTheme(activeProfile?.profile_type_v2)
  const accent = theme.accent
  const clerkId = scope?.clerk_id
  const isDistiller = profileType === 'distiller'
  const isDistributor = profileType === 'distributor'

  const [userQuery, setUserQuery] = useState<string | null>(null)
  const [urlQuery, setUrlQuery] = useState<string | null>(null)
  const [ocFromUrl, setOcFromUrl] = useState<string | null>(null)
  const consumedAskRef = useRef<string | null>(null)
  const consumedOcRef = useRef<string | null>(null)
  const [agentConversation, setAgentConversation] = useState<ProofMessage[]>([])
  const [agentRequestId, setAgentRequestId] = useState(0)

  const agentHints = useMemo(
    () => ({
      query: userQuery,
      conversation: agentConversation
        .filter(m => m.role === 'user' || m.role === 'agent')
        .map(m => ({
          role: m.role as 'user' | 'agent',
          content: m.content,
        })),
    }),
    [userQuery, agentConversation]
  )

  const {
    chatResponse,
    displayCards,
    loading: agentLoading,
    error: agentError,
    refreshOcId,
    refreshProfile,
  } = useProofContextBar({
    pantalla: 'inicio',
    vista: agentProfileType === 'distiller' ? 'destilador' : 'distribuidor',
    profileType: agentProfileType,
    hints: agentHints,
    requestId: agentRequestId,
    enabled: Boolean(clerkId) && agentProfileType != null,
    fallback: { mensaje: '' },
  })

  const quickActionsForProfile = isDistiller ? [...DISTILLER_QUICK_ACTIONS] : []
  const modeActionsForProfile = isDistributor ? [...DISTRIBUTOR_MODE_ACTIONS] : []
  const compraLensForProfile = isDistributor ? [...DISTRIBUTOR_COMPRA_LENS_ACTIONS] : []
  const ventaLensForProfile = isDistributor ? [...DISTRIBUTOR_VENTA_LENS_ACTIONS] : []
  const bodegaLensForProfile = isDistributor ? [...DISTRIBUTOR_BODEGA_LENS_ACTIONS] : []

  useEffect(() => {
    const q = searchParams.get('q')?.trim()
    if (!q || consumedAskRef.current === q) return
    consumedAskRef.current = q
    setUrlQuery(q)
    router.replace('/dashboard', { scroll: false })
  }, [searchParams, router])

  useEffect(() => {
    const oc = searchParams.get('oc')?.trim()
    if (!oc || consumedOcRef.current === oc) return
    consumedOcRef.current = oc
    setOcFromUrl(oc)
    router.replace('/dashboard', { scroll: false })
  }, [searchParams, router])

  useEffect(() => {
    if (refreshOcId && isDistributor) {
      setOcFromUrl(refreshOcId)
    }
  }, [refreshOcId, isDistributor])

  useEffect(() => {
    if (!refreshProfile || !isDistributor) return
    void reloadProfile({ silent: true })
  }, [refreshProfile, isDistributor])

  const handleAgentSend = useCallback((message: string, conversation: ProofMessage[]) => {
    setAgentConversation(conversation)
    setUserQuery(message)
    setAgentRequestId(n => n + 1)
  }, [])

  if (profileLoading) {
    return (
      <div
        style={{
          height: '100%',
          background: 'var(--color-background-tertiary)',
          display: 'grid',
          placeItems: 'center',
          color: 'var(--color-text-tertiary)',
          fontSize: 14,
        }}
      >
        Cargando PROOF…
      </div>
    )
  }

  if (!profileType) {
    return (
      <div
        style={{
          height: '100%',
          background: 'var(--color-background-tertiary)',
          padding: 48,
          textAlign: 'center',
          color: 'var(--color-text-tertiary)',
          fontSize: 14,
        }}
      >
        Perfil no compatible con el canvas PROOF.
      </div>
    )
  }

  return (
    <div
      style={{
        height: '100%',
        minHeight: 0,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--color-background-tertiary)',
        color: 'var(--color-text-primary)',
      }}
    >
      <ProofOrdenCompraPanel
        accent={accent}
        initialOrdenId={isDistributor ? ocFromUrl : null}
        onDismiss={() => setOcFromUrl(null)}
        onIngresoConfirmado={() => setAgentRequestId(n => n + 1)}
      />
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <ProofCanvasShell
          accent={accent}
          profileType={profileType}
          chatResponse={userQuery ? chatResponse : undefined}
          displayCards={displayCards}
          loading={agentLoading}
          error={agentError}
          onSend={handleAgentSend}
          quickActions={quickActionsForProfile}
          modeActions={modeActionsForProfile}
          compraLensActions={compraLensForProfile}
          ventaLensActions={ventaLensForProfile}
          bodegaLensActions={bodegaLensForProfile}
          queryFromUrl={urlQuery}
        />
      </div>
    </div>
  )
}
