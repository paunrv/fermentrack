'use client'

export interface PipelineStage {
  key: string
  label: string
  count: number
  active?: boolean
  onClick?: () => void
}

export function PipelineHeader({ stages }: { stages: PipelineStage[] }) {
  return (
    <div
      role="tablist"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${stages.length}, minmax(0, 1fr))`,
        gap: 8,
        marginBottom: 24,
      }}
    >
      {stages.map(s => (
        <button
          key={s.key}
          type="button"
          role="tab"
          aria-selected={s.active}
          onClick={s.onClick}
          style={{
            padding: '12px 10px',
            background: s.active ? 'var(--panel)' : 'transparent',
            border: '0.5px solid',
            borderColor: s.active ? 'var(--gold)' : 'var(--hairline)',
            color: s.active ? 'var(--fg-0)' : 'var(--fg-2)',
            cursor: s.onClick ? 'pointer' : 'default',
            textAlign: 'left',
          }}
        >
          <div
            className="mono"
            style={{
              fontSize: 20,
              fontWeight: 600,
              color: 'var(--fg-0)',
              lineHeight: 1.1,
            }}
          >
            {s.count}
          </div>
          <div
            style={{
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginTop: 6,
              color: s.active ? 'var(--gold)' : 'var(--fg-3)',
            }}
          >
            {s.label}
          </div>
        </button>
      ))}
    </div>
  )
}

export function DestiladorSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="mono"
          style={{
            height: 14,
            background: 'var(--panel)',
            border: '0.5px solid var(--hairline)',
            opacity: 0.6,
            animation: 'pulse 1.2s ease-in-out infinite',
          }}
        />
      ))}
    </div>
  )
}
