type Props = {
  label: string
  value: string
  tone?: string
}

export function KpiRailChip({ label, value, tone }: Props) {
  return (
    <div className="proof-rail-card" style={{ minHeight: 100, justifyContent: 'center' }}>
      <div
        className="mono"
        style={{ fontSize: 9, color: 'var(--fg-3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}
      >
        {label}
      </div>
      <div
        className="mono"
        style={{ fontSize: 18, fontWeight: 600, color: tone || 'var(--fg-0)', lineHeight: 1.2 }}
      >
        {value}
      </div>
    </div>
  )
}
