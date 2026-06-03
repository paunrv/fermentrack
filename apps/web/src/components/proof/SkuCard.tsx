'use client'

import type { EstadoSku } from '@/lib/supabase/distribuidor'

export type SkuCardEstado = 'ok' | 'bajo' | 'sin_stock' | 'sobrevendido'

const ESTADO_DOT: Record<SkuCardEstado, string> = {
  ok: '#4CAF7D',
  bajo: '#EF9F27',
  sin_stock: '#E24B4A',
  sobrevendido: '#E24B4A',
}

export function mapSkuEstadoToCard(estado: EstadoSku): SkuCardEstado {
  switch (estado) {
    case 'sobrevendido':
      return 'sobrevendido'
    case 'quiebre':
      return 'sin_stock'
    case 'bajo':
    case 'muerto':
      return 'bajo'
    case 'sano':
    case 'en_transito':
    case 'consignacion':
    default:
      return 'ok'
  }
}

export function SkuCard({
  id,
  nombre,
  stockDisponible,
  stockTotal,
  estado,
  selected = false,
  accent,
  onClick,
}: {
  id: string
  nombre: string
  stockDisponible: number
  stockTotal: number
  estado: SkuCardEstado
  selected?: boolean
  accent: string
  onClick: () => void
}) {
  const pulse = estado === 'sobrevendido'

  return (
    <button
      type="button"
      onClick={onClick}
      title={`${stockDisponible} disponibles de ${stockTotal}`}
      aria-label={`${nombre}, ${id}, ${stockDisponible} disponibles${selected ? ', seleccionado' : ''}`}
      style={{
        width: '100%',
        background: selected ? '#FAFAF8' : '#fff',
        border: selected ? '0.5px solid #1A1A1A' : '0.5px solid #E8E6E0',
        borderRadius: 12,
        padding: '16px 12px 12px',
        cursor: 'pointer',
        transition:
          'border-color 0.15s ease, transform 0.15s ease, background 0.15s ease',
        position: 'relative',
        textAlign: 'center',
      }}
      onMouseEnter={e => {
        if (selected) return
        e.currentTarget.style.borderColor = accent
        e.currentTarget.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={e => {
        if (selected) return
        e.currentTarget.style.borderColor = '#E8E6E0'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      <style>{`
        @keyframes proof-sku-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }
      `}</style>
      <span
        aria-hidden
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: ESTADO_DOT[estado],
          animation: pulse ? 'proof-sku-pulse 2s ease-in-out infinite' : undefined,
        }}
      />
      <div
        aria-hidden
        style={{
          width: 40,
          height: 56,
          margin: '0 auto 8px',
          borderRadius: 6,
          background: `${accent}18`,
          border: `0.5px solid ${accent}33`,
        }}
      />
      <div
        style={{
          background: '#F4F2EE',
          borderRadius: 4,
          padding: '8px 8px 6px',
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 500,
            color: '#1A1A1A',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {nombre}
        </div>
        <div
          style={{
            fontSize: 9,
            color: '#999',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            marginTop: 2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {id}
        </div>
      </div>
    </button>
  )
}
