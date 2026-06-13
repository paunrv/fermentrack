'use client'

export function HorizontalChipRail<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { id: T; label: string }[]
  value: T
  onChange: (id: T) => void
}) {
  return (
    <div className="proof-chip-rail" role="tablist">
      {options.map(opt => {
        const active = value === opt.id
        return (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.id)}
            style={{
              flexShrink: 0,
              scrollSnapAlign: 'start',
              padding: '8px 14px',
              minHeight: 36,
              fontSize: 13,
              fontWeight: active ? 600 : 500,
              color: active ? 'var(--fg-0)' : 'var(--fg-2)',
              background: active ? 'var(--panel-2)' : 'var(--ink)',
              border: `1px solid ${active ? 'var(--line)' : 'var(--hairline)'}`,
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
