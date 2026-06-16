'use client'

import { useCallback, useEffect, useRef } from 'react'
import type { ProfileType } from '@/lib/proof/kpi-metrics'
import type { ProofHubLensAction, ProofModeAction, ProofSubHub } from '@/lib/proof/proof-canvas-copy'
import { PROOF_CANVAS_CONTENT_WIDTH, PROOF_COPIES } from '@/lib/proof/proof-canvas-copy'
import { ProofHubLensSelector } from '@/components/proof/ProofHubLensSelector'
import { ProofModeSelector } from '@/components/proof/ProofModeSelector'

export interface ProofMessage {
  id: string
  role: 'user' | 'agent' | 'system'
  content: string
}

function newId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`
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
  compraLensActions,
  ventaLensActions,
  bodegaLensActions,
  activeSubHub,
  onModeAction,
  onHubLensAction,
  onCompraHubOpen,
  onVentaHubOpen,
  onBodegaHubOpen,
  onSubHubClose,
  modeActionsDisabled,
}: {
  accent: string
  profileType: ProfileType
  messages: ProofMessage[]
  isTyping: boolean
  showWelcome: boolean
  modeActions?: ProofModeAction[]
  compraLensActions?: ProofHubLensAction[]
  ventaLensActions?: ProofHubLensAction[]
  bodegaLensActions?: ProofHubLensAction[]
  activeSubHub?: ProofSubHub | null
  onModeAction?: (action: ProofModeAction) => void
  onHubLensAction?: (message: string, hub: ProofSubHub) => void
  onCompraHubOpen?: () => void
  onVentaHubOpen?: () => void
  onBodegaHubOpen?: () => void
  onSubHubClose?: () => void
  modeActionsDisabled?: boolean
}) {
  const chatEndRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    })
  }, [])

  useEffect(() => {
    scrollToEnd()
  }, [messages.length, isTyping, scrollToEnd])

  const welcomeKey = profileType === 'distiller' ? 'distiller' : 'distributor'
  const welcomeText = PROOF_COPIES.welcome[welcomeKey]
  const emptyState = showWelcome && messages.length === 0 && !isTyping
  const showModeSelector =
    emptyState && !activeSubHub && (modeActions?.length ?? 0) > 0 && Boolean(onModeAction)
  const hubActions =
    activeSubHub === 'compra'
      ? compraLensActions
      : activeSubHub === 'venta'
        ? ventaLensActions
        : activeSubHub === 'bodega'
          ? bodegaLensActions
          : undefined
  const showSubHub =
    emptyState &&
    activeSubHub != null &&
    (hubActions?.length ?? 0) > 0 &&
    Boolean(onHubLensAction)

  return (
    <div
      ref={scrollRef}
      className="proof-chat-thread"
      aria-live="polite"
      aria-label="Conversación con PROOF"
      style={{
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: '12px 20px 8px',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--color-background-tertiary)',
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
          maxWidth: PROOF_CANVAS_CONTENT_WIDTH,
          margin: '0 auto',
          width: '100%',
          flex: emptyState ? 1 : undefined,
          display: 'flex',
          flexDirection: 'column',
          gap: showModeSelector || showSubHub ? 20 : 8,
          justifyContent: emptyState ? 'flex-end' : 'flex-start',
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
                  if (action.compraHub) {
                    onCompraHubOpen?.()
                    return
                  }
                  if (action.ventaHub) {
                    onVentaHubOpen?.()
                    return
                  }
                  if (action.bodegaHub) {
                    onBodegaHubOpen?.()
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
                onSelect={msg => onHubLensAction?.(msg, activeSubHub)}
                onBack={onSubHubClose}
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
          return (
            <p
              key={msg.id}
              style={{
                margin: 0,
                alignSelf: 'flex-start',
                maxWidth: '100%',
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
  )
}

export { newId as newProofMessageId }
