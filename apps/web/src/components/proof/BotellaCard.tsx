'use client'

import { useLocale, useTranslations } from 'next-intl'
import { AgaveCardIcon } from '@/components/proof/AgaveCardIcon'
import type { AppLocale } from '@/i18n/routing'
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
  produccion: 'var(--info)',
  terminado: 'var(--ok)',
  vendido_parcial: 'var(--proof-accent)',
  pendiente: 'var(--warn)',
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
  const t = useTranslations('distiller.common')
  const locale = useLocale() as AppLocale
  const stockParts: string[] = []
  if (litrosDisponibles != null) stockParts.push(`${litrosDisponibles} L`)
  if (botellasDisponibles != null) stockParts.push(`${botellasDisponibles} bts`)
  const fechaLabel = (() => {
    if (!fechaEmbotelladoProgramada) return null
    const d = parseDateOnlyLocal(fechaEmbotelladoProgramada)
    if (Number.isNaN(d.getTime())) return null
    return d.toLocaleDateString(locale, { day: 'numeric', month: 'short' })
  })()
  const title = [
    maestro,
    fechaLabel ? t('bottlesOn', { date: fechaLabel }) : null,
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
        background: selected ? 'var(--panel-2)' : 'var(--surface-card)',
        border: selected
          ? '0.5px solid var(--fg-0)'
          : dashed
            ? '0.5px dashed var(--warn)'
            : '0.5px solid var(--hairline)',
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
        e.currentTarget.style.borderColor = dashed ? 'var(--warn)' : 'var(--hairline)'
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
          background: 'var(--panel-2)',
          borderRadius: 4,
          padding: '8px 8px 6px',
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 500,
            color: 'var(--fg-0)',
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
            color: 'var(--fg-3)',
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
              color: estado === 'pendiente' ? 'var(--warn)' : accent,
              marginTop: 4,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {estado === 'pendiente' ? t('confirmArrival') : fechaLabel}
          </div>
        )}
      </div>
    </button>
  )
}
