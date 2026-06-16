import { describe, expect, it } from 'vitest'
import {
  formatDetalleCompraProveedor,
  formatEstadoBodegaResumen,
  looksLikeDetalleCompraProveedorQuery,
  looksLikeEstadoBodegaQuery,
} from '@/lib/proof/bodega-estado-answers'
import { tryDistributorQuickAnswer } from '@/lib/proof/distributor-agent-answers'
import { makeDistributorContext } from './fixtures/distributor-context'

describe('bodega-estado-answers', () => {
  it('detecta consulta de estado de bodega', () => {
    expect(looksLikeEstadoBodegaQuery('¿qué hay en bodega?')).toBe(true)
  })

  it('detecta detalle de compra a proveedor', () => {
    expect(
      looksLikeDetalleCompraProveedorQuery('muéstrame el detalle de cerveza a mi proveedor')
    ).toBe(true)
  })

  it('resume bodega física y OC pendiente por separado', () => {
    const ctx = makeDistributorContext({
      skus: [],
      cxp: {
        total_por_pagar: 576,
        proveedores_con_saldo: 1,
        cuentas: [
          {
            id: 'cxp1',
            proveedor_nombre: 'Cervecería Norte',
            saldo_pendiente: 576,
            monto_total: 576,
            orden_compra_id: 'oc-1',
            estado: 'al_corriente',
          },
        ],
      },
      ordenes_compra_pendientes: [
        {
          id: 'oc-1',
          numero_orden: 'OC-001',
          proveedor_nombre: 'Cervecería Norte',
          estado: 'pendiente',
          fecha_estimada: null,
          items: [
            {
              id: 'item-1',
              producto_nombre: 'Lager Clásica',
              cantidad_ordenada: 24,
              cantidad_recibida: 0,
              costo_unitario: 24,
            },
          ],
        },
      ],
    })

    const resumen = formatEstadoBodegaResumen(ctx)
    expect(resumen).toContain('Bodega física vacía')
    expect(resumen).toContain('Pendiente de ingreso')
    expect(resumen).toContain('24')
    expect(resumen).toContain('$576')

    const detalle = formatDetalleCompraProveedor(
      'muéstrame el detalle de cerveza a mi proveedor',
      ctx
    )
    expect(detalle).toContain('Sin cerveza en bodega física')
    expect(detalle).toContain('Compra pendiente de ingreso')
    expect(detalle).toContain('OC-001')
    expect(detalle).toContain('confirma recepción')
  })
})

describe('tryDistributorQuickAnswer — estado bodega', () => {
  it('responde estado de bodega sin LLM', () => {
    const ctx = makeDistributorContext({
      skus: [
        {
          id: 'sku-c',
          codigo: 'CER-1',
          nombre: 'Lager Clásica',
          productor: 'Cervecería Norte',
          bodega: 'Principal',
          stock_disponible: 24,
          stock_reservado: 0,
          stock_total: 24,
          estado: 'sano',
          precio_venta: 0,
          notas: null,
          categoria_liquido: 'cerveza',
        },
      ],
    })
    const ans = tryDistributorQuickAnswer('¿qué hay en bodega?', ctx)
    expect(ans?.mensaje).toContain('En bodega')
    expect(ans?.mensaje).toContain('cerveza')
  })

  it('lente en bodega solo stock físico', () => {
    const ctx = makeDistributorContext({
      skus: [
        {
          id: 'sku-c',
          codigo: 'CER-1',
          nombre: 'Lager',
          productor: 'Norte',
          bodega: 'Principal',
          stock_disponible: 10,
          stock_reservado: 0,
          stock_total: 10,
          estado: 'sano',
          precio_venta: 50,
          notas: null,
          categoria_liquido: 'cerveza',
        },
      ],
      ordenes_compra_pendientes: [
        {
          id: 'oc-x',
          numero_orden: 'OC-099',
          proveedor_nombre: 'Norte',
          estado: 'pendiente',
          fecha_estimada: null,
          items: [
            {
              id: 'i1',
              producto_nombre: 'IPA',
              cantidad_ordenada: 50,
              cantidad_recibida: 0,
              costo_unitario: 20,
            },
          ],
        },
      ],
    })
    const fisica = tryDistributorQuickAnswer('muéstrame stock en bodega', ctx)
    expect(fisica?.mensaje).toContain('En bodega')
    expect(fisica?.mensaje).not.toContain('Pendiente de ingreso')

    const ingreso = tryDistributorQuickAnswer('muéstrame compras pendientes de ingreso', ctx)
    expect(ingreso?.mensaje).toContain('Pendiente de ingreso')
    expect(ingreso?.mensaje).toContain('OC-099')
  })

  it('no niega cerveza si solo está en OC pendiente', () => {
    const ctx = makeDistributorContext({
      skus: [],
      ordenes_compra_pendientes: [
        {
          id: 'oc-2',
          numero_orden: 'OC-002',
          proveedor_nombre: 'Cervecería Norte',
          estado: 'pendiente',
          fecha_estimada: null,
          items: [
            {
              id: 'item-2',
              producto_nombre: 'IPA artesanal',
              cantidad_ordenada: 24,
              cantidad_recibida: 0,
              costo_unitario: 24,
            },
          ],
        },
      ],
    })
    const ans = tryDistributorQuickAnswer('muéstrame cerveza en bodega', ctx)
    expect(ans?.mensaje).not.toContain('No tienes cerveza')
    expect(ans?.mensaje).toContain('Pendiente de ingreso')
  })
})
