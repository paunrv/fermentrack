import { describe, expect, it } from 'vitest'
import {
  distillerBlockedFromWinemakerPath,
  distributorBlockedFromWinemakerPath,
  winemakerBlockedFromPath,
} from '@/lib/proof/dashboard-routes'

describe('winemaker dashboard routes', () => {
  it('blocks winemaker from legacy producer paths', () => {
    expect(winemakerBlockedFromPath('winemaker', '/dashboard/lotes')).toBe(true)
    expect(winemakerBlockedFromPath('winemaker', '/dashboard/agente')).toBe(true)
  })

  it('blocks winemaker from distributor paths', () => {
    expect(winemakerBlockedFromPath('winemaker', '/dashboard/inventario')).toBe(true)
    expect(winemakerBlockedFromPath('winemaker', '/dashboard/pedidos')).toBe(true)
  })

  it('blocks winemaker from destilador paths', () => {
    expect(winemakerBlockedFromPath('winemaker', '/dashboard/destilador/lotes')).toBe(true)
  })

  it('allows winemaker own routes', () => {
    expect(winemakerBlockedFromPath('winemaker', '/dashboard/winemaker/lotes')).toBe(false)
    expect(
      winemakerBlockedFromPath(
        'winemaker',
        '/dashboard/winemaker/lotes/a0000013-0001-4000-8000-000000000001'
      )
    ).toBe(false)
    expect(
      winemakerBlockedFromPath(
        'winemaker',
        '/dashboard/lotes/a0000013-0001-4000-8000-000000000001'
      )
    ).toBe(true)
    expect(winemakerBlockedFromPath('winemaker', '/dashboard')).toBe(false)
  })

  it('blocks distiller and distributor from winemaker paths', () => {
    expect(distillerBlockedFromWinemakerPath('distiller', '/dashboard/winemaker/gastos')).toBe(
      true
    )
    expect(distributorBlockedFromWinemakerPath('distributor', '/dashboard/winemaker/lotes')).toBe(
      true
    )
  })
})
