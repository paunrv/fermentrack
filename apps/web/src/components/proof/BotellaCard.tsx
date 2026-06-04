'use client'

import { AgaveCardIcon } from '@/components/proof/AgaveCardIcon'
import { parseDateOnlyLocal } from '@/lib/proof/format'
import type { DestLoteEstado } from '@/lib/proof/destilador-types'

export type BotellaCardEstado =
  | 'crudo'
  | 'produccion'
  | 'terminado'
  | 'vendido_parcial'
  | 'pendiente'

const ESTADO_DOT: Record<BotellaCardEstado, string> = {
  crudo: 'var(--proof-accent)',
  produccion: '#378ADD',
  terminado: '#4CAF7D',
  vendido_parcial: '#9B8FE0',
  pendiente: '#D4A017',
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
    default:
      return 'crudo'
  }
}

export function BotellaCard({
  id,
  nombre,
  maestro,
  estado,
  litrosDisponibles,
  botellasDisponibles,
  fechaEmbotelladoProgramada,
  selected = false,
  accent,
  onClick,
  dashed = false,
}: {
  id: string
  nombre: string
  maestro: string
  estado: BotellaCardEstado
  /** Viaje en tránsito (aún no es lote en bodega) */
  dashed?: boolean
  litrosDisponibles?: number
  botellasDisponibles?: number
  fechaEmbotelladoProgramada?: string | null
  selected?: boolean
  accent: string
  onClick: () => void
}) {
  const stockParts: string[] = []
  if (litrosDisponibles != null) stockParts.push(`${litrosDisponibles} L`)
  if (botellasDisponibles != null) stockParts.push(`${botellasDisponibles} bts`)
  const fechaLabel = (() => {
    if (!fechaEmbotelladoProgramada) return null
    const d = parseDateOnlyLocal(fechaEmbotelladoProgramada)
    if (Number.isNaN(d.getTime())) return null
    return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
  })()
  const title = [
    maestro,
    fechaLabel ? `Embotella ${fechaLabel}` : null,
    stockParts.length > 0 ? stockParts.join(' · ') : null,
  ]
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
        border: selected
          ? '0.5px solid #1A1A1A'
          : dashed
            ? '0.5px dashed #D4A017'
            : '0.5px solid #E8E6E0',
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
        e.currentTarget.style.borderColor = dashed ? '#D4A017' : '#E8E6E0'
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
      <AgaveCardIcon accent={accent} />
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
        {(fechaLabel || estado === 'pendiente') && (
          <div
            style={{
              fontSize: 8,
              color: estado === 'pendiente' ? '#B8860B' : accent,
              marginTop: 4,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {estado === 'pendiente' ? 'Confirmar llegada' : fechaLabel}
          </div>
        )}
      </div>
    </button>
  )
}
