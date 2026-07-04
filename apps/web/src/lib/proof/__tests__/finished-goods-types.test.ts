import { describe, expect, it } from 'vitest'
import {
  botellasFromSalidaInput,
  computeExistenciaStock,
} from '@/lib/proof/finished-goods-types'

describe('computeExistenciaStock', () => {
  it('derives disponibles and case breakdown', () => {
    const stock = computeExistenciaStock(480, 384, 12)
    expect(stock.producidas).toBe(480)
    expect(stock.consumidas).toBe(384)
    expect(stock.disponibles).toBe(96)
    expect(stock.cajas_disponibles).toBe(8)
    expect(stock.sueltas).toBe(0)
  })

  it('handles broken cases', () => {
    const stock = computeExistenciaStock(100, 43, 12)
    expect(stock.disponibles).toBe(57)
    expect(stock.cajas_disponibles).toBe(4)
    expect(stock.sueltas).toBe(9)
  })

  it('never reports negative disponibles', () => {
    const stock = computeExistenciaStock(24, 40, 12)
    expect(stock.disponibles).toBe(0)
    expect(stock.consumidas).toBe(24)
  })
})

describe('botellasFromSalidaInput', () => {
  it('converts cajas to botellas', () => {
    expect(botellasFromSalidaInput(2, 'cajas', 12)).toBe(24)
  })

  it('passes through botellas', () => {
    expect(botellasFromSalidaInput(18, 'botellas', 9)).toBe(18)
  })
})
