'use client'

import Link from 'next/link'

export function ProofAIBar({
  message,
  actionLabel = 'Ver más',
  actionHref = '/dashboard/agente',
  onActionClick,
}: {
  message: string
  actionLabel?: string
  actionHref?: string
  onActionClick?: () => void
}) {
  return (
    <div
      style={{
        position: 'fixed',
        left: 84,
        right: 0,
        bottom: 0,
        zIndex: 12,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 28px',
        background: 'var(--panel)',
        borderTop: '1px solid var(--hairline)',
      }}
    >
      <span
        className="mono"
        style={{
          width: 28,
          height: 28,
          display: 'grid',
          placeItems: 'center',
          color: 'var(--gold)',
          fontSize: 14,
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        ✦
      </span>
      <p
        style={{
          flex: 1,
          margin: 0,
          fontSize: 13,
          color: 'var(--fg-1)',
          lineHeight: 1.45,
          letterSpacing: '-0.005em',
        }}
      >
        {message}
      </p>
      {onActionClick ? (
        <button
          type="button"
          onClick={onActionClick}
          style={{
            flexShrink: 0,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'var(--gold)',
            padding: '8px 12px',
            border: '1px solid var(--gold-soft)',
            borderRadius: 8,
            background: 'transparent',
            cursor: 'pointer',
          }}
        >
          {actionLabel} ↗
        </button>
      ) : (
        <Link
          href={actionHref || '/dashboard/agente'}
          style={{
            flexShrink: 0,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'var(--gold)',
            textDecoration: 'none',
            padding: '8px 12px',
            border: '1px solid var(--gold-soft)',
            borderRadius: 8,
          }}
        >
          {actionLabel} ↗
        </Link>
      )}
    </div>
  )
}
