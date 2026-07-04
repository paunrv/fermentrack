import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mcpRequestContext } from '@/lib/mcp/request-context'

vi.mock('@/lib/mcp/resolve-scope', () => ({
  resolveMcpScope: vi.fn(async () => ({
    profileType: 'winemaker',
    organizationId: 'org-1',
    distributorScope: null,
    availableProfiles: ['winemaker'],
    winemakerOrganizations: [{ id: 'org-1', name: 'Viñas', role: 'owner' }],
  })),
}))

vi.mock('@/lib/mcp/auth', () => ({
  createSupabaseForMcpToken: vi.fn(() => ({})),
}))

vi.mock('@/lib/mcp/winemaker-pipeline-context', () => ({
  loadWinemakerPipelineMcpContext: vi.fn(async () => ({
    pipelineLots: [],
    pipeline: {
      salud: 'requiere_atencion',
      lotes_requieren_atencion: 1,
      lotes_activos: 2,
      conteo_por_etapa: {
        cosecha: 1,
        analisis: 0,
        fermentacion: 1,
        malolactica: 0,
        crianza: 0,
        embotellado: 0,
      },
    },
    lotes: [
      {
        id: 'lot-1',
        code: 'LOT-2026-001',
        etapa: 'fermentacion',
        dias_sin_registro: 8,
        varietal: 'Chardonnay',
        requiere_atencion: true,
        contenedor: 'Tanque 3',
        ultima_medicion: '17°C',
      },
    ],
  })),
}))

vi.mock('@/lib/supabase/winemaker', () => ({
  fetchWineLots: vi.fn(async () => []),
  fetchWinemakerSummary: vi.fn(async () => ({
    lotCount: 2,
    documentCount: 0,
    monthlyCostTotal: 0,
  })),
  fetchDocuments: vi.fn(async () => []),
  fetchProductionCosts: vi.fn(async () => []),
  fetchSuppliers: vi.fn(async () => []),
}))

describe('winemaker MCP read tools (pipeline)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('list_lotes returns etapa and dias_sin_registro', async () => {
    const { listLotesTool } = await import('@/lib/mcp/tools/winemaker')

    const result = await mcpRequestContext.run(
      { userId: 'user-1', accessToken: 'test-token' },
      () => listLotesTool({ profile_type: 'winemaker', organization_id: 'org-1' })
    )

    const parsed = JSON.parse(result.content[0]!.text) as {
      salud: string
      lotes: { etapa: string; dias_sin_registro: number }[]
    }
    expect(parsed.salud).toBe('requiere_atencion')
    expect(parsed.lotes[0]?.etapa).toBe('fermentacion')
    expect(parsed.lotes[0]?.dias_sin_registro).toBe(8)
  })

  it('get_resumen_bodega returns conteo_por_etapa and salud', async () => {
    const { getResumenBodegaTool } = await import('@/lib/mcp/tools/winemaker')

    const result = await mcpRequestContext.run(
      { userId: 'user-1', accessToken: 'test-token' },
      () => getResumenBodegaTool({ profile_type: 'winemaker', organization_id: 'org-1' })
    )

    const parsed = JSON.parse(result.content[0]!.text) as {
      salud: string
      lotes_requieren_atencion: number
      conteo_por_etapa: { fermentacion: number; cosecha: number }
    }
    expect(parsed.salud).toBe('requiere_atencion')
    expect(parsed.lotes_requieren_atencion).toBe(1)
    expect(parsed.conteo_por_etapa.fermentacion).toBe(1)
    expect(parsed.conteo_por_etapa.cosecha).toBe(1)
  })
})
