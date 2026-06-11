import type { CategoriaLiquido } from './types'

export const CATEGORIA_LIQUIDO_OPTIONS: { value: CategoriaLiquido; label: string }[] = [
  { value: 'cerveza', label: 'Cerveza' },
  { value: 'vino', label: 'Vino' },
  { value: 'mezcal', label: 'Mezcal' },
  { value: 'gin', label: 'Gin' },
  { value: 'destilado', label: 'Destilado' },
  { value: 'otro', label: 'Otro' },
]

export const CATEGORIA_LIQUIDO_BADGE: Record<
  CategoriaLiquido,
  { bg: string; color: string }
> = {
  cerveza: { bg: '#FEF3C7', color: '#D97706' },
  vino: { bg: '#EDE9FE', color: '#7C3AED' },
  mezcal: { bg: '#FFEDD5', color: '#EA580C' },
  gin: { bg: '#DBEAFE', color: '#2563EB' },
  destilado: { bg: '#CCFBF1', color: '#0F766E' },
  otro: { bg: '#F3F4F6', color: '#6B7280' },
}

export function categoriaLiquidoLabel(
  value: CategoriaLiquido | string | null | undefined
): string {
  const found = CATEGORIA_LIQUIDO_OPTIONS.find(o => o.value === value)
  return found?.label ?? 'Otro'
}

export function normalizeCategoriaLiquido(
  value: string | null | undefined
): CategoriaLiquido {
  if (value && value in CATEGORIA_LIQUIDO_BADGE) {
    return value as CategoriaLiquido
  }
  return 'otro'
}

function normQuery(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
}

/** Frases de edición de SKU (categoría / producto) — prioridad sobre toma-pedido y navegación. */
export function looksLikeEditarSkuQuery(query: string): boolean {
  const q = normQuery(query)
  if (
    q.includes('categor') &&
    (q.includes('cambiar') ||
      q.includes('editar') ||
      q.includes('actualizar') ||
      q.includes('poner'))
  ) {
    return true
  }
  if (q.includes('editar') && (q.includes('sku') || q.includes('producto'))) {
    return true
  }
  return false
}

export function parseCategoriaLiquidoFromQuery(query: string): CategoriaLiquido | null {
  const q = normQuery(query)
  if (!/(?:categor|cerveza|vino|mezcal|gin|destilado|tipo\s+de)/i.test(q)) {
    return null
  }
  for (const opt of CATEGORIA_LIQUIDO_OPTIONS) {
    if (q.includes(opt.value)) return opt.value
  }
  return null
}
