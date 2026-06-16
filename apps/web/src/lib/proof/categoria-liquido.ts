import type { CategoriaLiquido } from './types'

export const CATEGORIA_LIQUIDO_OPTIONS: { value: CategoriaLiquido; label: string }[] = [
  { value: 'cerveza', label: 'Cerveza' },
  { value: 'vino', label: 'Vino' },
  { value: 'mezcal', label: 'Mezcal' },
  { value: 'gin', label: 'Gin' },
  { value: 'destilado', label: 'Destilado' },
  { value: 'otro', label: 'Otro' },
]

/** Categorías núcleo del distribuidor (sin "otro"). */
export const CORE_CATEGORIA_LIQUIDO: CategoriaLiquido[] = [
  'mezcal',
  'vino',
  'cerveza',
  'destilado',
  'gin',
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

const EDIT_VERB_RE = /\b(cambi|edit|actualiz|pon)\w*\b/

/** Frases de edición de SKU (categoría / producto) — prioridad sobre toma-pedido y navegación. */
export function looksLikeEditarSkuQuery(query: string): boolean {
  const q = normQuery(query)
  if (q.includes('categor') && EDIT_VERB_RE.test(q)) {
    return true
  }
  if (
    /\bcategor\w*\s+de\s+.+\s+a\s+(vino|cerveza|mezcal|gin|destilado|otro)\b/.test(q)
  ) {
    return true
  }
  if (q.includes('editar') && (q.includes('sku') || q.includes('producto'))) {
    return true
  }
  return false
}

/** Extrae nombre parcial del SKU en frases tipo "categoría de Silvana a vino". */
export function extractSkuNameFromCategoryEditQuery(query: string): string | null {
  const q = normQuery(query)
  const deA = q.match(
    /\bde\s+([a-z0-9][a-z0-9\s\-'&.]{2,48}?)\s+a\s+(?:vino|cerveza|mezcal|gin|destilado|otro)\b/
  )
  if (deA?.[1]) return deA[1].trim()
  return null
}

export function parseCategoriaLiquidoFromQuery(query: string): CategoriaLiquido | null {
  const q = normQuery(query)
  if (!/(?:categor|cerveza|vinos?|mezcal|gin|destilado|tipo\s+de)/i.test(q)) {
    return null
  }
  // Plurales y alias frecuentes en consultas de bodega
  if (/\bcervezas?\b/.test(q)) return 'cerveza'
  if (/\bvinos?\b/.test(q) && !looksLikeEditarSkuQuery(query)) return 'vino'
  if (/\bmezcales?\b/.test(q)) return 'mezcal'
  for (const opt of CATEGORIA_LIQUIDO_OPTIONS) {
    if (q.includes(opt.value)) return opt.value
  }
  return null
}

type SkuCategoriaInput = {
  nombre: string
  productor?: string | null
  categoria_liquido?: CategoriaLiquido | string | null
}

/** Categoría efectiva: infiere del nombre si hay señal clara; si no, usa DB. */
export function resolveSkuCategoriaLiquido(sku: SkuCategoriaInput): CategoriaLiquido {
  const inferred = inferCategoriaFromText(sku)
  if (inferred !== 'otro') return inferred
  return normalizeCategoriaLiquido(sku.categoria_liquido)
}

function inferCategoriaFromText(sku: SkuCategoriaInput): CategoriaLiquido {
  const text = normQuery(`${sku.nombre} ${sku.productor ?? ''}`)
  if (/\b(vinos?|tinto|blanco|rosado|cava|espumoso|champagne|champan)\b/.test(text)) {
    return 'vino'
  }
  if (/\b(cervezas?|ipa|lager|ale|stout|pilsner|porter)\b/.test(text)) {
    return 'cerveza'
  }
  if (/\bmezcales?\b/.test(text)) return 'mezcal'
  if (/\bgin\b/.test(text)) return 'gin'
  if (/\b(whisky|whiskey|ron|vodka|tequila|destilado)\b/.test(text)) {
    return 'destilado'
  }
  return 'otro'
}

export function filterSkusByCategoriaQuery<T extends SkuCategoriaInput>(
  skus: T[],
  query: string
): { categoria: CategoriaLiquido | null; items: T[] } {
  const categoria = parseCategoriaLiquidoFromQuery(query)
  if (!categoria) return { categoria: null, items: skus }
  return {
    categoria,
    items: skus.filter(s => resolveSkuCategoriaLiquido(s) === categoria),
  }
}

export type OrdenCompraItemConSku = {
  producto_nombre: string
  sku_id?: string | null
  skus?:
    | {
        nombre?: string | null
        productor?: string | null
        categoria_liquido?: CategoriaLiquido | string | null
      }
    | null
}

export function resolveOrdenCompraItemCategoria(
  item: OrdenCompraItemConSku
): CategoriaLiquido {
  if (item.skus) {
    return resolveSkuCategoriaLiquido({
      nombre: item.skus.nombre ?? item.producto_nombre,
      productor: item.skus.productor,
      categoria_liquido: item.skus.categoria_liquido,
    })
  }
  return resolveSkuCategoriaLiquido({ nombre: item.producto_nombre })
}

export function uniqueCategoriasOrdenCompraItems(
  items: OrdenCompraItemConSku[]
): CategoriaLiquido[] {
  const seen = new Set<CategoriaLiquido>()
  const out: CategoriaLiquido[] = []
  for (const item of items) {
    const c = resolveOrdenCompraItemCategoria(item)
    if (!seen.has(c)) {
      seen.add(c)
      out.push(c)
    }
  }
  return out
}
