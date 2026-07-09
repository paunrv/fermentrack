'use client'

export type ExistenciaConsumptionBarProps = {
  producidas: number
  consumidas: number
  disponibles: number
  progressLabel: string
  unitsLabel: string
  lowStock?: boolean
  lowStockLabel?: string
}

export function ExistenciaConsumptionBar({
  producidas,
  consumidas,
  disponibles,
  progressLabel,
  unitsLabel,
  lowStock = false,
  lowStockLabel,
}: ExistenciaConsumptionBarProps) {
  const pct =
    producidas > 0 ? Math.min(100, Math.max(0, (consumidas / producidas) * 100)) : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontSize: 13, color: 'var(--fg-1)', lineHeight: 1.4 }}>{progressLabel}</span>
        {lowStock && lowStockLabel ? (
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--warn)',
              whiteSpace: 'nowrap',
            }}
          >
            {lowStockLabel}
          </span>
        ) : null}
      </div>

      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={producidas}
        aria-valuenow={consumidas}
        aria-label={progressLabel}
        style={{
          height: 8,
          borderRadius: 999,
          background: 'color-mix(in srgb, var(--hairline) 70%, transparent)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            borderRadius: 999,
            background: lowStock ? 'var(--warn)' : 'var(--proof-accent)',
            transition: 'width 0.2s ease',
          }}
        />
      </div>

      <span style={{ fontSize: 12, color: 'var(--fg-2)' }}>{unitsLabel}</span>
    </div>
  )
}

export function formatExistenciaUnitsLabel(
  stock: {
    disponibles: number
    cajas_disponibles: number
    sueltas: number
  },
  botellasPorCaja: number,
  labels: {
    botellas: (count: number) => string
    fullCases: (botellas: number, cajas: number, porCaja: number) => string
    brokenCases: (cajas: number, sueltas: number) => string
  }
): string {
  if (stock.disponibles <= 0) {
    return labels.botellas(0)
  }
  if (stock.sueltas === 0) {
    return labels.fullCases(stock.disponibles, stock.cajas_disponibles, botellasPorCaja)
  }
  return labels.brokenCases(stock.cajas_disponibles, stock.sueltas)
}
