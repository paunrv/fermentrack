'use client'

import type { CardItem, CardItemStatus } from '@/lib/proof/agent-response-types'

const STATUS_COLOR: Record<CardItemStatus, string> = {
  ok: 'var(--color-text-success)',
  warning: 'var(--warn)',
  danger: 'var(--color-text-danger)',
  neutral: 'var(--fg-3)',
}

const outlineBtn: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  fontFamily: 'var(--font-display)',
  padding: '6px 10px',
  borderRadius: 8,
  border: '0.5px solid var(--color-border-tertiary)',
  background: 'transparent',
  color: 'var(--color-text-primary)',
  cursor: 'pointer',
  transition: 'background 0.15s ease, border-color 0.15s ease',
}

export function ProofResultCard({
  item,
  onAction,
}: {
  item: CardItem
  onAction: (prompt: string) => void
}) {
  const status = item.status ?? 'neutral'

  return (
    <article
      style={{
        background: 'var(--color-background-primary)',
        border: '0.5px solid var(--color-border-tertiary)',
        borderRadius: 12,
        padding: '1rem 1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        minWidth: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, minWidth: 0 }}>
        <span
          aria-hidden
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: STATUS_COLOR[status],
            flexShrink: 0,
            marginTop: 5,
          }}
        />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: 'var(--color-text-primary)',
              lineHeight: 1.4,
              wordBreak: 'break-word',
            }}
          >
            {item.name}
          </div>
          {item.subtitle ? (
            <div
              style={{
                fontSize: 12,
                color: 'var(--color-text-tertiary)',
                marginTop: 2,
                lineHeight: 1.5,
              }}
            >
              {item.subtitle}
            </div>
          ) : null}
        </div>
      </div>

      {item.primaryValue ? (
        <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--color-text-primary)' }}>
          <span style={{ color: 'var(--color-text-tertiary)' }}>{item.primaryValue.label}: </span>
          <span style={{ fontWeight: 500 }}>{item.primaryValue.value}</span>
        </div>
      ) : null}

      {item.secondaryValues?.map((sv, i) => (
        <div
          key={`${sv.label}-${i}`}
          style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--color-text-primary)' }}
        >
          <span style={{ color: 'var(--color-text-tertiary)' }}>{sv.label}: </span>
          <span>{sv.value}</span>
        </div>
      ))}

      {item.actions && item.actions.length > 0 ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
          {item.actions.map(action => (
            <button
              key={action.label}
              type="button"
              style={outlineBtn}
              aria-label={`${action.label} para ${item.name}`}
              onClick={() => onAction(action.prompt)}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'var(--hover)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent'
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </article>
  )
}
