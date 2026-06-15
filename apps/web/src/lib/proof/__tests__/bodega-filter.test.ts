import { describe, expect, it } from 'vitest'
import {
  filterSkusByBodegaQuery,
  listBodegasFromSkus,
  parseBodegaFromQuery,
  wantsTransitoFilter,
} from '@/lib/proof/bodega-filter'
import { makeDistributorContext } from './fixtures/distributor-context'

const ctx = makeDistributorContext()

describe('bodega-filter', () => {
  it('lista bodegas distintas del catálogo', () => {
    expect(listBodegasFromSkus(ctx.skus)).toEqual(['Norte', 'Principal'])
  })

  it('detecta filtro en tránsito', () => {
    expect(wantsTransitoFilter('stock en tránsito')).toBe(true)
    const { transito, items } = filterSkusByBodegaQuery(ctx.skus, 'qué hay en tránsito')
    expect(transito).toBe(true)
    expect(items.map(s => s.id)).toEqual(['sku-3'])
  })

  it('filtra por bodega principal', () => {
    const { bodega, items } = filterSkusByBodegaQuery(
      ctx.skus,
      'inventario en bodega principal'
    )
    expect(bodega).toBe('Principal')
    expect(items.map(s => s.id).sort()).toEqual(['sku-1', 'sku-3'])
  })

  it('filtra por bodega Norte', () => {
    expect(parseBodegaFromQuery('stock en bodega norte', ['Principal', 'Norte'])).toBe(
      'Norte'
    )
    const { items } = filterSkusByBodegaQuery(ctx.skus, 'muéstrame bodega norte')
    expect(items).toHaveLength(1)
    expect(items[0]?.nombre).toBe('Silvana IPA')
  })

  it('sin filtro devuelve todo el catálogo', () => {
    const { bodega, items } = filterSkusByBodegaQuery(ctx.skus, 'cuánto stock tengo')
    expect(bodega).toBeNull()
    expect(items).toHaveLength(3)
  })
})
