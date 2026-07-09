'use client'

import { useRef } from 'react'
import type { ProfileType } from '@/lib/proof/kpi-metrics'
import { PROOF_CANVAS_CONTENT_WIDTH, PROOF_CANVAS_CONTENT_WIDTH_TABLET, PROOF_COPIES } from '@/lib/proof/proof-canvas-copy'
import { useBreakpoint } from '@/hooks/useBreakpoint'

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
  docked = false,
  placeholder: placeholderProp,
  hintText: hintTextProp,
  sendAria,
  wideLayout,
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
  /** Hilo activo encima: une visualmente chat + composer en un panel de 720px */
  docked?: boolean
  placeholder?: string
  hintText?: string
  sendAria?: string
  wideLayout?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const breakpoint = useBreakpoint()
  const contentMaxWidth = wideLayout
    ? undefined
    : breakpoint === 'tablet'
      ? PROOF_CANVAS_CONTENT_WIDTH_TABLET
      : PROOF_CANVAS_CONTENT_WIDTH
  const hintKey =
    profileType === 'distiller'
      ? 'distiller'
      : profileType === 'winemaker'
        ? 'winemaker'
        : 'distributor'
  const showQuickActions = showHint && quickActions.length > 0

  return (
    <div
      className="proof-composer-dock"
      style={{
        flexShrink: 0,
        padding: docked ? (wideLayout ? '0 16px 16px' : '0 20px 16px') : wideLayout ? '12px 16px 16px' : '12px 20px 16px',
        background: 'var(--color-background-tertiary)',
        borderTop: docked ? 'none' : '0.5px solid var(--color-border-tertiary)',
      }}
    >
      {showHint ? (
        <p
          style={{
            margin: '0 auto 10px',
            maxWidth: contentMaxWidth,
            fontSize: 12,
            lineHeight: 1.6,
            color: 'var(--color-text-tertiary)',
            textAlign: 'center',
            fontFamily: 'var(--font-display)',
          }}
        >
          {hintTextProp ?? PROOF_COPIES.hint[hintKey]}
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
          maxWidth: contentMaxWidth,
          margin: wideLayout ? undefined : '0 auto',
          width: '100%',
          background: 'var(--color-background-primary)',
          border: '0.5px solid var(--color-border-tertiary)',
          borderRadius: docked ? '0 0 10px 10px' : 10,
          borderTop: docked ? '0.5px solid var(--color-border-tertiary)' : undefined,
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
          placeholder={placeholderProp ?? PROOF_COPIES.placeholder}
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
          aria-label={sendAria}
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
            maxWidth: contentMaxWidth,
            marginLeft: wideLayout ? undefined : 'auto',
            marginRight: wideLayout ? undefined : 'auto',
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
