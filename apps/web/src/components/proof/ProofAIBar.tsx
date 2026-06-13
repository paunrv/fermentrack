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
  const actionStyle: React.CSSProperties = {
    flexShrink: 0,
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--gold)',
    padding: '10px 14px',
    minHeight: 44,
    border: '1px solid var(--gold-soft)',
    borderRadius: 'var(--radius-sm)',
    background: 'transparent',
    cursor: 'pointer',
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  }

  return (
    <div className="proof-ai-bar">
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flex: 1, minWidth: 0 }}>
        <span
          className="mono"
          style={{
            width: 32,
            height: 32,
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
            fontSize: 14,
            color: 'var(--fg-1)',
            lineHeight: 1.45,
            letterSpacing: '-0.005em',
          }}
        >
          {message}
        </p>
      </div>
      <div className="proof-ai-bar__actions">
        {onActionClick ? (
          <button type="button" onClick={onActionClick} style={actionStyle}>
            {actionLabel} ↗
          </button>
        ) : (
          <Link href={actionHref || '/dashboard/agente'} style={actionStyle}>
            {actionLabel} ↗
          </Link>
        )}
      </div>
    </div>
  )
}
