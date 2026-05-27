import type { SkuRow } from '@/lib/supabase/distribuidor'

export interface AnalisisItemRaw {
  nombre: string
  cantidadEstimada: number
  lote?: string
  confianza: number
  notas?: string
}

export interface AnalisisFotoResponse {
  productorDetectado: string | null
  items: AnalisisItemRaw[]
}

export interface ItemDetectadoRecepcion {
  skuId: string | null
  nombre: string
  cantidadEstimada: number
  cantidadEsperada: number
  cantidadRecibida: number
  lote: string
  confianza: number
  lowConfidence: boolean
  productoEncontradoEnCatalogo: boolean
  diferenciaVsOc: number | null
}

export interface ExpectedOcItem {
  skuId?: string
  nombre: string
  cantidadEsperada: number
}

function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function matchSkuCatalog(
  nombre: string,
  skus: SkuRow[]
): { sku: SkuRow | null; score: number } {
  const n = normalizeName(nombre)
  if (!n) return { sku: null, score: 0 }

  let best: SkuRow | null = null
  let bestScore = 0

  for (const sku of skus) {
    const sn = normalizeName(sku.nombre)
    if (!sn) continue
    if (sn === n) return { sku, score: 1 }
    if (sn.includes(n) || n.includes(sn)) {
      const score = Math.min(n.length, sn.length) / Math.max(n.length, sn.length)
      if (score > bestScore) {
        bestScore = score
        best = sku
      }
    }
  }
  return { sku: bestScore >= 0.45 ? best : null, score: bestScore }
}

export function enrichDetectedItems(
  raw: AnalisisItemRaw[],
  skus: SkuRow[],
  expected?: ExpectedOcItem[]
): ItemDetectadoRecepcion[] {
  const expectedBySku = new Map<string, ExpectedOcItem>()
  const expectedByName = new Map<string, ExpectedOcItem>()
  expected?.forEach(e => {
    if (e.skuId) expectedBySku.set(e.skuId, e)
    expectedByName.set(normalizeName(e.nombre), e)
  })

  return raw.map(item => {
    const { sku } = matchSkuCatalog(item.nombre, skus)
    const conf = Math.max(0, Math.min(1, Number(item.confianza) || 0))
    const lowConfidence = conf < 0.7
    const exp =
      (sku && expectedBySku.get(sku.id)) ||
      expectedByName.get(normalizeName(item.nombre))
    const cantidadEsperada = exp?.cantidadEsperada ?? 0
    const cantidadRecibida = Math.round(Number(item.cantidadEstimada) || 0)
    const diferenciaVsOc =
      exp != null ? cantidadRecibida - cantidadEsperada : null

    return {
      skuId: sku?.id ?? exp?.skuId ?? null,
      nombre: sku?.nombre ?? item.nombre,
      cantidadEstimada: cantidadRecibida,
      cantidadEsperada,
      cantidadRecibida,
      lote: item.lote || '',
      confianza: conf,
      lowConfidence,
      productoEncontradoEnCatalogo: Boolean(sku),
      diferenciaVsOc,
    }
  })
}

export function buildDiscrepanciasFromItems(items: ItemDetectadoRecepcion[]) {
  const out: Array<{
    tipo: 'faltante' | 'excedente' | 'sku_incorrecto'
    sku_id: string | null
    descripcion: string
    cantidad_afectada: number
  }> = []

  items.forEach(it => {
    if (it.diferenciaVsOc == null) return
    if (it.diferenciaVsOc < 0) {
      out.push({
        tipo: 'faltante',
        sku_id: it.skuId,
        descripcion: `${it.nombre}: faltan ${Math.abs(it.diferenciaVsOc)} botellas vs OC`,
        cantidad_afectada: Math.abs(it.diferenciaVsOc),
      })
    } else if (it.diferenciaVsOc > 0) {
      out.push({
        tipo: 'excedente',
        sku_id: it.skuId,
        descripcion: `${it.nombre}: excedente ${it.diferenciaVsOc} botellas vs OC`,
        cantidad_afectada: it.diferenciaVsOc,
      })
    }
    if (!it.productoEncontradoEnCatalogo && !it.lowConfidence) {
      out.push({
        tipo: 'sku_incorrecto',
        sku_id: it.skuId,
        descripcion: `${it.nombre}: no coincide con catálogo`,
        cantidad_afectada: it.cantidadRecibida,
      })
    }
  })
  return out
}
