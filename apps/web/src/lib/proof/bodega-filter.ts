import type { DistributorAgentContext } from '@/lib/proof/distributor-agent-context'

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
}

export function listBodegasFromSkus(skus: { bodega: string }[]): string[] {
  const set = new Set<string>()
  for (const s of skus) {
    if (s.bodega?.trim()) set.add(s.bodega.trim())
  }
  return [...set].sort((a, b) => a.localeCompare(b, 'es'))
}

export function wantsTransitoFilter(q: string): boolean {
  const n = norm(q)
  return (
    n.includes('en transito') ||
    n.includes('en tránsito') ||
    n.includes('transito') ||
    n.includes('tránsito')
  )
}

export function parseBodegaFromQuery(q: string, bodegas: string[]): string | null {
  const n = norm(q)
  if (wantsTransitoFilter(q)) return null

  if (n.includes('bodega principal') || (n.includes('principal') && n.includes('bodega'))) {
    return bodegas.find(b => norm(b) === 'principal') ?? 'Principal'
  }

  let best: string | null = null
  let bestLen = 0
  for (const b of bodegas) {
    const bn = norm(b)
    if (bn.length < 3) continue
    if (n.includes(bn) && bn.length > bestLen) {
      best = b
      bestLen = bn.length
    }
  }
  return best
}

export function filterSkusByBodegaQuery(
  skus: DistributorAgentContext['skus'],
  query: string
): {
  bodega: string | null
  transito: boolean
  items: DistributorAgentContext['skus']
} {
  if (wantsTransitoFilter(query)) {
    return {
      bodega: 'Tránsito',
      transito: true,
      items: skus.filter(s => s.estado === 'en_transito'),
    }
  }

  const bodegas = listBodegasFromSkus(skus)
  const bodega = parseBodegaFromQuery(query, bodegas)
  if (!bodega) {
    return { bodega: null, transito: false, items: skus }
  }

  return {
    bodega,
    transito: false,
    items: skus.filter(s => norm(s.bodega) === norm(bodega)),
  }
}
