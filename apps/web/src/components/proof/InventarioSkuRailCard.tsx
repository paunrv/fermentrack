'use client'

import Link from 'next/link'
import { categoriaLiquidoLabel } from '@/lib/proof/categoria-liquido'
import type { SKU, EstadoSKU } from '@/lib/proof/types'
import { StatusBadge } from '@/components/proof/StatusBadge'
import { StockBar } from '@/components/proof/StockBar'

type Props = {
  sku: SKU
  href: string | null
  canEdit: boolean
  onEdit: () => void
}

export function InventarioSkuRailCard({ sku, href, canEdit, onEdit }: Props) {
  return (
    <div className="proof-rail-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          {href ? (
            <Link
              href={href}
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--fg-0)',
                textDecoration: 'none',
                display: 'block',
                lineHeight: 1.3,
              }}
            >
              {sku.nombre}
            </Link>
          ) : (
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-0)', lineHeight: 1.3 }}>
              {sku.nombre}
            </div>
          )}
          <div style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 4 }}>
            {categoriaLiquidoLabel(sku.categoriaLiquido)}
          </div>
        </div>
        <StatusBadge estado={sku.estado as EstadoSKU} diasSinMovimiento={sku.diasSinMovimiento} />
      </div>

      <StockBar
        disponible={sku.stockDisponible}
        total={sku.stockTotal}
        reservado={sku.stockReservado}
        pedidos={sku.pedidosReservados}
      />

      <div
        style={{
          marginTop: 'auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 8,
          fontSize: 11,
          color: 'var(--fg-2)',
        }}
      >
        <span>
          Margen{' '}
          <strong className="mono" style={{ color: 'var(--gold)' }}>
            {sku.margenPorcentaje}%
          </strong>
        </span>
        {canEdit && (
          <button
            type="button"
            onClick={onEdit}
            style={{
              fontSize: 11,
              color: 'var(--gold)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              textDecoration: 'underline',
            }}
          >
            Editar
          </button>
        )}
      </div>
    </div>
  )
}
