import { describe, expect, it } from 'vitest'
import { tryDistributorQuickAnswer } from '@/lib/proof/distributor-agent-answers'
import { makeDistributorContext } from './fixtures/distributor-context'

const ctx = makeDistributorContext()

describe('tryDistributorQuickAnswer — consultas', () => {
  it('lista OC pendientes', () => {
    const ans = tryDistributorQuickAnswer('muéstrame las órdenes de compra pendientes', ctx)
    expect(ans?.mensaje).toContain('OC pendiente')
    expect(ans?.mensaje).toContain('OC-001')
    expect(ans?.accionHref).toBe('/dashboard/distribuidor/compras/nuevo')
  })

  it('pedidos pendientes de entrega', () => {
    const ans = tryDistributorQuickAnswer('muéstrame los pedidos pendientes', ctx)
    expect(ans?.mensaje).toContain('por entregar')
    expect(ans?.mensaje).toContain('PED-001')
  })

  it('cuentas por cobrar', () => {
    const rich = makeDistributorContext({
      resumen: { ...ctx.resumen, total_por_cobrar: 15000, clientes_con_saldo: 2 },
    })
    const ans = tryDistributorQuickAnswer('muéstrame las cuentas por cobrar', rich)
    expect(ans?.mensaje).toContain('$15,000')
    expect(ans?.accionHref).toBe('/dashboard/credito')
  })

  it('deuda vencida', () => {
    const rich = makeDistributorContext({
      credito: {
        total_por_cobrar: 5000,
        clientes_vencidos: 1,
        cuentas: [
          {
            id: 'cx1',
            pedido_id: 'ped-1',
            cliente_id: 'c1',
            cliente_nombre: 'Bar La Cueva',
            saldo_pendiente: 5000,
            monto_total: 5000,
            estado: 'vencida',
            fecha_vencimiento: '2020-01-01',
          },
        ],
      },
    })
    const ans = tryDistributorQuickAnswer('muéstrame la deuda vencida', rich)
    expect(ans?.mensaje).toContain('vencida')
    expect(ans?.mensaje).toContain('Bar La Cueva')
  })

  it('stock reservado', () => {
    const rich = makeDistributorContext({
      skus: [
        {
          ...ctx.skus[0]!,
          stock_reservado: 40,
          stock_disponible: 160,
        },
      ],
    })
    const ans = tryDistributorQuickAnswer('qué stock reservado tengo', rich)
    expect(ans?.mensaje).toContain('Stock reservado')
    expect(ans?.mensaje).toContain('res.')
  })

  it('cuentas por pagar', () => {
    const rich = makeDistributorContext({
      cxp: {
        total_por_pagar: 8000,
        proveedores_con_saldo: 1,
        cuentas: [
          {
            id: 'cxp1',
            proveedor_nombre: 'Borroso',
            saldo_pendiente: 8000,
            monto_total: 8000,
            orden_compra_id: 'oc-1',
            estado: 'al_corriente',
          },
        ],
      },
    })
    const ans = tryDistributorQuickAnswer('cuentas por pagar', rich)
    expect(ans?.mensaje).toContain('Borroso')
    expect(ans?.mensaje).toContain('$8,000')
  })

  it('inventario por bodega', () => {
    const ans = tryDistributorQuickAnswer('qué hay en bodega Norte', ctx)
    expect(ans?.mensaje).toContain('Norte')
    expect(ans?.mensaje).toContain('Silvana IPA')
  })

  it('stock de un SKU por nombre', () => {
    const ans = tryDistributorQuickAnswer('cuánto mezcal de borroso tengo', ctx)
    expect(ans?.mensaje).toContain('Mezcal de borroso')
    expect(ans?.mensaje).toContain('disp.')
  })
})

describe('tryDistributorQuickAnswer — toma pedido', () => {
  it('pide confirmación con anticipo', () => {
    const ans = tryDistributorQuickAnswer(
      'entregar 50 cajas de Silvana IPA a Bar La Cueva con anticipo de 2000',
      ctx
    )
    expect(ans?.mensaje).toContain('Confirmo pedido')
    expect(ans?.mensaje).toContain('anticipo')
    expect(ans?.mensaje).toMatch(/bar la cueva/i)
  })

  it('pide cliente si falta', () => {
    const ans = tryDistributorQuickAnswer('entregar 10 cajas de Silvana IPA', ctx)
    expect(ans?.mensaje).toContain('Para qué cliente')
  })

  it('guía OC sin detalle', () => {
    const ans = tryDistributorQuickAnswer('quiero crear una orden de compra', ctx)
    expect(ans?.mensaje).toContain('orden de compra')
    expect(ans?.mensaje).toContain('proveedor')
  })

  it('guía compra incompleta sin ir al LLM', () => {
    const ans = tryDistributorQuickAnswer('comprar a mi proveedor', ctx)
    expect(ans?.mensaje).toContain('cantidad, producto y proveedor')
  })
})

describe('tryDistributorQuickAnswer — llegada y pago', () => {
  it('pide OC concreta si hay varias pendientes', () => {
    const rich = makeDistributorContext({
      ordenes_compra_pendientes: [
        {
          id: 'oc-a',
          numero_orden: 'OC-001',
          proveedor_nombre: 'Norte',
          estado: 'pendiente',
          fecha_estimada: null,
          items: [
            {
              id: 'i1',
              producto_nombre: 'Lager',
              cantidad_ordenada: 24,
              cantidad_recibida: 0,
              costo_unitario: 24,
            },
          ],
        },
        {
          id: 'oc-b',
          numero_orden: 'OC-002',
          proveedor_nombre: 'Sur',
          estado: 'pendiente',
          fecha_estimada: null,
          items: [
            {
              id: 'i2',
              producto_nombre: 'IPA',
              cantidad_ordenada: 10,
              cantidad_recibida: 0,
              costo_unitario: 30,
            },
          ],
        },
      ],
    })
    const ans = tryDistributorQuickAnswer('confirmar que entro hoy a bodega', rich)
    expect(ans?.mensaje).toContain('OC-001')
    expect(ans?.mensaje).toContain('OC-002')
  })

  it('pide separar llegada y pago en un mensaje', () => {
    const ans = tryDistributorQuickAnswer(
      'confirma ese pago y confirma que entro hoy a bodega',
      ctx
    )
    expect(ans?.mensaje).toContain('un paso a la vez')
  })
})
