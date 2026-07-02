import type { McpToolResult } from '@/lib/mcp/tool-helpers'

const TTL_MS = 24 * 60 * 60 * 1000

type Entry = {
  result: McpToolResult
  expiresAt: number
}

const store = new Map<string, Entry>()

function cacheKey(userId: string, tool: string, idempotencyKey: string): string {
  return `${userId}:${tool}:${idempotencyKey}`
}

export function getIdempotentResult(
  userId: string,
  tool: string,
  idempotencyKey: string | undefined
): McpToolResult | null {
  if (!idempotencyKey?.trim()) return null
  const key = cacheKey(userId, tool, idempotencyKey.trim())
  const entry = store.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    store.delete(key)
    return null
  }
  const cached = entry.result.content[0]?.text
  if (!cached) return entry.result
  const parsed = JSON.parse(cached) as Record<string, unknown>
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ ...parsed, idempotent_replay: true }, null, 2),
      },
    ],
  }
}

export function saveIdempotentResult(
  userId: string,
  tool: string,
  idempotencyKey: string | undefined,
  result: McpToolResult
): void {
  if (!idempotencyKey?.trim()) return
  const key = cacheKey(userId, tool, idempotencyKey.trim())
  store.delete(key)
  store.set(key, { result, expiresAt: Date.now() + TTL_MS })
}

export function clearIdempotencyStoreForTests(): void {
  store.clear()
}
