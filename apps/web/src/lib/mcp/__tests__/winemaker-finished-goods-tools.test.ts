import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mcpRequestContext } from '@/lib/mcp/request-context'
import { formatEtiquetasForMcp } from '@/lib/mcp/finished-goods-mcp'
import type { FinishedGoodsInventoryView } from '@/lib/proof/finished-goods-inventory'

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

const sampleView: FinishedGoodsInventoryView = {
  groups: [
    {
      id: 'et-1',
      nombre: 'Nebbiolo Reserva',
      totalDisponibles: 96,
      existencias: [
        {
          id: 'ex-1',
          etiquetaId: 'et-1',
          anada: 2023,
          formato: '750ml',
          loteOrigen: 'LOT-2023-004',
          loteId: 'lot-1',
          botellasPorCaja: 12,
          stock: {
            producidas: 480,
            consumidas: 384,
            disponibles: 96,
            cajas_disponibles: 8,
            sueltas: 0,
          },
          lowStock: false,
        },
      ],
    },
  ],
  filterOptions: { anadas: [2023], formatos: ['750ml'] },
}

vi.mock('@/lib/proof/finished-goods-inventory', () => ({
  fetchFinishedGoodsInventory: vi.fn(async () => sampleView),
  filterFinishedGoodsInventory: vi.fn((_view, filters) => {
    if (filters.anada === 2022) return { ...sampleView, groups: [] }
    return sampleView
  }),
}))

vi.mock('@/lib/mcp/audit-log', () => ({
  logMcpToolCall: vi.fn(),
}))

vi.mock('@/lib/mcp/idempotency', () => ({
  getIdempotentResult: vi.fn(() => null),
  saveIdempotentResult: vi.fn(),
}))

const mockFrom = vi.fn()

vi.mock('@/lib/mcp/tool-helpers', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/mcp/tool-helpers')>()
  return {
    ...actual,
    createMcpSupabase: vi.fn(() => ({ from: mockFrom })),
  }
})

describe('formatEtiquetasForMcp', () => {
  it('includes producidas, consumidas, disponibles on each existencia', () => {
    const formatted = formatEtiquetasForMcp(sampleView)
    expect(formatted.etiquetas[0]?.nombre).toBe('Nebbiolo Reserva')
    expect(formatted.etiquetas[0]?.existencias[0]).toMatchObject({
      existencia_id: 'ex-1',
      producidas: 480,
      consumidas: 384,
      disponibles: 96,
      cajas_disponibles: 8,
    })
  })
})

describe('list_etiquetas MCP tool', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns grouped etiquetas hierarchy', async () => {
    const { listEtiquetasTool } = await import('@/lib/mcp/tools/winemaker')

    const result = await mcpRequestContext.run(
      { userId: 'user-1', accessToken: 'test-token' },
      () => listEtiquetasTool({ profile_type: 'winemaker', organization_id: 'org-1' })
    )

    const parsed = JSON.parse(result.content[0]!.text) as {
      organization_id: string
      etiquetas: { total_disponibles: number }[]
    }
    expect(parsed.organization_id).toBe('org-1')
    expect(parsed.etiquetas[0]?.total_disponibles).toBe(96)
  })
})

describe('registrar_salida MCP tool', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFrom.mockImplementation((table: string) => {
      if (table === 'organizations') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { plan: 'regular' }, error: null }),
            }),
          }),
        }
      }
      return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) }
    })
  })

  it('preview_only returns conversion without writing', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'organizations') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { plan: 'regular' }, error: null }),
            }),
          }),
        }
      }
      if (table === 'wm_existencias') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    id: 'ex-1',
                    botellas_producidas: 96,
                    botellas_por_caja: 12,
                  },
                  error: null,
                }),
              }),
            }),
          }),
        }
      }
      if (table === 'wm_salidas') {
        return {
          select: () => ({
            eq: async () => ({ data: [], error: null }),
          }),
        }
      }
      return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) }
    })

    const { registrarSalidaTool } = await import('@/lib/mcp/tools/winemaker-write')

    const result = await mcpRequestContext.run(
      { userId: 'user-1', accessToken: 'test-token' },
      () =>
        registrarSalidaTool({
          profile_type: 'winemaker',
          organization_id: 'org-1',
          existencia_id: 'ex-1',
          tipo: 'venta',
          cantidad: 2,
          unidad: 'cajas',
          preview_only: true,
        })
    )

    const parsed = JSON.parse(result.content[0]!.text) as {
      preview_only: boolean
      conversion: { botellas: number; quedaran: number }
    }
    expect(parsed.preview_only).toBe(true)
    expect(parsed.conversion.botellas).toBe(24)
    expect(parsed.conversion.quedaran).toBe(72)
  })

  it('rejects rango for non-enterprise org', async () => {
    const { registrarSalidaTool } = await import('@/lib/mcp/tools/winemaker-write')

    await expect(
      mcpRequestContext.run({ userId: 'user-1', accessToken: 'test-token' }, () =>
        registrarSalidaTool({
          profile_type: 'winemaker',
          organization_id: 'org-1',
          existencia_id: 'ex-1',
          tipo: 'venta',
          cantidad: 1,
          unidad: 'botellas',
          rango_inicio: 1,
          rango_fin: 1,
        })
      )
    ).rejects.toThrow('rango_not_allowed')
  })
})
