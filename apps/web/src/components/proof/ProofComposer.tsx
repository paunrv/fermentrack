'use client'

import { useRef } from 'react'
import type { ProfileType } from '@/lib/proof/kpi-metrics'
import type { ProofQuickAction } from '@/lib/proof/proof-canvas-copy'
import { PROOF_CANVAS_CONTENT_WIDTH, PROOF_COPIES } from '@/lib/proof/proof-canvas-copy'

export type ProofQuickAction = {
  label: string
  message: string
}

const chipStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  color: 'var(--color-text-tertiary)',
  border: '0.5px solid var(--color-border-tertiary)',
  borderRadius: 8,
  padding: '6px 12px',
  background: 'var(--color-background-primary)',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  flexShrink: 0,
  fontFamily: 'var(--font-display)',
  transition: 'color 0.15s ease, border-color 0.15s ease, background 0.15s ease',
}

function TiArrowUp() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 4l-7 8h4v8h6v-8h4l-7-8z" />
    </svg>
  )
}

export function ProofComposer({
  accent,
  profileType,
  inputValue,
  onInputChange,
  onSubmit,
  onQuickAction,
  quickActions,
  disabled,
  showHint,
}: {
  accent: string
  profileType: ProfileType
  inputValue: string
  onInputChange: (v: string) => void
  onSubmit: (e: React.FormEvent) => void
  onQuickAction: (message: string) => void
  quickActions: ProofQuickAction[]
  disabled: boolean
  showHint: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const hintKey =
    profileType === 'distiller'
      ? 'distiller'
      : profileType === 'winemaker'
        ? 'winemaker'
        : 'distributor'
  const showQuickActions = showHint && quickActions.length > 0

  return (
    <div
      style={{
        flexShrink: 0,
        padding: '12px 20px 16px',
        background: 'var(--color-background-tertiary)',
        borderTop: '0.5px solid var(--color-border-tertiary)',
      }}
    >
      {showHint ? (
        <p
          style={{
            margin: '0 auto 10px',
            maxWidth: PROOF_CANVAS_CONTENT_WIDTH,
            fontSize: 12,
            lineHeight: 1.6,
            color: 'var(--color-text-tertiary)',
            textAlign: 'center',
            fontFamily: 'var(--font-display)',
          }}
        >
          {PROOF_COPIES.hint[hintKey]}
        </p>
      ) : null}

      <form
        className="proof-space-search"
        onSubmit={e => {
          onSubmit(e)
          requestAnimationFrame(() => inputRef.current?.focus())
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          maxWidth: PROOF_CANVAS_CONTENT_WIDTH,
          margin: '0 auto',
          background: 'var(--color-background-primary)',
          border: '0.5px solid var(--color-border-tertiary)',
          borderRadius: 10,
          padding: '10px 14px',
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
            animation: 'proof-composer-pulse 2s ease-in-out infinite',
          }}
        />
        <style>{`
          @keyframes proof-composer-pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
          }
        `}</style>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={e => onInputChange(e.target.value)}
          placeholder={PROOF_COPIES.placeholder}
          disabled={disabled}
          style={{
            flex: 1,
            border: 'none',
            background: 'transparent',
            outline: 'none',
            fontSize: 15,
            lineHeight: 1.6,
            fontWeight: 400,
            color: 'var(--color-text-primary)',
            fontFamily: 'var(--font-display)',
          }}
        />
        <button
          type="submit"
          disabled={!inputValue.trim() || disabled}
          aria-label="Enviar"
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            border: 'none',
            background: inputValue.trim() && !disabled ? 'var(--color-text-primary)' : 'var(--fg-4)',
            color: '#fff',
            display: 'grid',
            placeItems: 'center',
            cursor: inputValue.trim() && !disabled ? 'pointer' : 'default',
            flexShrink: 0,
            transition: 'background 0.15s ease',
          }}
        >
          <TiArrowUp />
        </button>
      </form>

      {showQuickActions ? (
        <div
          className="proof-quick-actions"
          style={{
            display: 'flex',
            gap: 8,
            marginTop: 10,
            maxWidth: PROOF_CANVAS_CONTENT_WIDTH,
            marginLeft: 'auto',
            marginRight: 'auto',
            overflowX: 'auto',
            flexWrap: 'wrap',
            justifyContent: 'center',
            paddingBottom: 2,
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {quickActions.map(action => (
            <button
              key={action.label}
              type="button"
              disabled={disabled}
              onClick={() => onQuickAction(action.message)}
              style={{
                ...chipStyle,
                opacity: disabled ? 0.6 : 1,
              }}
              onMouseEnter={e => {
                if (disabled) return
                e.currentTarget.style.color = 'var(--color-text-primary)'
                e.currentTarget.style.borderColor = accent
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = 'var(--color-text-tertiary)'
                e.currentTarget.style.borderColor = 'var(--color-border-tertiary)'
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function focusProofInput() {
  document.querySelector<HTMLInputElement>('.proof-canvas-shell input[type="text"]')?.focus()
}
