import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearIdempotencyStoreForTests,
  getIdempotentResult,
  saveIdempotentResult,
} from '@/lib/mcp/idempotency'
import { assertMcpWriteAccess } from '@/lib/mcp/write-helpers'
import type { ResolvedMcpScope } from '@/lib/mcp/resolve-scope'
import { recepcionDraftSchema } from '@/lib/mcp/schemas/recepcion-draft'
import { winemakerTicketImportSchema } from '@/lib/mcp/schemas/winemaker-ticket'

describe('mcp idempotency', () => {
  beforeEach(() => {
    clearIdempotencyStoreForTests()
  })

  it('returns null when key is missing', () => {
    expect(getIdempotentResult('u1', 'create_pedido', undefined)).toBeNull()
  })

  it('replays cached result for duplicate key', () => {
    const result = {
      content: [{ type: 'text' as const, text: JSON.stringify({ ok: true, entityId: 'p1' }) }],
    }
    saveIdempotentResult('u1', 'create_pedido', 'key-abc', result)
    const replay = getIdempotentResult('u1', 'create_pedido', 'key-abc')
    expect(replay).not.toBeNull()
    const parsed = JSON.parse(replay!.content[0]!.text)
    expect(parsed.idempotent_replay).toBe(true)
    expect(parsed.entityId).toBe('p1')
  })
})

describe('assertMcpWriteAccess', () => {
  const base: ResolvedMcpScope = {
    profileType: 'winemaker',
    organizationId: 'org-1',
    distributorScope: null,
    availableProfiles: ['winemaker'],
    winemakerOrganizations: [{ id: 'org-1', name: 'Bodega', role: 'owner' }],
  }

  it('allows owner to write', () => {
    expect(() => assertMcpWriteAccess(base)).not.toThrow()
  })

  it('blocks viewer role', () => {
    expect(() =>
      assertMcpWriteAccess({
        ...base,
        winemakerOrganizations: [{ id: 'org-1', name: 'Bodega', role: 'viewer' }],
      })
    ).toThrow('Viewer role cannot call write tools')
  })

  it('skips check for distributor', () => {
    expect(() =>
      assertMcpWriteAccess({
        ...base,
        profileType: 'distributor',
        distributorScope: { user_id: 'u1', profile_type_v2: 'distributor' },
      })
    ).not.toThrow()
  })
})

describe('import schemas', () => {
  it('rejects recepcion draft without items', () => {
    const parsed = recepcionDraftSchema.safeParse({
      productor: 'Palenque Sur',
      items: [],
    })
    expect(parsed.success).toBe(false)
  })

  it('accepts valid winemaker ticket extraction', () => {
    const parsed = winemakerTicketImportSchema.safeParse({
      extraction: {
        supplier_name: 'Proveedor SA',
        total: 1200,
        lines: [{ supply_kind: 'botella', description: 'Botellas 750ml', amount: 1200 }],
      },
    })
    expect(parsed.success).toBe(true)
  })
})
