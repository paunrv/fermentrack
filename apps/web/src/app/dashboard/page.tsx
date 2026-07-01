'use client'

export const dynamic = 'force-dynamic'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useProfile } from '@/context/ProfileContext'
import { useWinemakerAccess } from '@/hooks/useWinemakerAccess'
import { useDistributorCanvasCopy } from '@/hooks/useDistributorCanvasCopy'
import { useWinemakerCanvasCopy } from '@/hooks/useWinemakerCanvasCopy'
import { useCanvasWideLayout } from '@/hooks/useCanvasWideLayout'
import { useProofContextBar } from '@/hooks/useProofContextBar'
import {
  ProofCanvasShell,
  type ProofMessage,
} from '@/components/proof/ProofCanvasShell'
import { ProofOrdenCompraPanel } from '@/components/proof/ProofOrdenCompraPanel'
import { WinemakerMobileHome } from '@/components/proof/WinemakerMobileHome'
import { fetchTeamAccess } from '@/app/actions/equipo'
import { toAgentProfileType } from '@/lib/proof/agent-context-types'
import { profileTypeFromV2 } from '@/lib/proof/canvas-kpi'
import { getProfileTheme } from '@/lib/proof/profile-theme'
import type { ProofSubHub, ProofHubLensAction } from '@/lib/proof/proof-canvas-copy'
import { DISTILLER_QUICK_ACTIONS } from '@/lib/proof/proof-canvas-copy'

export default function DashboardPage() {
  const tHome = useTranslations('distributor.home')
  const distributorCanvas = useDistributorCanvasCopy()
  const winemakerCanvas = useWinemakerCanvasCopy()
  const wideLayout = useCanvasWideLayout()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { scope, activeProfile, reload: reloadProfile } = useProfile()
  const {
    isWinemaker,
    effectiveProfileType,
    userId,
    activeOrg,
    canWrite,
    loading: winemakerAccessLoading,
  } = useWinemakerAccess()

  const agentProfileType = toAgentProfileType(effectiveProfileType ?? undefined)
  const profileType = profileTypeFromV2(effectiveProfileType ?? undefined)
  const theme = getProfileTheme(effectiveProfileType ?? undefined)
  const accent = theme.accent
  const isDistiller = profileType === 'distiller'
  const isDistributor = profileType === 'distributor'

  const [userQuery, setUserQuery] = useState<string | null>(null)
  const [urlQuery, setUrlQuery] = useState<string | null>(null)
  const [ocFromUrl, setOcFromUrl] = useState<string | null>(null)
  const consumedAskRef = useRef<string | null>(null)
  const consumedOcRef = useRef<string | null>(null)
  const [agentConversation, setAgentConversation] = useState<ProofMessage[]>([])
  const [agentRequestId, setAgentRequestId] = useState(0)
  const [winemakerPantalla, setWinemakerPantalla] = useState<Record<string, unknown> | null>(
    null
  )
  const [isWinemakerOwner, setIsWinemakerOwner] = useState<boolean | null>(null)

  const agentHints = useMemo(
    () => ({
      query: userQuery,
      conversation: agentConversation
        .filter(m => m.role === 'user' || m.role === 'agent')
        .map(m => ({
          role: m.role as 'user' | 'agent',
          content: m.content,
        })),
      ...(winemakerPantalla ? { pantalla: winemakerPantalla } : {}),
      ...(activeOrg?.id ? { organizationId: activeOrg.id } : {}),
    }),
    [userQuery, agentConversation, winemakerPantalla, activeOrg?.id]
  )

  const {
    chatResponse,
    displayCards,
    dismissDisplayCard,
    loading: agentLoading,
    error: agentError,
    refreshOcId,
    refreshProfile,
    suggestedReplies,
  } = useProofContextBar({
    pantalla: 'inicio',
    vista:
      agentProfileType === 'distiller'
        ? 'destilador'
        : agentProfileType === 'winemaker'
          ? 'winemaker'
          : 'distribuidor',
    profileType: agentProfileType,
    hints: agentHints,
    requestId: agentRequestId,
    enabled: Boolean(userId) && agentProfileType != null,
    fallback: { mensaje: '' },
  })

  const quickActionsForProfile = isDistiller
    ? [...DISTILLER_QUICK_ACTIONS]
    : isWinemaker
      ? winemakerCanvas.quickActions
      : []
  const modeActionsForProfile = isDistributor
    ? distributorCanvas.modeActions
    : isWinemaker
      ? winemakerCanvas.modeActions
      : []

  const hubLensesForProfile: Partial<Record<ProofSubHub, ProofHubLensAction[]>> =
    isDistributor
      ? distributorCanvas.hubLenses
      : isWinemaker
        ? winemakerCanvas.hubLenses
        : {}

  const canvasCopiesForProfile = isDistributor
    ? distributorCanvas.copies
    : isWinemaker
      ? winemakerCanvas.copies
      : undefined

  const hubLensCopyForProfile = isWinemaker ? winemakerCanvas.hubLensCopy : undefined

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

  useEffect(() => {
    if (winemakerAccessLoading || !isWinemaker || !activeOrg?.id) {
      setIsWinemakerOwner(null)
      return
    }
    let cancelled = false
    void fetchTeamAccess(activeOrg.id).then(access => {
      if (!cancelled) setIsWinemakerOwner(access.isOwner)
    })
    return () => {
      cancelled = true
    }
  }, [winemakerAccessLoading, isWinemaker, activeOrg?.id])

  const handleAgentSend = useCallback((message: string, conversation: ProofMessage[]) => {
    setAgentConversation(conversation)
    setUserQuery(message)
    setAgentRequestId(n => n + 1)
  }, [])

  const handleTicketFile = useCallback(
    async (file: File, conversation: ProofMessage[]) => {
      setAgentConversation(conversation)
      const form = new FormData()
      form.append('file', file)
      if (activeOrg?.id) form.append('organizationId', activeOrg.id)

      const res = await fetch('/api/winemaker/documentos', {
        method: 'POST',
        credentials: 'same-origin',
        body: form,
      })

      const body = (await res.json().catch(() => ({}))) as {
        error?: string
        documentId?: string
        agentQuery?: string
        mensaje?: string
      }

      if (!res.ok) {
        throw new Error(body.error || tHome('ticketSaveError'))
      }

      setWinemakerPantalla({
        hub: 'wm_ticket',
        documentId: body.documentId,
      })
      setUserQuery(body.agentQuery ?? `Ticket guardado: ${file.name}`)
      setAgentRequestId(n => n + 1)
    },
    [activeOrg?.id, tHome]
  )

  const handleDeleteCard = useCallback(
    async (itemId: string) => {
      if (!canWrite) {
        throw new Error(tHome('readOnly'))
      }
      const res = await fetch(`/api/winemaker/documentos/${itemId}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      })
      const body = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        throw new Error(body.error || tHome('deleteError'))
      }
      dismissDisplayCard(itemId)
      setWinemakerPantalla(prev =>
        prev && prev.documentId === itemId ? null : prev
      )
    },
    [dismissDisplayCard, canWrite, tHome]
  )

  if (winemakerAccessLoading) {
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
        {tHome('loading')}
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
        {tHome('incompatibleProfile')}
      </div>
    )
  }

  if (isWinemaker) {
    if (isWinemakerOwner === null) {
      return (
        <div
          style={{
            height: '100%',
            background: 'var(--canvas)',
            display: 'grid',
            placeItems: 'center',
            color: 'var(--fg-3)',
            fontSize: 14,
          }}
        >
          {tHome('loading')}
        </div>
      )
    }

    if (isWinemakerOwner) {
      return (
        <div style={{ height: '100%', minHeight: 0, overflow: 'hidden' }}>
          <WinemakerMobileHome />
        </div>
      )
    }
  }

  return (
    <div
      className={`proof-canvas-page${wideLayout ? ' proof-canvas-page--wide' : ''}`}
      style={{
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
          canvasCopies={canvasCopiesForProfile}
          hubLensCopy={hubLensCopyForProfile}
          accent={accent}
          profileType={profileType}
          chatResponse={userQuery ? chatResponse : undefined}
          displayCards={displayCards}
          loading={agentLoading}
          error={agentError}
          onSend={handleAgentSend}
          onTicketFile={isWinemaker && canWrite ? handleTicketFile : undefined}
          onDeleteCard={isWinemaker && canWrite ? handleDeleteCard : undefined}
          quickActions={quickActionsForProfile}
          modeActions={modeActionsForProfile}
          hubLenses={hubLensesForProfile}
          queryFromUrl={urlQuery}
          suggestedReplies={suggestedReplies}
        />
      </div>
    </div>
  )
}
