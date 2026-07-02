import { describe, expect, it } from 'vitest'
import { verifyMcpBearerToken } from '@/lib/mcp/auth'

describe('verifyMcpBearerToken', () => {
  it('rejects missing bearer token', async () => {
    const result = await verifyMcpBearerToken(new Request('http://localhost/api/mcp'))
    expect(result).toBeUndefined()
  })

  it('rejects empty bearer token', async () => {
    const result = await verifyMcpBearerToken(
      new Request('http://localhost/api/mcp'),
      '   '
    )
    expect(result).toBeUndefined()
  })
})
