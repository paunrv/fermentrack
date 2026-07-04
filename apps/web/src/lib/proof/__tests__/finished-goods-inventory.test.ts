import { describe, expect, it } from 'vitest'
import {
  buildExistenciaInventoryRow,
  buildFinishedGoodsInventoryView,
  filterFinishedGoodsInventory,
  isLowStock,
  lowStockThresholdBotellas,
  sumSalidasByExistencia,
} from '@/lib/proof/finished-goods-inventory'

const baseExistenciaRow = {
  id: 'ex-1',
  anada: 2023,
  formato: '750ml',
  botellas_por_caja: 12 as const,
  botellas_producidas: 480,
  lote_id: 'lot-1',
  etiqueta_id: 'et-1',
  wm_etiquetas: { id: 'et-1', nombre: 'Nebbiolo Reserva' },
  lots: { code: 'LOT-2023-004' },
}

describe('sumSalidasByExistencia', () => {
  it('aggregates botellas per existencia', () => {
    const totals = sumSalidasByExistencia([
      { existencia_id: 'ex-1', botellas: 24 },
      { existencia_id: 'ex-1', botellas: 12 },
      { existencia_id: 'ex-2', botellas: 6 },
    ])
    expect(totals.get('ex-1')).toBe(36)
    expect(totals.get('ex-2')).toBe(6)
  })
})

describe('buildExistenciaInventoryRow', () => {
  it('derives stock counts and low-stock flag', () => {
    const row = buildExistenciaInventoryRow(baseExistenciaRow, 384)!
    expect(row.stock.producidas).toBe(480)
    expect(row.stock.consumidas).toBe(384)
    expect(row.stock.disponibles).toBe(96)
    expect(row.loteOrigen).toBe('LOT-2023-004')
    expect(row.lowStock).toBe(false)
  })

  it('flags low stock at threshold', () => {
    const row = buildExistenciaInventoryRow(baseExistenciaRow, 444)!
    expect(row.stock.disponibles).toBe(36)
    expect(lowStockThresholdBotellas(12)).toBe(36)
    expect(row.lowStock).toBe(true)
    expect(isLowStock(36, 12)).toBe(true)
  })
})

describe('buildFinishedGoodsInventoryView', () => {
  it('groups by etiqueta and sorts existencias', () => {
    const rows = [
      buildExistenciaInventoryRow(baseExistenciaRow, 100)!,
      buildExistenciaInventoryRow(
        {
          ...baseExistenciaRow,
          id: 'ex-2',
          anada: 2024,
          wm_etiquetas: { id: 'et-2', nombre: 'Cabernet' },
          etiqueta_id: 'et-2',
        },
        0
      )!,
    ]

    const view = buildFinishedGoodsInventoryView(rows, new Map([
      ['et-1', 'Nebbiolo Reserva'],
      ['et-2', 'Cabernet'],
    ]))

    expect(view.groups).toHaveLength(2)
    expect(view.groups[0].nombre).toBe('Cabernet')
    expect(view.groups[1].totalDisponibles).toBe(380)
    expect(view.filterOptions.anadas).toEqual([2024, 2023])
    expect(view.filterOptions.formatos).toEqual(['750ml'])
  })
})

describe('filterFinishedGoodsInventory', () => {
  const view = buildFinishedGoodsInventoryView(
    [
      buildExistenciaInventoryRow(baseExistenciaRow, 0)!,
      buildExistenciaInventoryRow(
        { ...baseExistenciaRow, id: 'ex-2', formato: 'magnum' },
        0
      )!,
    ],
    new Map([['et-1', 'Nebbiolo Reserva']])
  )

  it('filters by formato', () => {
    const filtered = filterFinishedGoodsInventory(view, { formato: 'magnum' })
    expect(filtered.groups[0].existencias).toHaveLength(1)
    expect(filtered.groups[0].existencias[0].formato).toBe('magnum')
  })

  it('filters by anada', () => {
    const filtered = filterFinishedGoodsInventory(view, { anada: 2023 })
    expect(filtered.groups[0].existencias.every(row => row.anada === 2023)).toBe(true)
  })
})
