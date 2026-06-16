import { describe, expect, it } from 'vitest'
import { tryDistributorQuickAnswer } from '@/lib/proof/distributor-agent-answers'
import { makeDistributorContext } from './fixtures/distributor-context'

const ctx = makeDistributorContext()

describe('flujo orden de compra conversacional', () => {
  const conversation = [
    { role: 'user' as const, content: 'quiero crear una orden de compra' },
    {
      role: 'agent' as const,
      content:
        'Vamos a crear tu orden de compra. Dime cantidad, producto y proveedor. Ejemplo: "comprar 50 cajas de IPA a Cervecería Norte".',
    },
  ]

  it('no mezcla inventario ni OC previa al detallar la compra', () => {
    const datos = { ...ctx, conversation }
    const ans = tryDistributorQuickAnswer(
      '100 cajas de mezcal borroso de Cla Cla',
      datos as unknown as Record<string, unknown>
    )
    expect(ans?.mensaje).toContain('mezcal borroso')
    expect(ans?.mensaje).toContain('Cla Cla')
    expect(ans?.mensaje).toContain('Orden de compra propuesta')
    expect(ans?.mensaje).not.toMatch(/OC-001|inventario|cerveza/i)
  })

  it('one-shot con prefijo orden de compra no mezcla inventario', () => {
    const ans = tryDistributorQuickAnswer(
      'orden de compra, 50 cajas de mezcal Borroso al Proveedor Cla Cla',
      ctx as unknown as Record<string, unknown>
    )
    expect(ans?.mensaje).toContain('Cla Cla')
    expect(ans?.mensaje).toContain('Orden de compra propuesta')
    expect(ans?.mensaje).not.toMatch(/OC-001|inventario vac/i)
  })
})
