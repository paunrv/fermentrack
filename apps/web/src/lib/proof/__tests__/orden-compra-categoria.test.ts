import { describe, expect, it } from 'vitest'
import {
  resolveOrdenCompraItemCategoria,
  uniqueCategoriasOrdenCompraItems,
} from '@/lib/proof/categoria-liquido'

describe('orden compra categoría', () => {
  it('usa categoría del SKU vinculado', () => {
    expect(
      resolveOrdenCompraItemCategoria({
        producto_nombre: 'Borrroso',
        skus: { nombre: 'Borrroso', categoria_liquido: 'mezcal' },
      })
    ).toBe('mezcal')
  })

  it('infiere categoría del nombre si no hay SKU', () => {
    expect(
      resolveOrdenCompraItemCategoria({
        producto_nombre: 'IPA Artesanal 24 pack',
      })
    ).toBe('cerveza')
  })

  it('devuelve categorías únicas de la orden', () => {
    expect(
      uniqueCategoriasOrdenCompraItems([
        { producto_nombre: 'Mezcal A', skus: { categoria_liquido: 'mezcal' } },
        { producto_nombre: 'Vino B', skus: { categoria_liquido: 'vino' } },
        { producto_nombre: 'Mezcal C', skus: { categoria_liquido: 'mezcal' } },
      ])
    ).toEqual(['mezcal', 'vino'])
  })
})
