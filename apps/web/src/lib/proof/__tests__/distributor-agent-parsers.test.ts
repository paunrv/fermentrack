import { describe, expect, it } from 'vitest'
import {
  looksLikeActualizarEstadoPedidoQuery,
  looksLikeCompraLlegadaQuery,
  looksLikeCrearOrdenCompraQuery,
  looksLikeDistributorMutation,
  looksLikeEntregaVentaQuery,
  looksLikeVentaPedidoQuery,
  needsOrdenCompraDetails,
  parseDistributorActionIntent,
} from '@/lib/proof/distributor-agent-actions'
import { makeDistributorContext } from './fixtures/distributor-context'

const ctx = makeDistributorContext()

describe('clasificación venta vs compra', () => {
  it('venta con "hacer pedido" no es crear OC', () => {
    const q = 'vamos hacer un pedido de 100 botellas de Mezcal de borroso'
    expect(looksLikeVentaPedidoQuery(q)).toBe(true)
    expect(looksLikeCrearOrdenCompraQuery(q)).toBe(false)
    expect(parseDistributorActionIntent(q, ctx)).toBeNull()
  })

  it('compra completa en un mensaje propone OC (no crea sin confirmar)', () => {
    const action = parseDistributorActionIntent(
      'comprar 24 cajas de IPA a Cervecería Norte',
      ctx
    )
    expect(action).toBeNull()
  })

  it('one-shot con prefijo orden de compra parsea proveedor', () => {
    const q = 'orden de compra, 50 cajas de mezcal Borroso al Proveedor Cla Cla'
    expect(needsOrdenCompraDetails(q)).toBe(false)
  })

  it('compra con proveedor placeholder no crea OC', () => {
    const q = 'comprar 24 cajas de cerveza a mi proveedor'
    expect(needsOrdenCompraDetails(q)).toBe(true)
    expect(parseDistributorActionIntent(q, ctx)).toBeNull()
  })

  it('OC sin detalle no es mutación automática', () => {
    const q = 'quiero crear una orden de compra'
    expect(needsOrdenCompraDetails(q)).toBe(true)
    expect(looksLikeDistributorMutation(q)).toBe(false)
  })
})

describe('llegada OC vs entrega venta', () => {
  it('confirmar entrega de pedido es venta', () => {
    const q = 'confirmar entrega del pedido PED-001'
    expect(looksLikeCompraLlegadaQuery(q)).toBe(false)
    expect(looksLikeEntregaVentaQuery(q)).toBe(true)
    expect(parseDistributorActionIntent(q, ctx)?.type).toBe('confirmar_entrega')
  })

  it('confirmar llegada OC es compra', () => {
    const q = 'confirmar llegada OC-001'
    expect(looksLikeCompraLlegadaQuery(q)).toBe(true)
    expect(looksLikeEntregaVentaQuery(q)).toBe(false)
    const action = parseDistributorActionIntent(q, ctx)
    expect(action?.type).toBe('confirmar_llegada_distribuidor')
  })

  it('confirmar ingreso a bodega hoy es llegada de compra', () => {
    const q = 'confirma que entro hoy a bodega'
    expect(looksLikeCompraLlegadaQuery(q)).toBe(true)
    const action = parseDistributorActionIntent(q, ctx)
    expect(action?.type).toBe('confirmar_llegada_distribuidor')
  })
})

describe('fulfillment preparando / en_ruta', () => {
  it('marcar preparando avanza pedido confirmado', () => {
    const action = parseDistributorActionIntent(
      'marcar pedido PED-001 como preparando',
      ctx
    )
    expect(action).toEqual({
      type: 'actualizar_estado_pedido',
      pedido_id: 'ped-1',
      estado: 'preparando',
      numero: 'PED-001',
    })
  })

  it('marcar en ruta no dispara entrega final', () => {
    const q = 'marcar pedido PED-001 en ruta'
    expect(looksLikeActualizarEstadoPedidoQuery(q)).toBe(true)
    expect(looksLikeEntregaVentaQuery(q)).toBe(false)
    expect(parseDistributorActionIntent(q, ctx)?.type).toBe('actualizar_estado_pedido')
  })

  it('salió de bodega avanza a en_ruta', () => {
    const action = parseDistributorActionIntent(
      'marcar pedido PED-001 salió de bodega',
      ctx
    )
    expect(action?.type).toBe('actualizar_estado_pedido')
    if (action?.type === 'actualizar_estado_pedido') {
      expect(action.estado).toBe('en_ruta')
    }
  })

  it('no re-prepara pedido ya en preparando', () => {
    expect(
      parseDistributorActionIntent('marcar pedido PED-002 como preparando', ctx)
    ).toBeNull()
  })

  it('marcar entregado cierra venta', () => {
    expect(
      parseDistributorActionIntent('marcar pedido PED-001 como entregado', ctx)?.type
    ).toBe('confirmar_entrega')
  })
})

describe('toma pedido con confirmación', () => {
  it('crea pedido con anticipo tras confirmar', () => {
    const conversation = [
      {
        role: 'user' as const,
        content: 'entregar 50 cajas de Silvana IPA a Bar La Cueva con anticipo de 2000',
      },
    ]
    const action = parseDistributorActionIntent('sí, prepara ticket', ctx, conversation)
    expect(action?.type).toBe('crear_toma_pedido')
    if (action?.type === 'crear_toma_pedido') {
      expect(action).toMatchObject({
        cantidad: 50,
        cliente: 'bar la cueva',
        sku_id: 'sku-2',
        anticipo: true,
        anticipo_monto: 2000,
      })
    }
  })
})

describe('consultas read-only', () => {
  it('no trata listados como mutación', () => {
    expect(looksLikeDistributorMutation('muéstrame las órdenes de compra pendientes')).toBe(
      false
    )
    expect(looksLikeDistributorMutation('cuentas por pagar')).toBe(false)
    expect(looksLikeDistributorMutation('qué stock reservado tengo')).toBe(false)
  })
})
