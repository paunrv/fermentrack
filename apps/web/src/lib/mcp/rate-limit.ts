type RateBucket = {
  count: number
  windowStartMs: number
}

const buckets = new Map<string, RateBucket>()

function windowMs(): number {
  const raw = Number(process.env.MCP_RATE_LIMIT_WINDOW_MS ?? 60_000)
  return Number.isFinite(raw) && raw > 0 ? raw : 60_000
}

function maxRequests(): number {
  const raw = Number(process.env.MCP_RATE_LIMIT_MAX ?? 120)
  return Number.isFinite(raw) && raw > 0 ? raw : 120
}

export type McpRateLimitResult = {
  allowed: boolean
  retryAfterSec: number
  limit: number
  remaining: number
}

export function checkMcpRateLimit(userId: string): McpRateLimitResult {
  const limit = maxRequests()
  const window = windowMs()
  const now = Date.now()
  const bucket = buckets.get(userId)

  if (!bucket || now - bucket.windowStartMs >= window) {
    buckets.set(userId, { count: 1, windowStartMs: now })
    return { allowed: true, retryAfterSec: 0, limit, remaining: limit - 1 }
  }

  if (bucket.count >= limit) {
    const retryAfterMs = window - (now - bucket.windowStartMs)
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil(retryAfterMs / 1000)),
      limit,
      remaining: 0,
    }
  }

  bucket.count += 1
  return {
    allowed: true,
    retryAfterSec: 0,
    limit,
    remaining: Math.max(0, limit - bucket.count),
  }
}

export function mcpRateLimitResponse(result: McpRateLimitResult): Response {
  return new Response(
    JSON.stringify({
      error: 'rate_limit_exceeded',
      message:
        'Too many MCP requests. Wait before retrying or reduce tool call frequency in your agent.',
      retry_after_seconds: result.retryAfterSec,
      limit: result.limit,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(result.retryAfterSec),
        'X-RateLimit-Limit': String(result.limit),
        'X-RateLimit-Remaining': String(result.remaining),
      },
    }
  )
}

/** Test helper */
export function clearMcpRateLimitForTests(): void {
  buckets.clear()
}
