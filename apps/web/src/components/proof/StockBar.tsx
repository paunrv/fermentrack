import { fmtBottles } from '@/lib/proof/format'

export function StockBar({
  disponible,
  total,
  reservado = 0,
  pedidos = 0,
}: {
  disponible: number
  total: number
  reservado?: number
  pedidos?: number
}) {
  const safeTotal = Math.max(total, 1)
  const pctDisp = Math.min(100, (disponible / safeTotal) * 100)
  const pctRes = Math.min(100 - pctDisp, (reservado / safeTotal) * 100)

  return (
    <div style={{ minWidth: 140 }}>
      <div
        className="mono"
        style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-0)', marginBottom: 4 }}
      >
        {fmtBottles(disponible)} / {fmtBottles(total)} bts
      </div>
      {reservado > 0 && (
        <div style={{ fontSize: 10, color: 'var(--fg-3)', marginBottom: 6 }}>
          {fmtBottles(reservado)} reservadas
          {pedidos > 0 ? ` en ${pedidos} pedido${pedidos === 1 ? '' : 's'}` : ''}
        </div>
      )}
      <div
        style={{
          display: 'flex',
          height: 4,
          borderRadius: 4,
          overflow: 'hidden',
          background: 'var(--hairline)',
        }}
      >
        <span
          style={{
            width: `${pctDisp}%`,
            background: 'var(--ok)',
            transition: 'width 300ms var(--ease-out)',
          }}
        />
        <span
          style={{
            width: `${pctRes}%`,
            background: 'var(--gold-soft)',
            opacity: 0.85,
          }}
        />
      </div>
    </div>
  )
}
