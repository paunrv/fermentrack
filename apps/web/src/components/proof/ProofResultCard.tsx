'use client'

import { useTranslations } from 'next-intl'
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
  onDelete,
}: {
  item: CardItem
  onAction: (prompt: string) => void
  onDelete?: (itemId: string) => void | Promise<void>
}) {
  const t = useTranslations('distributor.canvas')
  const status = item.status ?? 'neutral'
  const showDelete = Boolean(item.devDeletable && onDelete)
  const aria = t('deleteDevAria', { name: item.name })
  const title = t('deleteDevTitle')

  return (
    <article
      style={{
        position: 'relative',
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
      {showDelete ? (
        <button
          type="button"
          aria-label={aria}
          title={title}
          onClick={() => void onDelete!(item.id)}
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            width: 28,
            height: 28,
            display: 'grid',
            placeItems: 'center',
            padding: 0,
            border: 'none',
            borderRadius: 6,
            background: 'transparent',
            color: 'var(--color-text-tertiary)',
            cursor: 'pointer',
            lineHeight: 0,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'var(--hover)'
            e.currentTarget.style.color = 'var(--color-text-danger)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'var(--color-text-tertiary)'
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M10 11v6M14 11v6" strokeLinecap="round" />
          </svg>
        </button>
      ) : null}

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, minWidth: 0, paddingRight: showDelete ? 24 : 0 }}>
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
