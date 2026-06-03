'use client'

import { useState } from 'react'

export type AgentQuickAction = {
  label: string
  message: string
}

export function AgentBar({
  accent,
  onSend,
  response,
  quickActions = [],
}: {
  accent: string
  onSend: (message: string) => void
  response?: string
  quickActions?: AgentQuickAction[]
}) {
  const [message, setMessage] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = message.trim()
    if (!trimmed) return
    onSend(trimmed)
    setMessage('')
  }

  return (
    <section
      style={{
        width: '100%',
        maxWidth: 560,
        margin: '0 auto',
        padding: '32px 24px 24px',
        background: '#F8F7F4',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
        boxSizing: 'border-box',
      }}
    >
      <style>{`
        @keyframes proof-agent-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes proof-agent-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>

      <form
        onSubmit={handleSubmit}
        style={{
          width: '100%',
          background: '#fff',
          border: '0.5px solid #E0DDD6',
          borderRadius: 16,
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          boxSizing: 'border-box',
        }}
      >
        <span
          aria-hidden
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: accent,
            flexShrink: 0,
            animation: 'proof-agent-pulse 2s ease-in-out infinite',
          }}
        />
        <input
          type="text"
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Pregúntale a PROOF…"
          style={{
            flex: 1,
            border: 'none',
            background: 'transparent',
            outline: 'none',
            fontSize: 13,
            color: '#1A1A1A',
          }}
        />
        <button
          type="submit"
          disabled={!message.trim()}
          aria-label="Enviar"
          className="proof-agent-send"
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            border: 'none',
            background: '#1A1A1A',
            color: '#fff',
            display: 'grid',
            placeItems: 'center',
            cursor: message.trim() ? 'pointer' : 'default',
            flexShrink: 0,
            opacity: message.trim() ? 1 : 0.4,
            transition: 'background 0.15s ease',
          }}
          onMouseEnter={e => {
            if (message.trim()) e.currentTarget.style.background = accent
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = '#1A1A1A'
          }}
        >
          <TiArrowUp />
        </button>
      </form>

      {response ? (
        <p
          key={response}
          style={{
            width: '100%',
            margin: 0,
            fontSize: 12,
            color: '#888',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            lineHeight: 1.6,
            textAlign: 'center',
            animation: 'proof-agent-fade-in 0.35s ease-out',
          }}
        >
          {response}
        </p>
      ) : null}

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
          {quickActions.map(action => (
            <button
              key={action.label}
              type="button"
              onClick={() => onSend(action.message)}
              style={{
                fontSize: 11,
                color: '#999',
                border: '0.5px solid #E0DDD6',
                borderRadius: 20,
                padding: '5px 14px',
                background: '#fff',
                cursor: 'pointer',
                transition: 'color 0.15s ease, border-color 0.15s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.color = '#1A1A1A'
                e.currentTarget.style.borderColor = accent
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = '#999'
                e.currentTarget.style.borderColor = '#E0DDD6'
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </section>
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
