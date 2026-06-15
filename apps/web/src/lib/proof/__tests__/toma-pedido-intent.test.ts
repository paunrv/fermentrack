import { describe, expect, it } from 'vitest'
import {
  extractPartialTomaPedidoDraft,
  extractTomaPedidoDraft,
  isConfirmationReply,
  looksLikeTomaPedidoQuery,
  parseAnticipoFromQuery,
  resolveSkuFromQuery,
  resolveTomaPedidoDraft,
} from '@/lib/proof/toma-pedido-intent'
import { makeDistributorContext } from './fixtures/distributor-context'

const ctx = makeDistributorContext()

describe('parseAnticipoFromQuery', () => {
  it('detecta monto con "con anticipo de"', () => {
    expect(parseAnticipoFromQuery('con anticipo de $2000')).toEqual({
      anticipo: true,
      anticipo_monto: 2000,
    })
  })

  it('detecta anticipo sin monto', () => {
    expect(parseAnticipoFromQuery('pedido con anticipo')).toEqual({
      anticipo: true,
      anticipo_monto: null,
    })
  })

  it('sin anticipo', () => {
    expect(parseAnticipoFromQuery('entregar 10 cajas')).toEqual({
      anticipo: false,
      anticipo_monto: null,
    })
  })
})

describe('extractPartialTomaPedidoDraft', () => {
  it('extrae venta sin cliente (no confunde con OC)', () => {
    const draft = extractPartialTomaPedidoDraft(
      'vamos hacer un pedido de 100 botellas de Mezcal de borroso',
      ctx
    )
    expect(draft).toMatchObject({
      cantidad: 100,
      unidad: 'botellas',
      cliente: null,
      sku_id: 'sku-1',
      sku_nombre: 'Mezcal de borroso',
    })
  })

  it('resuelve SKU por mejor coincidencia de nombre', () => {
    const draft = extractPartialTomaPedidoDraft(
      'entregar 24 cajas de Silvana IPA a Bar La Cueva',
      ctx
    )
    expect(draft?.sku_id).toBe('sku-2')
    expect(draft?.etiqueta).toBe('silvana ipa')
    expect(draft?.cliente).toBe('bar la cueva')
  })

  it('separa cliente del anticipo', () => {
    const draft = extractTomaPedidoDraft(
      'entregar 50 cajas de Silvana IPA a Bar La Cueva con anticipo de 2000',
      ctx
    )
    expect(draft).toMatchObject({
      cliente: 'bar la cueva',
      anticipo: true,
      anticipo_monto: 2000,
    })
  })
})

describe('looksLikeTomaPedidoQuery', () => {
  it('reconoce pedido de venta con cantidad y producto', () => {
    expect(
      looksLikeTomaPedidoQuery('hacer pedido de 100 botellas de Mezcal de borroso')
    ).toBe(true)
  })

  it('no confunde consulta de stock', () => {
    expect(looksLikeTomaPedidoQuery('cuanto stock tengo de mezcal')).toBe(false)
  })
})

describe('isConfirmationReply', () => {
  it('acepta confirmaciones cortas', () => {
    expect(isConfirmationReply('sí, prepara ticket')).toBe(true)
    expect(isConfirmationReply('dale')).toBe(true)
  })
})

describe('resolveTomaPedidoDraft', () => {
  it('combina turno previo con confirmación', () => {
    const conversation = [
      {
        role: 'user' as const,
        content: 'entregar 50 cajas de Silvana IPA a Bar La Cueva con anticipo de 2000',
      },
    ]
    const draft = resolveTomaPedidoDraft('sí, prepara ticket', conversation, ctx)
    expect(draft).toMatchObject({
      cantidad: 50,
      cliente: 'bar la cueva',
      sku_id: 'sku-2',
      anticipo: true,
      anticipo_monto: 2000,
    })
  })
})

describe('resolveSkuFromQuery', () => {
  it('elige el SKU con nombre más largo que coincida', () => {
    const sku = resolveSkuFromQuery('stock de mezcal de borroso', ctx)
    expect(sku?.id).toBe('sku-1')
  })
})
