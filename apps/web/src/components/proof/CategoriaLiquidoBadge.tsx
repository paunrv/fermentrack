'use client'

import { useTranslations } from 'next-intl'
import {
  CATEGORIA_LIQUIDO_BADGE,
  CORE_CATEGORIA_LIQUIDO,
  categoriaLiquidoLabel,
  normalizeCategoriaLiquido,
} from '@/lib/proof/categoria-liquido'
import type { CategoriaLiquido } from '@/lib/proof/types'

export function CategoriaLiquidoBadge({
  categoria,
  size = 'sm',
}: {
  categoria: CategoriaLiquido | string | null | undefined
  size?: 'sm' | 'xs'
}) {
  const value = normalizeCategoriaLiquido(categoria ?? undefined)
  const tone = CATEGORIA_LIQUIDO_BADGE[value]
  const fontSize = size === 'xs' ? 7 : 8
  const padding = size === 'xs' ? '1px 5px' : '2px 6px'

  return (
    <span
      style={{
        display: 'inline-block',
        padding,
        borderRadius: 4,
        fontSize,
        fontWeight: 600,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        background: tone.bg,
        color: tone.color,
        lineHeight: 1.2,
        whiteSpace: 'nowrap',
      }}
    >
      {categoriaLiquidoLabel(value)}
    </span>
  )
}

export function CategoriaLiquidoPicker({
  value,
  onChange,
  disabled = false,
  saving = false,
}: {
  value: CategoriaLiquido | string | null | undefined
  onChange: (categoria: CategoriaLiquido) => void
  disabled?: boolean
  saving?: boolean
}) {
  const t = useTranslations('distributor.common')
  const current = normalizeCategoriaLiquido(value ?? undefined)
  const options =
    current === 'otro'
      ? CORE_CATEGORIA_LIQUIDO
      : CORE_CATEGORIA_LIQUIDO.includes(current)
        ? CORE_CATEGORIA_LIQUIDO
        : [...CORE_CATEGORIA_LIQUIDO, current]

  return (
    <div
      role="group"
      aria-label={t('categoriaAria')}
      style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}
    >
      {options.map(cat => {
        const tone = CATEGORIA_LIQUIDO_BADGE[cat]
        const selected = cat === current
        return (
          <button
            key={cat}
            type="button"
            disabled={disabled || saving}
            onClick={() => onChange(cat)}
            aria-pressed={selected}
            style={{
              padding: '3px 8px',
              borderRadius: 6,
              border: selected
                ? `1px solid ${tone.color}`
                : '1px solid var(--color-border-tertiary)',
              background: selected ? tone.bg : 'transparent',
              color: selected ? tone.color : 'var(--color-text-tertiary)',
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              cursor: disabled || saving ? 'default' : 'pointer',
              opacity: saving ? 0.6 : 1,
              fontFamily: 'var(--font-display)',
            }}
          >
            {categoriaLiquidoLabel(cat)}
          </button>
        )
      })}
    </div>
  )
}
