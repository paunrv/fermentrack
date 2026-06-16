import { describe, expect, it } from 'vitest'
import { tryDistributorQuickAnswer } from '@/lib/proof/distributor-agent-answers'
import { isOrdenCompraFlowActive } from '@/lib/proof/toma-oc-intent'
import { isPedidoVentaFlowActive } from '@/lib/proof/toma-pedido-intent'
import { makeDistributorContext } from './fixtures/distributor-context'

const ctx = makeDistributorContext()

describe('separación OC vs pedido venta', () => {
  it('flujos activos son mutuamente excluyentes', () => {
    const ocConvo = [
      { role: 'user' as const, content: 'quiero crear una orden de compra' },
      { role: 'agent' as const, content: 'Vamos a crear tu orden de compra al proveedor.' },
    ]
    const pedidoConvo = [
      { role: 'user' as const, content: 'quiero registrar un nuevo pedido' },
      {
        role: 'agent' as const,
        content: 'Vamos a registrar un pedido de venta a tu cliente.',
      },
    ]
    expect(isOrdenCompraFlowActive(ocConvo)).toBe(true)
    expect(isPedidoVentaFlowActive(ocConvo)).toBe(false)
    expect(isPedidoVentaFlowActive(pedidoConvo)).toBe(true)
    expect(isOrdenCompraFlowActive(pedidoConvo)).toBe(false)
  })

  it('nuevo pedido guía venta a cliente sin mezclar OC', () => {
    const ans = tryDistributorQuickAnswer('quiero registrar un nuevo pedido', ctx)
    expect(ans?.mensaje).toContain('cliente')
    expect(ans?.mensaje).not.toMatch(/proveedor|orden de compra/i)
  })

  it('detalle de venta en flujo pedido no menciona OC previa', () => {
    const conversation = [
      { role: 'user' as const, content: 'quiero registrar un nuevo pedido' },
      {
        role: 'agent' as const,
        content:
          'Vamos a registrar un pedido de venta a tu cliente. Dime cantidad, producto y cliente.',
      },
    ]
    const datos = { ...ctx, conversation }
    const ans = tryDistributorQuickAnswer(
      '50 latas de Silvana IPA a Bar La Cueva',
      datos as unknown as Record<string, unknown>
    )
    expect(ans?.mensaje).toContain('Bar La Cueva')
    expect(ans?.mensaje).toContain('Pedido de venta propuesto')
    expect(ans?.mensaje).not.toMatch(/OC-001|proveedor/i)
  })
})
