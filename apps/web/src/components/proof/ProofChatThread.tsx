'use client'

import { useCallback, useEffect, useRef } from 'react'
import type { ProfileType } from '@/lib/proof/kpi-metrics'
import { PROOF_COPIES } from '@/lib/proof/proof-canvas-copy'

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
}: {
  accent: string
  profileType: ProfileType
  messages: ProofMessage[]
  isTyping: boolean
  showWelcome: boolean
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
        padding: '16px 20px 8px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
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

      {showWelcome && messages.length === 0 && !isTyping ? (
        <p
          style={{
            margin: 0,
            fontSize: 15,
            lineHeight: 1.6,
            fontWeight: 400,
            color: 'var(--color-text-primary)',
            fontFamily: 'var(--font-display)',
            maxWidth: '85%',
          }}
        >
          {welcomeText}
        </p>
      ) : null}

      {messages.map(msg => {
        if (msg.role === 'user') {
          return (
            <div
              key={msg.id}
              style={{
                alignSelf: 'flex-end',
                maxWidth: '75%',
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
              maxWidth: '85%',
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
  )
}

export { newId as newProofMessageId }
