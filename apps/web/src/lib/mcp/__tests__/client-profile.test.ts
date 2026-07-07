import { describe, expect, it } from 'vitest'
import { resolveMcpClientProfileType } from '@/lib/mcp/client-profile'

describe('resolveMcpClientProfileType', () => {
  it('uses winemaker MCP scope when shell is winemaker even with distributor profile row', () => {
    expect(
      resolveMcpClientProfileType({
        profileType: 'winemaker',
        orgType: 'winemaker',
      })
    ).toBe('winemaker')
  })

  it('uses distributor MCP scope when shell is distributor', () => {
    expect(
      resolveMcpClientProfileType({
        profileType: 'distributor',
        orgType: 'winemaker',
      })
    ).toBe('distributor')
  })

  it('falls back to winemaker org when only org tenancy exists', () => {
    expect(
      resolveMcpClientProfileType({
        profileType: undefined,
        orgType: 'winemaker',
      })
    ).toBe('winemaker')
  })
})
