import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mcpRequestContext } from '@/lib/mcp/request-context'

vi.mock('@/lib/mcp/resolve-scope', () => ({
  resolveMcpScope: vi.fn(async () => ({
    profileType: 'distributor',
    organizationId: null,
    distributorScope: { user_id: 'user-1', profile_type_v2: 'distributor' },
    availableProfiles: ['distributor'],
    winemakerOrganizations: [],
  })),
}))

vi.mock('@/lib/mcp/auth', () => ({
  createSupabaseForMcpToken: vi.fn(() => ({})),
}))

vi.mock('@/lib/supabase/distribuidor', () => ({
  resolveDistribuidorScope: vi.fn(async () => ({
    user_id: 'user-1',
    profile_type_v2: 'distributor',
  })),
  fetchSkus: vi.fn(async () => [
    {
      id: 'sku-1',
      nombre: 'Mezcal Joven',
      stock_disponible: 12,
      estado: 'activo',
      precio_venta: 450,
      categoria_liquido: 'mezcal',
    },
  ]),
}))

describe('listSkusTool', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns SKU payload for authenticated MCP context', async () => {
    const { listSkusTool } = await import('@/lib/mcp/tools/distributor')

    const result = await mcpRequestContext.run(
      { userId: 'user-1', accessToken: 'test-token' },
      () => listSkusTool({ profile_type: 'distributor', limit: 10 })
    )

    const text = result.content[0]?.text
    expect(text).toBeTruthy()
    const parsed = JSON.parse(text!) as { count: number; skus: { id: string }[] }
    expect(parsed.count).toBe(1)
    expect(parsed.skus[0]?.id).toBe('sku-1')
  })

  it('throws when MCP context is missing', async () => {
    const { listSkusTool } = await import('@/lib/mcp/tools/distributor')
    await expect(listSkusTool({ profile_type: 'distributor' })).rejects.toThrow('Unauthorized')
  })
})
