import { describe, expect, it } from 'vitest'
import {
  extractPartialOrdenCompraDraft,
  isOrdenCompraFlowActive,
  resolveOrdenCompraDraft,
  resolvePartialOrdenCompraDraft,
} from '@/lib/proof/toma-oc-intent'

describe('toma-oc-intent', () => {
  it('parsea cantidad, producto y proveedor', () => {
    const draft = extractPartialOrdenCompraDraft('100 cajas de mezcal borroso de Cla Cla')
    expect(draft).toEqual({
      cantidad: 100,
      unidad: 'cajas',
      producto: 'mezcal borroso',
      proveedor: 'Cla Cla',
    })
  })

  it('parsea frase larga con prefijo y al proveedor', () => {
    const draft = extractPartialOrdenCompraDraft(
      'orden de compra, 50 cajas de mezcal Borroso al Proveedor Cla Cla'
    )
    expect(draft?.cantidad).toBe(50)
    expect(draft?.producto.toLowerCase()).toContain('mezcal')
    expect(draft?.proveedor).toBe('Cla Cla')
  })

  it('parsea producto a proveedor sin la palabra proveedor', () => {
    const draft = extractPartialOrdenCompraDraft(
      'comprar 100 cajas de cerveza Tecate a Cerveceria Tecate'
    )
    expect(draft).toEqual({
      cantidad: 100,
      unidad: 'cajas',
      producto: 'cerveza Tecate',
      proveedor: 'Cerveceria Tecate',
    })
  })

  it('une proveedor en mensaje corto con draft anterior incompleto', () => {
    const conversation = [
      { role: 'user' as const, content: 'quiero crear una orden de compra' },
      {
        role: 'agent' as const,
        content: 'Dime cantidad, producto y proveedor.',
      },
      { role: 'user' as const, content: '100 cajas de cerveza Tecate' },
      {
        role: 'agent' as const,
        content: '¿A qué proveedor va la orden?',
      },
    ]
    const merged = resolvePartialOrdenCompraDraft('Cerveceria Tecate', conversation)
    expect(merged).toEqual({
      cantidad: 100,
      unidad: 'cajas',
      producto: 'cerveza Tecate',
      proveedor: 'Cerveceria Tecate',
    })
  })

  it('detecta flujo OC activo tras guía del agente', () => {
    const conversation = [
      { role: 'user' as const, content: 'quiero crear una orden de compra' },
      {
        role: 'agent' as const,
        content:
          'Vamos a crear tu orden de compra. Dime cantidad, producto y proveedor.',
      },
    ]
    expect(isOrdenCompraFlowActive(conversation)).toBe(true)
  })

  it('resuelve draft al confirmar', () => {
    const conversation = [
      { role: 'user' as const, content: 'quiero crear una orden de compra' },
      { role: 'agent' as const, content: 'Dime cantidad, producto y proveedor.' },
      { role: 'user' as const, content: '100 cajas de mezcal borroso de Cla Cla' },
      { role: 'agent' as const, content: '¿La creo?' },
    ]
    const draft = resolveOrdenCompraDraft('sí, crea la orden', conversation)
    expect(draft?.proveedor).toBe('Cla Cla')
    expect(draft?.producto).toBe('mezcal borroso')
    expect(draft?.cantidad).toBe(100)
  })
})
