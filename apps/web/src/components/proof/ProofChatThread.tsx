'use client'

import { useCallback, useEffect, useRef } from 'react'
import type { ProfileType } from '@/lib/proof/kpi-metrics'
import { useBreakpoint } from '@/hooks/useBreakpoint'
import type { ProofHubLensAction, ProofModeAction, ProofSubHub } from '@/lib/proof/proof-canvas-copy'
import {
  lensActionsForSubHub,
  subHubForModeAction,
  PROOF_CANVAS_CONTENT_WIDTH,
  PROOF_CANVAS_CONTENT_WIDTH_TABLET,
  PROOF_CHAT_MAX_HEIGHT,
  PROOF_COPIES,
} from '@/lib/proof/proof-canvas-copy'
import { ProofHubLensSelector } from '@/components/proof/ProofHubLensSelector'
import { ProofModeSelector } from '@/components/proof/ProofModeSelector'

export type ProofSuggestedReply = {
  label: string
  message: string
}

export interface ProofMessage {
  id: string
  role: 'user' | 'agent' | 'system'
  content: string
  suggestedReplies?: ProofSuggestedReply[]
}

function newId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function isLastAgentMessage(msg: ProofMessage, messages: ProofMessage[]): boolean {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const row = messages[i]
    if (row?.role === 'agent') return row.id === msg.id
  }
  return false
}

function SuggestedReplies({
  accent,
  replies,
  disabled,
  onSelect,
}: {
  accent: string
  replies: ProofSuggestedReply[]
  disabled?: boolean
  onSelect: (message: string) => void
}) {
  return (
    <div
      role="group"
      aria-label="Respuestas sugeridas"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 10,
      }}
    >
      {replies.map(reply => (
        <button
          key={reply.label}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(reply.message)}
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--color-text-primary)',
            border: `0.5px solid color-mix(in srgb, ${accent} 35%, var(--color-border-tertiary))`,
            borderRadius: 999,
            padding: '8px 14px',
            background: `color-mix(in srgb, ${accent} 8%, var(--color-background-primary))`,
            cursor: disabled ? 'default' : 'pointer',
            fontFamily: 'var(--font-display)',
            opacity: disabled ? 0.55 : 1,
            transition: 'border-color 0.15s ease, background 0.15s ease',
          }}
          onMouseEnter={e => {
            if (disabled) return
            e.currentTarget.style.borderColor = accent
            e.currentTarget.style.background = `color-mix(in srgb, ${accent} 14%, var(--color-background-primary))`
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = `color-mix(in srgb, ${accent} 35%, var(--color-border-tertiary))`
            e.currentTarget.style.background = `color-mix(in srgb, ${accent} 8%, var(--color-background-primary))`
          }}
        >
          {reply.label}
        </button>
      ))}
    </div>
  )
}

function TypingDots({ accent }: { accent: string }) {
  return (
    <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="proof-chat-typing-dot"
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: accent,
            animation: 'proof-chat-typing-bounce 1s ease-in-out infinite',
            animationDelay: `${i * 0.15}s`,
          }}
        />
      ))}
    </span>
  )
}

export function ProofChatThread({
  accent,
  profileType,
  messages,
  isTyping,
  showWelcome,
  modeActions,
  hubLenses,
  activeSubHub,
  onModeAction,
  onHubLensAction,
  onSubHubOpen,
  onSubHubClose,
  modeActionsDisabled,
  onSuggestedReply,
  welcomeText: welcomeTextProp,
  conversationAria,
  hubLensCopy,
  wideLayout,
}: {
  accent: string
  profileType: ProfileType
  messages: ProofMessage[]
  isTyping: boolean
  showWelcome: boolean
  modeActions?: ProofModeAction[]
  hubLenses?: Partial<Record<ProofSubHub, ProofHubLensAction[]>>
  activeSubHub?: ProofSubHub | null
  onModeAction?: (action: ProofModeAction) => void
  onHubLensAction?: (action: ProofHubLensAction, hub: ProofSubHub) => void
  onSubHubOpen?: (hub: ProofSubHub) => void
  onSubHubClose?: () => void
  modeActionsDisabled?: boolean
  onSuggestedReply?: (message: string) => void
  welcomeText?: string
  conversationAria?: string
  wideLayout?: boolean
  hubLensCopy?: Partial<
    Record<ProofSubHub, { title: string; aria: string; back: string }>
  >
}) {
  const chatEndRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const breakpoint = useBreakpoint()

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    })
  }, [])

  useEffect(() => {
    scrollToEnd()
  }, [messages.length, isTyping, scrollToEnd])

  const welcomeKey =
    profileType === 'distiller'
      ? 'distiller'
      : profileType === 'winemaker'
        ? 'winemaker'
        : 'distributor'
  const welcomeText = welcomeTextProp ?? PROOF_COPIES.welcome[welcomeKey]
  const emptyState = showWelcome && messages.length === 0 && !isTyping
  const showModeSelector =
    emptyState && !activeSubHub && (modeActions?.length ?? 0) > 0 && Boolean(onModeAction)
  const hubActions = lensActionsForSubHub(activeSubHub, hubLenses ?? {})
  const showSubHub =
    emptyState &&
    activeSubHub != null &&
    (hubActions?.length ?? 0) > 0 &&
    Boolean(onHubLensAction)
  const hasConversation = !emptyState
  const chatMaxHeight = wideLayout
    ? undefined
    : breakpoint === 'tablet'
      ? 'min(280px, 36vh)'
      : breakpoint === 'mobile'
        ? `min(${PROOF_CHAT_MAX_HEIGHT}px, 40vh)`
        : `min(${PROOF_CHAT_MAX_HEIGHT}px, 42vh)`
  const contentMaxWidth = wideLayout
    ? undefined
    : breakpoint === 'tablet'
      ? PROOF_CANVAS_CONTENT_WIDTH_TABLET
      : PROOF_CANVAS_CONTENT_WIDTH

  return (
    <div
      className="proof-chat-dock"
      style={{
        flexShrink: 0,
        padding: hasConversation ? '0 20px' : '0 20px 4px',
      }}
    >
      <div
        ref={scrollRef}
        className="proof-chat-thread"
        aria-live="polite"
        aria-label={conversationAria ?? 'Conversación con PROOF'}
        style={{
          maxWidth: contentMaxWidth,
          margin: wideLayout ? undefined : '0 auto',
          width: '100%',
          maxHeight: hasConversation ? chatMaxHeight : undefined,
          flex: wideLayout && hasConversation ? 1 : undefined,
          minHeight: wideLayout && hasConversation ? 0 : undefined,
          overflowY: hasConversation ? 'auto' : 'visible',
          overflowX: 'hidden',
          padding: hasConversation ? '12px 14px 10px' : '0',
          display: 'flex',
          flexDirection: 'column',
          background: hasConversation ? 'var(--color-background-primary)' : 'transparent',
          border: hasConversation ? '0.5px solid var(--color-border-tertiary)' : 'none',
          borderBottom: hasConversation ? 'none' : undefined,
          borderRadius: hasConversation ? '10px 10px 0 0' : undefined,
          boxSizing: 'border-box',
        }}
      >
        <style>{`
          @keyframes proof-chat-typing-bounce {
            0%, 80%, 100% { opacity: 0.35; transform: scale(0.85); }
            40% { opacity: 1; transform: scale(1); }
          }
          .proof-chat-thread::-webkit-scrollbar { width: 3px; }
          .proof-chat-thread::-webkit-scrollbar-thumb {
            background: var(--fg-5);
            border-radius: 3px;
          }
        `}</style>

        <div
          className="proof-chat-column"
          style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: showModeSelector || showSubHub ? 20 : 8,
            justifyContent: 'flex-start',
          }}
        >
        {emptyState ? (
          <>
            <p
              className="proof-chat-welcome"
              style={{
                margin: 0,
                fontSize: 15,
                lineHeight: 1.6,
                fontWeight: 400,
                color: 'var(--color-text-primary)',
                fontFamily: 'var(--font-display)',
                textAlign: 'center',
              }}
            >
              {welcomeText}
            </p>
            {showModeSelector ? (
              <ProofModeSelector
                accent={accent}
                actions={modeActions!}
                disabled={modeActionsDisabled}
                activeSubHub={activeSubHub}
                onSelect={action => {
                  const hub = subHubForModeAction(action)
                  if (hub) {
                    onSubHubOpen?.(hub)
                    return
                  }
                  onModeAction?.(action)
                }}
              />
            ) : null}
            {showSubHub && activeSubHub ? (
              <ProofHubLensSelector
                accent={accent}
                hub={activeSubHub}
                actions={hubActions!}
                disabled={modeActionsDisabled}
                onSelect={action => onHubLensAction?.(action, activeSubHub)}
                onBack={onSubHubClose}
                hubCopy={hubLensCopy?.[activeSubHub]}
              />
            ) : null}
          </>
        ) : null}

        {messages.map(msg => {
          if (msg.role === 'user') {
            return (
              <div
                key={msg.id}
                style={{
                  alignSelf: 'flex-end',
                  maxWidth: '80%',
                  padding: '10px 14px',
                  borderRadius: 10,
                  background: `color-mix(in srgb, ${accent} 10%, var(--color-background-info))`,
                  fontSize: 14,
                  lineHeight: 1.6,
                  fontWeight: 400,
                  color: 'var(--color-text-primary)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {msg.content}
              </div>
            )
          }

          const isSystem = msg.role === 'system'
          const showReplies =
            !isSystem &&
            !isTyping &&
            Boolean(onSuggestedReply) &&
            (msg.suggestedReplies?.length ?? 0) > 0 &&
            isLastAgentMessage(msg, messages)

          return (
            <div
              key={msg.id}
              style={{
                alignSelf: 'flex-start',
                maxWidth: '100%',
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: isSystem ? 14 : 15,
                  lineHeight: 1.6,
                  fontWeight: 400,
                  color: isSystem ? 'var(--color-text-tertiary)' : 'var(--color-text-primary)',
                  fontFamily: 'var(--font-display)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {msg.content}
              </p>
              {showReplies ? (
                <SuggestedReplies
                  accent={accent}
                  replies={msg.suggestedReplies!}
                  disabled={modeActionsDisabled}
                  onSelect={onSuggestedReply!}
                />
              ) : null}
            </div>
          )
        })}

        {isTyping ? (
          <div style={{ alignSelf: 'flex-start' }}>
            <TypingDots accent={accent} />
          </div>
        ) : null}

          <div ref={chatEndRef} style={{ height: 0 }} aria-hidden />
        </div>
      </div>
    </div>
  )
}

export { newId as newProofMessageId }
