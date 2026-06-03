'use client'

import type { DestLoteEstado } from '@/lib/proof/destilador-types'

export type BotellaCardEstado = 'crudo' | 'produccion' | 'terminado' | 'vendido_parcial'

const ESTADO_DOT: Record<BotellaCardEstado, string> = {
  crudo: '#C8A96E',
  produccion: '#378ADD',
  terminado: '#4CAF7D',
  vendido_parcial: '#9B8FE0',
}

export function mapLoteEstadoToBotella(estado: DestLoteEstado): BotellaCardEstado {
  switch (estado) {
    case 'en_bodega_crudo':
      return 'crudo'
    case 'en_produccion':
      return 'produccion'
    case 'terminado':
      return 'terminado'
    case 'vendido_parcial':
      return 'vendido_parcial'
  }
}

export function BotellaCard({
  id,
  nombre,
  maestro,
  estado,
  litrosDisponibles,
  botellasDisponibles,
  selected = false,
  accent,
  onClick,
}: {
  id: string
  nombre: string
  maestro: string
  estado: BotellaCardEstado
  litrosDisponibles?: number
  botellasDisponibles?: number
  selected?: boolean
  accent: string
  onClick: () => void
}) {
  const stockParts: string[] = []
  if (litrosDisponibles != null) stockParts.push(`${litrosDisponibles} L`)
  if (botellasDisponibles != null) stockParts.push(`${botellasDisponibles} bts`)
  const title = [maestro, stockParts.length > 0 ? stockParts.join(' · ') : null]
    .filter(Boolean)
    .join(' · ')

  return (
    <button
      type="button"
      onClick={onClick}
      title={title || undefined}
      aria-label={`${nombre}, ${id}${selected ? ', seleccionado' : ''}`}
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
        }}
      />
      <svg
        width="40"
        height="72"
        viewBox="0 0 40 72"
        aria-hidden
        style={{ display: 'block', margin: '0 auto 8px' }}
      >
        <path
          d="M15 2h10v8c0 3 3 5 3 8v4c0 8-3 12-3 16v24c0 4-3 8-8 8h-2c-5 0-8-4-8-8V38c0-4-3-8-3-16v-4c0-3 3-5 3-8V2z"
          fill={`${accent}33`}
          stroke="#E0DDD6"
          strokeWidth="0.5"
        />
      </svg>
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
