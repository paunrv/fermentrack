import { describe, expect, it } from 'vitest'
import { buildWinemakerDisplayCards } from '@/lib/proof/winemaker-display-cards'
import type { WinemakerAgentContext } from '@/lib/proof/winemaker-agent-context'

const emptyCtx = {
  perfil: 'winemaker',
  resumen: {
    lotesTotal: 0,
    lotesActivos: 0,
    documentosTotal: 1,
    gastosMesMxn: 0,
    gastosBodegaMxn: 0,
    litrosEnProceso: 0,
    porEstado: [],
  },
  lotes: [],
  documentosRecientes: [],
  gastosRecientes: [],
} as unknown as WinemakerAgentContext

describe('buildWinemakerDisplayCards intent', () => {
  it('does not return emptyResults for queda en bodega', () => {
    const result = buildWinemakerDisplayCards('queda en bodega', emptyCtx as unknown as Record<string, unknown>)
    expect(result.emptyResults).toBe(false)
  })
})
