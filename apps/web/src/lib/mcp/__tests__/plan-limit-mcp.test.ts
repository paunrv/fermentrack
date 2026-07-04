import { describe, expect, it } from 'vitest'
import {
  buildMcpPlanLimitPayload,
  isPlanLimitErrorCode,
  MCP_PLAN_UPGRADE_PATH,
  McpPlanLimitError,
  resourceFromPlanLimitCode,
} from '@/lib/mcp/plan-limit-mcp'

describe('plan-limit-mcp', () => {
  it('builds structured payload with upgrade path', () => {
    const payload = buildMcpPlanLimitPayload({
      ok: false,
      code: 'limit_reached',
      resource: 'etiquetas',
      current: 5,
      limit: 5,
      plan: 'regular',
    })

    expect(payload.error).toBe('plan_limit_reached')
    expect(payload.code).toBe('limit_reached_etiquetas')
    expect(payload.upgrade_path).toBe(MCP_PLAN_UPGRADE_PATH)
    expect(payload.data_safe).toBe(true)
    expect(payload.message).toContain('5/5')
  })

  it('serializes McpPlanLimitError as JSON message', () => {
    const err = McpPlanLimitError.fromBlocked({
      ok: false,
      code: 'limit_reached',
      resource: 'memoria',
      current: 12,
      limit: 12,
      plan: 'trial',
    })

    const parsed = JSON.parse(err.message)
    expect(parsed.resource).toBe('memoria')
    expect(parsed.upgrade_hint).toContain('Pro')
  })

  it('parses limit error codes', () => {
    expect(isPlanLimitErrorCode('limit_reached_lotes_activos')).toBe(true)
    expect(isPlanLimitErrorCode('lot_not_found')).toBe(false)
    expect(resourceFromPlanLimitCode('limit_reached_usuarios')).toBe('usuarios')
  })
})
