'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { DisplayCards } from '@/lib/proof/agent-response-types'
import type { ProfileType } from '@/lib/proof/kpi-metrics'
import type { ProofHubLensAction, ProofModeAction, ProofSubHub } from '@/lib/proof/proof-canvas-copy'
import { PROOF_COPIES } from '@/lib/proof/proof-canvas-copy'
import {
  ProofChatThread,
  newProofMessageId,
  type ProofMessage,
} from '@/components/proof/ProofChatThread'
import { ProofComposer, type ProofQuickAction } from '@/components/proof/ProofComposer'
import { ProofResultsZone, focusResultsZone } from '@/components/proof/ProofResultsZone'

export type { ProofMessage }
export type { ProofQuickAction }
export type { ProofModeAction }
export type { ProofHubLensAction }
export type { ProofBodegaLensAction } from '@/lib/proof/proof-canvas-copy'

const ANALYZING = ['PROOF analizando…', 'PROOF analizando tu operación…']

export function ProofCanvasShell({
  accent,
  profileType,
  chatResponse,
  displayCards,
  loading,
  error,
  onSend,
  quickActions,
  modeActions,
  compraLensActions,
  ventaLensActions,
  bodegaLensActions,
  queryFromUrl,
}: {
  accent: string
  profileType: ProfileType
  chatResponse?: string
  displayCards?: DisplayCards | null
  loading?: boolean
  error?: string | null
  onSend: (message: string, conversation: ProofMessage[]) => void
  quickActions?: ProofQuickAction[]
  modeActions?: ProofModeAction[]
  compraLensActions?: ProofHubLensAction[]
  ventaLensActions?: ProofHubLensAction[]
  bodegaLensActions?: ProofHubLensAction[]
  queryFromUrl?: string | null
}) {
  const [messages, setMessages] = useState<ProofMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [activeSubHub, setActiveSubHub] = useState<ProofSubHub | null>(null)
  const pendingSendRef = useRef(0)
  const consumedUrlQueryRef = useRef<string | null>(null)
  const lastQuickActionRef = useRef(false)
  const agentStartedRef = useRef(false)
  const agentLoading = Boolean(loading)

  const hasUserMessage = messages.some(m => m.role === 'user')
  const showWelcome = !hasUserMessage
  const showHint = !hasUserMessage

  const sendPrompt = useCallback(
    (text: string, fromQuickAction = false) => {
      const trimmed = text.trim()
      if (!trimmed || isTyping) return

      lastQuickActionRef.current = fromQuickAction
      const userMsg: ProofMessage = {
        id: newProofMessageId(),
        role: 'user',
        content: trimmed,
      }
      const nextConversation = [...messages, userMsg]
      setMessages(nextConversation)
      setInputValue('')
      setIsTyping(true)
      agentStartedRef.current = false
      pendingSendRef.current += 1
      onSend(trimmed, nextConversation)
    },
    [isTyping, messages, onSend]
  )

  useEffect(() => {
    const q = queryFromUrl?.trim()
    if (!q || consumedUrlQueryRef.current === q) return
    consumedUrlQueryRef.current = q
    sendPrompt(q, false)
  }, [queryFromUrl, sendPrompt])

  useEffect(() => {
    if (pendingSendRef.current === 0) return

    if (agentLoading) {
      agentStartedRef.current = true
      setIsTyping(true)
      return
    }

    // El hook aún no arrancó el fetch — no marcar como fallido todavía
    if (!agentStartedRef.current) {
      setIsTyping(true)
      return
    }

    agentStartedRef.current = false
    pendingSendRef.current = 0
    setIsTyping(false)

    if (error) {
      setMessages(prev => [
        ...prev,
        {
          id: newProofMessageId(),
          role: 'system',
          content: PROOF_COPIES.errors.general,
        },
      ])
      return
    }

    const text = chatResponse?.trim()
    if (!text || ANALYZING.includes(text)) {
      setMessages(prev => {
        const last = prev[prev.length - 1]
        if (last?.role === 'agent') return prev
        return [
          ...prev,
          {
            id: newProofMessageId(),
            role: 'system',
            content: PROOF_COPIES.errors.noResponse,
          },
        ]
      })
      return
    }

    setMessages(prev => {
      const last = prev[prev.length - 1]
      if (last?.role === 'agent' && last.content === text) return prev
      return [...prev, { id: newProofMessageId(), role: 'agent', content: text }]
    })

    if (lastQuickActionRef.current && displayCards) {
      requestAnimationFrame(() => focusResultsZone())
    } else {
      requestAnimationFrame(() => {
        document.querySelector<HTMLInputElement>('.proof-canvas-shell input[type="text"]')?.focus()
      })
    }
    lastQuickActionRef.current = false
  }, [chatResponse, agentLoading, error, displayCards])

  useEffect(() => {
    if (!isTyping || pendingSendRef.current === 0) return
    const t = window.setTimeout(() => {
      if (pendingSendRef.current === 0) return
      pendingSendRef.current = 0
      setIsTyping(false)
      setMessages(prev => [
        ...prev,
        {
          id: newProofMessageId(),
          role: 'system',
          content: PROOF_COPIES.errors.timeout,
        },
      ])
    }, 45_000)
    return () => window.clearTimeout(t)
  }, [isTyping])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    sendPrompt(inputValue, false)
  }

  return (
    <div
      className="proof-canvas-shell"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        overflow: 'hidden',
        background: 'var(--color-background-tertiary)',
        '--proof-accent': accent,
      } as React.CSSProperties}
    >
      <ProofChatThread
        accent={accent}
        profileType={profileType}
        messages={messages}
        isTyping={isTyping}
        showWelcome={showWelcome}
        modeActions={modeActions}
        compraLensActions={compraLensActions}
        ventaLensActions={ventaLensActions}
        bodegaLensActions={bodegaLensActions}
        activeSubHub={activeSubHub}
        onModeAction={action => {
          setActiveSubHub(null)
          sendPrompt(action.message, true)
        }}
        onCompraHubOpen={() => setActiveSubHub('compra')}
        onVentaHubOpen={() => setActiveSubHub('venta')}
        onBodegaHubOpen={() => setActiveSubHub('bodega')}
        onSubHubClose={() => setActiveSubHub(null)}
        onHubLensAction={(msg, hub) => {
          setActiveSubHub(hub)
          sendPrompt(msg, true)
        }}
        modeActionsDisabled={isTyping}
      />

      <ProofResultsZone
        displayCards={displayCards ?? null}
        loading={isTyping}
        onAction={prompt => sendPrompt(prompt, false)}
      />

      <ProofComposer
        accent={accent}
        profileType={profileType}
        inputValue={inputValue}
        onInputChange={setInputValue}
        onSubmit={handleSubmit}
        onQuickAction={msg => sendPrompt(msg, true)}
        compraLensActions={compraLensActions}
        ventaLensActions={ventaLensActions}
        bodegaLensActions={bodegaLensActions}
        activeSubHub={activeSubHub}
        onHubLensAction={(msg, hub) => {
          setActiveSubHub(hub)
          sendPrompt(msg, true)
        }}
        quickActions={quickActions ?? []}
        disabled={isTyping}
        showHint={showHint}
      />
    </div>
  )
}
