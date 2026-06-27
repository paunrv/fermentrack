'use client'

import { useState } from 'react'

export function CollapsibleSection({
  emoji,
  title,
  badge,
  defaultOpen = false,
  children,
}: {
  emoji: string
  title: string
  badge?: number | string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <section className="proof-collapsible-section">
      <button
        type="button"
        className="proof-collapsible-header"
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
      >
        <span style={{ fontSize: 14, lineHeight: 1 }} aria-hidden>
          {emoji}
        </span>
        <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{title}</span>
        {badge != null && badge !== '' && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--fg-2)',
              background: 'var(--panel-2)',
              padding: '2px 8px',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            {badge}
          </span>
        )}
        <span
          aria-hidden
          style={{
            fontSize: 12,
            color: 'var(--fg-3)',
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 220ms var(--ease-out)',
          }}
        >
          ﹀
        </span>
      </button>

      <div className="proof-collapsible-body" data-open={open ? 'true' : 'false'}>
        <div className="proof-collapsible-inner">
          <div className="proof-collapsible-content">{children}</div>
        </div>
      </div>
    </section>
  )
}
