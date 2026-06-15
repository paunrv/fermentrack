import { describe, expect, it } from 'vitest'
import {
  encodeOcRecepcionValue,
  itemsOrdenDistribuidorToExpected,
  parseOcRecepcionValue,
} from '@/lib/proof/recepcion-oc'

describe('recepcion-oc', () => {
  it('codifica y parsea vínculo distribuidor', () => {
    const id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
    const value = encodeOcRecepcionValue('distribuidor', id)
    expect(parseOcRecepcionValue(value)).toEqual({ source: 'distribuidor', id })
  })

  it('convierte ítems OC a cantidad pendiente por recibir', () => {
    const expected = itemsOrdenDistribuidorToExpected([
      {
        id: 'i1',
        orden_id: 'o1',
        producto_nombre: 'IPA',
        sku_id: 's1',
        cantidad_ordenada: 100,
        cantidad_recibida: 40,
        costo_unitario: 50,
        subtotal: 5000,
        created_at: '',
      },
    ])
    expect(expected).toEqual([
      { skuId: 's1', nombre: 'IPA', cantidadEsperada: 60 },
    ])
  })
})
