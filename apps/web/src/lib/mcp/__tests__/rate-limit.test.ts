import { beforeEach, describe, expect, it } from 'vitest'
import {
  checkMcpRateLimit,
  clearMcpRateLimitForTests,
  mcpRateLimitResponse,
} from '@/lib/mcp/rate-limit'

describe('mcp rate limit', () => {
  beforeEach(() => {
    clearMcpRateLimitForTests()
    process.env.MCP_RATE_LIMIT_MAX = '3'
    process.env.MCP_RATE_LIMIT_WINDOW_MS = '60_000'
  })

  it('allows requests under the limit', () => {
    expect(checkMcpRateLimit('user-1').allowed).toBe(true)
    expect(checkMcpRateLimit('user-1').allowed).toBe(true)
    expect(checkMcpRateLimit('user-1').remaining).toBe(0)
  })

  it('returns 429 when limit exceeded', () => {
    checkMcpRateLimit('user-2')
    checkMcpRateLimit('user-2')
    checkMcpRateLimit('user-2')
    const blocked = checkMcpRateLimit('user-2')
    expect(blocked.allowed).toBe(false)
    expect(blocked.retryAfterSec).toBeGreaterThan(0)

    const res = mcpRateLimitResponse(blocked)
    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBeTruthy()
  })

  it('tracks buckets per user', () => {
    checkMcpRateLimit('a')
    checkMcpRateLimit('a')
    checkMcpRateLimit('a')
    expect(checkMcpRateLimit('a').allowed).toBe(false)
    expect(checkMcpRateLimit('b').allowed).toBe(true)
  })
})
