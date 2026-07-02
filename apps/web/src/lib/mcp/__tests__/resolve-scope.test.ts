import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resolveMcpScope } from '@/lib/mcp/resolve-scope'

vi.mock('@/lib/supabase/organization', () => ({
  fetchWinemakerOrganizations: vi.fn(),
  fetchWinemakerOrganizationIdForUser: vi.fn(),
}))

vi.mock('@/lib/supabase/distribuidor', () => ({
  resolveDistribuidorScope: vi.fn(async () => ({
    user_id: 'patron-1',
    profile_type_v2: 'distributor',
  })),
}))

import {
  fetchWinemakerOrganizationIdForUser,
  fetchWinemakerOrganizations,
} from '@/lib/supabase/organization'

describe('resolveMcpScope', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects winemaker org when user is not a member', async () => {
    vi.mocked(fetchWinemakerOrganizations).mockResolvedValue([
      {
        organizationId: 'org-a',
        role: 'owner',
        status: 'active',
        organization: {
          id: 'org-a',
          name: 'Bodega A',
          slug: 'bodega-a',
          org_type: 'winemaker',
          plan: 'free',
          plan_status: 'active',
          created_at: '2026-01-01T00:00:00Z',
        },
      },
    ])

    const from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        or: vi.fn().mockResolvedValue({
          data: [{ profile_type_v2: 'winemaker' }],
          error: null,
        }),
      }),
    })

    await expect(
      resolveMcpScope(
        { from } as never,
        'user-1',
        { profile_type: 'winemaker', organization_id: 'org-b' }
      )
    ).rejects.toThrow('not a member')
  })

  it('defaults to winemaker when user has org membership and no distributor profile', async () => {
    vi.mocked(fetchWinemakerOrganizations).mockResolvedValue([
      {
        organizationId: 'org-a',
        role: 'member',
        status: 'active',
        organization: {
          id: 'org-a',
          name: 'Bodega A',
          slug: 'bodega-a',
          org_type: 'winemaker',
          plan: 'free',
          plan_status: 'active',
          created_at: '2026-01-01T00:00:00Z',
        },
      },
    ])
    vi.mocked(fetchWinemakerOrganizationIdForUser).mockResolvedValue('org-a')

    const from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        or: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    })

    const scope = await resolveMcpScope({ from } as never, 'user-1')
    expect(scope.profileType).toBe('winemaker')
    expect(scope.organizationId).toBe('org-a')
  })

  it('resolves distributor scope for distributor profile', async () => {
    vi.mocked(fetchWinemakerOrganizations).mockResolvedValue([])

    const from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        or: vi.fn().mockResolvedValue({
          data: [{ profile_type_v2: 'distributor' }],
          error: null,
        }),
      }),
    })

    const scope = await resolveMcpScope({ from } as never, 'user-1', {
      profile_type: 'distributor',
    })
    expect(scope.profileType).toBe('distributor')
    expect(scope.distributorScope).toEqual({
      user_id: 'patron-1',
      profile_type_v2: 'distributor',
    })
  })
})
