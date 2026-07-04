'use client'

import Link from 'next/link'

type ProFeatureLockProps = {
  title: string
  body: string
  actionLabel: string
  actionHref?: string
}

export function ProFeatureLock({
  title,
  body,
  actionLabel,
  actionHref = '/dashboard/settings',
}: ProFeatureLockProps) {
  return (
    <div
      style={{
        marginBottom: 20,
        padding: '14px 16px',
        borderRadius: 12,
        border: '1px solid color-mix(in srgb, var(--proof-accent, #6940A5) 25%, var(--hairline))',
        background: 'rgba(105, 64, 165, 0.06)',
      }}
    >
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <span style={{ fontSize: 20, lineHeight: 1 }} aria-hidden>
          🔒
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: 'var(--fg-0)' }}>
            {title}
          </p>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.45 }}>{body}</p>
          <Link
            href={actionHref}
            style={{
              display: 'inline-block',
              marginTop: 10,
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--proof-accent, #6940A5)',
              textDecoration: 'none',
            }}
          >
            {actionLabel} →
          </Link>
        </div>
      </div>
    </div>
  )
}
