'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { DisplayCards } from '@/lib/proof/agent-response-types'
import type { ProfileType } from '@/lib/proof/kpi-metrics'
import type {
  ProofHubLensAction,
  ProofModeAction,
  ProofSubHub,
} from '@/lib/proof/proof-canvas-copy'
import {
  PROOF_COPIES,
} from '@/lib/proof/proof-canvas-copy'
import {
  ProofChatThread,
  newProofMessageId,
  type ProofMessage,
  type ProofSuggestedReply,
} from '@/components/proof/ProofChatThread'
import { inferTicketAllocationReplies } from '@/lib/proof/winemaker-ticket-copy'
import { useWinemakerTicketCopy } from '@/hooks/useWinemakerTicketCopy'
import { ProofComposer, focusProofInput, type ProofQuickAction } from '@/components/proof/ProofComposer'
import { ProofResultsZone, focusResultsZone } from '@/components/proof/ProofResultsZone'
import { useCanvasWideLayout } from '@/hooks/useCanvasWideLayout'

export type { ProofMessage }
export type { ProofQuickAction }
export type { ProofModeAction }
export type { ProofHubLensAction }
export type { ProofBodegaLensAction } from '@/lib/proof/proof-canvas-copy'

export type ProofCanvasCopySet = {
  placeholder: string
  welcome: string
  hint: string
  conversationAria?: string
  workspaceAria?: string
  modesAria?: string
  sendAria?: string
  suggestedRepliesAria?: string
  resultsAria?: string
  deleteFailed?: string
  analyzing: readonly string[]
  ticketUploaded?: (fileName: string) => string
  ticketUploadFailed?: string
  ticketFallbackPrompt?: string
  errors: {
    timeout: string
    noResponse: string
    general: string
    emptyResults: string
  }
}

export function ProofCanvasShell({
  accent,
  profileType,
  chatResponse,
  displayCards,
  loading,
  error,
  onSend,
  onTicketFile,
  onDeleteCard,
  quickActions,
  modeActions,
  hubLenses,
  queryFromUrl,
  suggestedReplies,
  canvasCopies,
  hubLensCopy,
}: {
  accent: string
  profileType: ProfileType
  chatResponse?: string
  displayCards?: DisplayCards | null
  loading?: boolean
  error?: string | null
  onSend: (message: string, conversation: ProofMessage[]) => void
  /** Winemaker: archivo de ticket seleccionado (fase OCR posterior) */
  onTicketFile?: (file: File, conversation: ProofMessage[]) => void | Promise<void>
  /** Dev/evaluación: eliminar tarjeta de resultados (winemaker documentos) */
  onDeleteCard?: (itemId: string) => void | Promise<void>
  quickActions?: ProofQuickAction[]
  modeActions?: ProofModeAction[]
  hubLenses?: Partial<Record<ProofSubHub, ProofHubLensAction[]>>
  queryFromUrl?: string | null
  suggestedReplies?: ProofSuggestedReply[] | null
  canvasCopies?: ProofCanvasCopySet
  hubLensCopy?: Partial<
    Record<ProofSubHub, { title: string; aria: string; back: string }>
  >
}) {
  const router = useRouter()
  const ticketCopy = useWinemakerTicketCopy()
  const [messages, setMessages] = useState<ProofMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [activeSubHub, setActiveSubHub] = useState<ProofSubHub | null>(null)
  const pendingSendRef = useRef(0)
  const consumedUrlQueryRef = useRef<string | null>(null)
  const lastQuickActionRef = useRef(false)
  const agentStartedRef = useRef(false)
  const ticketFileRef = useRef<HTMLInputElement>(null)
  const agentLoading = Boolean(loading)
  const wideLayout = useCanvasWideLayout()
  const copies: ProofCanvasCopySet = canvasCopies ?? {
    placeholder: PROOF_COPIES.placeholder,
    welcome: PROOF_COPIES.welcome.distributor,
    hint: PROOF_COPIES.hint.distributor,
    conversationAria: undefined,
    workspaceAria: PROOF_COPIES.workspaceAria,
    analyzing: PROOF_COPIES.analyzing,
    ticketUploaded: PROOF_COPIES.ticketUploaded,
    ticketUploadFailed: PROOF_COPIES.ticketUploadFailed,
    ticketFallbackPrompt: PROOF_COPIES.ticketFallbackPrompt,
    deleteFailed: PROOF_COPIES.deleteFailed,
    errors: PROOF_COPIES.errors,
  }
  const analyzingTexts = [...copies.analyzing]

  const hasUserMessage = messages.some(m => m.role === 'user')
  const showWelcome = !hasUserMessage
  const showHint = !hasUserMessage

  function stripMessageReplies(msgs: ProofMessage[]): ProofMessage[] {
    return msgs.map(m => (m.suggestedReplies ? { ...m, suggestedReplies: undefined } : m))
  }

  function repliesForAgentText(text: string): ProofSuggestedReply[] | undefined {
    if (suggestedReplies?.length) return suggestedReplies
    if (profileType === 'winemaker') {
      return inferTicketAllocationReplies(text, ticketCopy)
    }
    return undefined
  }

  const sendPrompt = useCallback(
    (text: string, fromQuickAction = false) => {
      const trimmed = text.trim()
      if (!trimmed || isTyping) return

      lastQuickActionRef.current = fromQuickAction
      setActiveSubHub(null)
      const userMsg: ProofMessage = {
        id: newProofMessageId(),
        role: 'user',
        content: trimmed,
      }
      const nextConversation = [...stripMessageReplies(messages), userMsg]
      setMessages(nextConversation)
      setInputValue('')
      setIsTyping(true)
      agentStartedRef.current = false
      pendingSendRef.current += 1
      onSend(trimmed, nextConversation)
    },
    [isTyping, messages, onSend]
  )

  const handleLensAction = useCallback(
    (action: ProofHubLensAction, hub: ProofSubHub) => {
      setActiveSubHub(hub)
      if (action.href) {
        router.push(action.href)
        return
      }
      if (action.pickTicketFile) {
        ticketFileRef.current?.click()
        return
      }
      if (action.message.trim()) {
        sendPrompt(action.message, true)
      }
    },
    [router, sendPrompt]
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
          content: copies.errors.general,
        },
      ])
      return
    }

    const text = chatResponse?.trim()
    if (!text || analyzingTexts.includes(text)) {
      setMessages(prev => {
        const last = prev[prev.length - 1]
        if (last?.role === 'agent') return prev
        return [
          ...prev,
          {
            id: newProofMessageId(),
            role: 'system',
            content: copies.errors.noResponse,
          },
        ]
      })
      return
    }

    setMessages(prev => {
      const last = prev[prev.length - 1]
      if (last?.role === 'agent' && last.content === text) return prev
      const replies = repliesForAgentText(text)
      return [
        ...prev,
        {
          id: newProofMessageId(),
          role: 'agent',
          content: text,
          ...(replies?.length ? { suggestedReplies: replies } : {}),
        },
      ]
    })

    if (lastQuickActionRef.current && displayCards) {
      requestAnimationFrame(() => focusResultsZone())
    } else {
      requestAnimationFrame(() => {
        document.querySelector<HTMLInputElement>('.proof-canvas-shell input[type="text"]')?.focus()
      })
    }
    lastQuickActionRef.current = false
  }, [chatResponse, agentLoading, error, displayCards, suggestedReplies, copies.errors.general, copies.errors.noResponse, analyzingTexts])

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
          content: copies.errors.timeout,
        },
      ])
    }, 45_000)
    return () => window.clearTimeout(t)
  }, [isTyping, copies.errors.timeout])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target
      if (!(target instanceof HTMLElement)) return
      const inField =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable

      if (e.key === 'Escape' && activeSubHub) {
        e.preventDefault()
        setActiveSubHub(null)
        return
      }

      if (e.key === '/' && !inField && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault()
        focusProofInput()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [activeSubHub])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    sendPrompt(inputValue, false)
  }

  function handleTicketFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    const userMsg: ProofMessage = {
      id: newProofMessageId(),
      role: 'user',
      content: (copies.ticketUploaded ?? PROOF_COPIES.ticketUploaded)(file.name),
    }
    setActiveSubHub(null)
    const nextConversation = [...stripMessageReplies(messages), userMsg]
    setMessages(nextConversation)
    setIsTyping(true)
    agentStartedRef.current = false
    pendingSendRef.current += 1

    if (onTicketFile) {
      void Promise.resolve(onTicketFile(file, nextConversation)).catch((err: unknown) => {
        pendingSendRef.current = 0
        setIsTyping(false)
        const detail =
          err instanceof Error && err.message.trim()
            ? err.message.trim()
            : (copies.ticketUploadFailed ?? PROOF_COPIES.ticketUploadFailed)
        setMessages(prev => [
          ...prev,
          {
            id: newProofMessageId(),
            role: 'system',
            content: detail,
          },
        ])
      })
    } else {
      onSend(
        copies.ticketFallbackPrompt ?? PROOF_COPIES.ticketFallbackPrompt,
        nextConversation
      )
    }
  }

  const resolvedHubLenses = hubLenses ?? {}

  return (
    <div
      className={`proof-canvas-shell${wideLayout ? ' proof-canvas-shell--wide' : ''}`}
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
      <input
        ref={ticketFileRef}
        type="file"
        accept="image/*,.pdf,application/pdf"
        style={{ display: 'none' }}
        onChange={handleTicketFileChange}
      />

      <div
        className="proof-canvas-workspace"
        aria-label={copies.workspaceAria ?? PROOF_COPIES.workspaceAria}
        style={{
          flex: 1,
          minHeight: 0,
          overflow: 'auto',
          padding: '16px 20px',
        }}
      >
        <ProofResultsZone
          displayCards={displayCards ?? null}
          loading={isTyping}
          wideLayout={wideLayout}
          onAction={prompt => sendPrompt(prompt, false)}
          onDeleteCard={onDeleteCard}
          resultsAria={copies.resultsAria}
          deleteFailed={copies.deleteFailed}
        />
      </div>

      <div className="proof-canvas-conversation">
        <ProofChatThread
          accent={accent}
          profileType={profileType}
          messages={messages}
          isTyping={isTyping}
          showWelcome={showWelcome}
          modeActions={modeActions}
          hubLenses={resolvedHubLenses}
          activeSubHub={activeSubHub}
          wideLayout={wideLayout}
          welcomeText={copies.welcome}
          conversationAria={copies.conversationAria}
          modesAria={copies.modesAria}
          suggestedRepliesAria={copies.suggestedRepliesAria}
          hubLensCopy={hubLensCopy}
          onModeAction={action => {
            setActiveSubHub(null)
            sendPrompt(action.message, true)
          }}
          onSubHubOpen={hub => setActiveSubHub(hub)}
          onSubHubClose={() => setActiveSubHub(null)}
          onHubLensAction={handleLensAction}
          modeActionsDisabled={isTyping}
          onSuggestedReply={msg => sendPrompt(msg, true)}
        />

        <ProofComposer
          accent={accent}
          profileType={profileType}
          inputValue={inputValue}
          onInputChange={setInputValue}
          onSubmit={handleSubmit}
          onQuickAction={msg => sendPrompt(msg, true)}
          quickActions={quickActions ?? []}
          disabled={isTyping}
          showHint={showHint}
          docked={hasUserMessage}
          wideLayout={wideLayout}
          placeholder={copies.placeholder}
          hintText={copies.hint}
          sendAria={copies.sendAria}
        />
      </div>
    </div>
  )
}
