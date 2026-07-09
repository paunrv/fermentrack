'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import type { AppLocale } from '@/i18n/routing'

export type AgentQuickAction = {
  label: string
  message: string
  /** Navegación directa (chip como enlace) */
  href?: string
}

export interface Message {
  id: string
  role: 'user' | 'agent'
  content: string
  timestamp: Date
}

const chipStyle: React.CSSProperties = {
  fontSize: 11,
  color: 'var(--fg-3)',
  border: '0.5px solid var(--line)',
  borderRadius: 20,
  padding: '5px 14px',
  background: 'var(--surface-card)',
  cursor: 'pointer',
  textDecoration: 'none',
  display: 'inline-block',
  transition: 'color 0.15s ease, border-color 0.15s ease',
}

function formatTime(d: Date, locale: AppLocale) {
  return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false })
}

function newId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function TypingDots() {
  return (
    <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center', padding: '2px 0' }}>
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="proof-agent-typing-dot"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  )
}

export function AgentBar({
  accent,
  onSend,
  response,
  isLoading,
  quickActions = [],
  queryFromUrl,
}: {
  accent: string
  onSend: (message: string, conversation: Message[], image?: string | null) => void
  response?: string
  /** Respuesta en curso (si no se pasa, se infiere de response) */
  isLoading?: boolean
  quickActions?: AgentQuickAction[]
  /** Pregunta inyectada desde ?q= en la URL (layout → dashboard) */
  queryFromUrl?: string | null
}) {
  const t = useTranslations('agent.bar')
  const locale = useLocale() as AppLocale
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [pendingImage, setPendingImage] = useState<string | null>(null)
  const pendingSendRef = useRef(0)
  const consumedUrlQueryRef = useRef<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const chatScrollRef = useRef<HTMLDivElement>(null)

  const hasMessages = messages.length > 0 || isTyping
  const exchangeCount = messages.filter(m => m.role === 'agent').length
  const chatScrollable = exchangeCount >= 2
  const loading = Boolean(isLoading)

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    })
  }, [])

  useEffect(() => {
    const q = queryFromUrl?.trim()
    if (!q || consumedUrlQueryRef.current === q) return
    consumedUrlQueryRef.current = q
    console.log('[agente] AgentBar query desde URL', q)

    const userMsg: Message = {
      id: newId(),
      role: 'user',
      content: q,
      timestamp: new Date(),
    }
    setMessages([userMsg])
    setIsTyping(true)
    pendingSendRef.current += 1
    onSend(q, [userMsg], null)
  }, [queryFromUrl, onSend])

  useEffect(() => {
    if (pendingSendRef.current === 0) return
    if (loading) {
      setIsTyping(true)
      return
    }

    pendingSendRef.current = 0
    setIsTyping(false)

    const text = response?.trim()
    if (
      !text ||
      text === t('analyzing') ||
      text === t('analyzingLong')
    ) {
      setMessages(prev => {
        const last = prev[prev.length - 1]
        if (last?.role === 'agent') return prev
        return [
          ...prev,
          {
            id: newId(),
            role: 'agent',
            content: t('noResponse'),
            timestamp: new Date(),
          },
        ]
      })
      scrollToEnd()
      return
    }

    setMessages(prev => {
      const last = prev[prev.length - 1]
      if (last?.role === 'agent' && last.content === text) return prev
      return [...prev, { id: newId(), role: 'agent', content: text, timestamp: new Date() }]
    })
    scrollToEnd()
  }, [response, loading, scrollToEnd, t])

  useEffect(() => {
    if (!isTyping || pendingSendRef.current === 0) return
    const timer = window.setTimeout(() => {
      if (pendingSendRef.current === 0) return
      pendingSendRef.current = 0
      setIsTyping(false)
      setMessages(prev => [
        ...prev,
        {
          id: newId(),
          role: 'agent',
          content: t('timeout'),
          timestamp: new Date(),
        },
      ])
    }, 45_000)
    return () => window.clearTimeout(timer)
  }, [isTyping, t])

  useEffect(() => {
    if (hasMessages) scrollToEnd()
  }, [messages.length, isTyping, hasMessages, scrollToEnd])

  function handleImageFile(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      setPendingImage(result.split(',')[1] ?? null)
    }
    reader.readAsDataURL(file)
  }

  function submitText(text: string) {
    const trimmed = text.trim()
    if ((!trimmed && !pendingImage) || isTyping) return

    const content = trimmed || t('imageAttached')
    const userMsg: Message = {
      id: newId(),
      role: 'user',
      content,
      timestamp: new Date(),
    }
    const nextConversation = [...messages, userMsg]

    setMessages(nextConversation)
    setInputValue('')
    setIsTyping(true)
    pendingSendRef.current += 1
    onSend(trimmed || t('imagePrompt'), nextConversation, pendingImage)
    setPendingImage(null)
    scrollToEnd()
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    submitText(inputValue)
  }

  return (
    <section
      className="proof-agent-bar"
      style={
        {
          '--proof-accent': accent,
          width: '100%',
          maxWidth: 560,
          margin: '0 auto',
          padding: '32px 24px 24px',
          background: 'var(--ink)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          gap: 12,
          boxSizing: 'border-box',
        } as React.CSSProperties
      }
    >
      <style>{`
        @keyframes proof-agent-fadeUp {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes proof-agent-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes proof-agent-typing-bounce {
          0%, 80%, 100% { opacity: 0.35; transform: scale(0.85); }
          40% { opacity: 1; transform: scale(1); }
        }
        .proof-agent-bar .proof-agent-chat::-webkit-scrollbar {
          width: 3px;
        }
        .proof-agent-bar .proof-agent-chat::-webkit-scrollbar-thumb {
          background: #E0E0D8;
          border-radius: 3px;
        }
        .proof-agent-bar .proof-agent-chat {
          scrollbar-width: thin;
          scrollbar-color: #E0E0D8 transparent;
        }
        .proof-agent-typing-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--proof-accent);
          animation: proof-agent-typing-bounce 1s ease-in-out infinite;
        }
        .proof-agent-msg-enter {
          animation: proof-agent-fadeUp 0.18s ease;
        }
        .proof-agent-send:not(:disabled):hover {
          background: var(--proof-accent) !important;
        }
      `}</style>

      <div
        className="proof-agent-stack"
        style={{ display: 'flex', flexDirection: 'column', width: '100%' }}
      >
        <div
          ref={chatScrollRef}
          className="proof-agent-chat"
          aria-live="polite"
          aria-label={t('conversationAria')}
          style={{
            maxHeight: hasMessages ? 260 : 0,
            overflowY: chatScrollable ? 'auto' : 'hidden',
            overflowX: 'hidden',
            transition: 'max-height 0.25s ease',
            background: 'var(--surface-card)',
            border: hasMessages ? '0.5px solid var(--hairline)' : 'none',
            borderBottom: 'none',
            borderRadius: hasMessages ? '16px 16px 0 0' : 0,
            padding: hasMessages ? '12px 14px 10px' : 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            gap: 10,
            boxSizing: 'border-box',
          }}
        >
          {messages.map(msg => (
            <div
              key={msg.id}
              className="proof-agent-msg-enter"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '88%',
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              <div
                style={{
                  padding: '8px 12px',
                  fontSize: msg.role === 'agent' ? 11 : 13,
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  ...(msg.role === 'user'
                    ? {
                        background: 'var(--proof-accent)',
                        color: 'var(--ink)',
                        borderRadius: '10px 10px 2px 10px',
                      }
                    : {
                        background: 'var(--ink)',
                        color: 'var(--fg-0)',
                        fontFamily:
                          'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                        borderRadius: '10px 10px 10px 2px',
                      }),
                }}
              >
                {msg.content}
              </div>
              <span
                style={{
                  marginTop: 4,
                  fontSize: 9,
                  color: 'var(--fg-3)',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                }}
              >
                {formatTime(msg.timestamp, locale)}
              </span>
            </div>
          ))}

          {isTyping ? (
            <div
              className="proof-agent-msg-enter"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                maxWidth: '88%',
                alignSelf: 'flex-start',
              }}
            >
              <div
                style={{
                  padding: '10px 14px',
                  background: 'var(--ink)',
                  borderRadius: '10px 10px 10px 2px',
                }}
              >
                <TypingDots />
              </div>
            </div>
          ) : null}

          <div ref={chatEndRef} style={{ height: 0, overflow: 'hidden' }} aria-hidden />
        </div>

        <form
          onSubmit={handleSubmit}
          style={{
            width: '100%',
            background: 'var(--surface-card)',
            border: '0.5px solid var(--line)',
            borderTop: hasMessages ? '0.5px solid var(--hairline)' : undefined,
            borderRadius: hasMessages ? '0 0 16px 16px' : 16,
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            boxSizing: 'border-box',
            marginTop: hasMessages ? -1 : 0,
          }}
        >
          <span
            aria-hidden
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: 'var(--proof-accent)',
              flexShrink: 0,
              animation: 'proof-agent-pulse 2s ease-in-out infinite',
            }}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={e => {
              const file = e.target.files?.[0]
              if (file) handleImageFile(file)
              e.target.value = ''
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isTyping}
            aria-label={t('attachAria')}
            title={pendingImage ? t('attachReadyTitle') : t('attachTitle')}
            style={{
              width: 44,
              height: 44,
              borderRadius: 8,
              border: 'none',
              background: pendingImage ? accent : 'transparent',
              color: pendingImage ? 'var(--ink)' : 'var(--fg-3)',
              display: 'grid',
              placeItems: 'center',
              cursor: isTyping ? 'default' : 'pointer',
              flexShrink: 0,
              transition: 'background 0.15s ease, color 0.15s ease',
            }}
          >
            <CameraIcon />
          </button>
          <input
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            placeholder={t('placeholder')}
            disabled={isTyping}
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              outline: 'none',
              fontSize: 16,
              color: 'var(--fg-0)',
            }}
          />
          <button
            type="submit"
            disabled={(!inputValue.trim() && !pendingImage) || isTyping}
            aria-label={t('sendAria')}
            className="proof-agent-send"
            style={{
              width: 44,
              height: 44,
              borderRadius: 8,
              border: 'none',
              background: 'var(--fg-0)',
              color: 'var(--ink)',
              display: 'grid',
              placeItems: 'center',
              cursor: (inputValue.trim() || pendingImage) && !isTyping ? 'pointer' : 'default',
              flexShrink: 0,
              opacity: (inputValue.trim() || pendingImage) && !isTyping ? 1 : 0.4,
              transition: 'background 0.15s ease',
            }}
          >
            <TiArrowUp />
          </button>
        </form>
      </div>

      {quickActions.length > 0 ? (
        <div
          style={{
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
            justifyContent: 'center',
            width: '100%',
          }}
        >
          {quickActions.map(action =>
            action.href ? (
              <Link
                key={action.label}
                href={action.href}
                className="proof-quick-action"
                style={chipStyle}
                onMouseEnter={e => {
                  e.currentTarget.style.color = 'var(--fg-0)'
                  e.currentTarget.style.borderColor = `${accent}44`
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.color = 'var(--fg-3)'
                  e.currentTarget.style.borderColor = 'var(--line)'
                }}
              >
                {action.label}
              </Link>
            ) : (
              <button
                key={action.label}
                type="button"
                disabled={isTyping}
                onClick={() => submitText(action.message)}
                className="proof-quick-action"
                style={{
                  ...chipStyle,
                  opacity: isTyping ? 0.6 : 1,
                }}
                onMouseEnter={e => {
                  if (isTyping) return
                  e.currentTarget.style.color = 'var(--fg-0)'
                  e.currentTarget.style.borderColor = `${accent}44`
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.color = 'var(--fg-3)'
                  e.currentTarget.style.borderColor = 'var(--line)'
                }}
              >
                {action.label}
              </button>
            )
          )}
        </div>
      ) : null}
    </section>
  )
}

function CameraIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7zm7-13h-2.17l-1.24-1.35A1.99 1.99 0 0 0 14.12 1H9.88c-.56 0-1.1.24-1.47.65L7.17 2.5H5C3.9 2.5 3 3.4 3 4.5v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-14c0-1.1-.9-2-2-2z" />
    </svg>
  )
}

/** Themify ti-arrow-up */
function TiArrowUp() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 4l-7 8h4v8h6v-8h4l-7-8z" />
    </svg>
  )
}
