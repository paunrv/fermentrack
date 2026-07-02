import { createServiceSupabase } from '@/utils/supabase/service'

export type McpAuditStatus = 'success' | 'error' | 'replay'

export type McpAuditLogInput = {
  userId: string
  organizationId: string | null
  profileType: string
  toolName: string
  status: McpAuditStatus
  idempotencyKey?: string
  errorMessage?: string
}

export async function logMcpToolCall(input: McpAuditLogInput): Promise<void> {
  try {
    const sb = createServiceSupabase()
    const { error } = await sb.from('mcp_tool_calls').insert({
      user_id: input.userId,
      organization_id: input.organizationId,
      profile_type: input.profileType,
      tool_name: input.toolName,
      idempotency_key: input.idempotencyKey?.trim() || null,
      status: input.status,
      error_message: input.errorMessage?.slice(0, 500) || null,
    })
    if (error) {
      console.error('[mcp/audit] insert failed', error.message)
    }
  } catch (e) {
    console.error('[mcp/audit] unexpected error', e)
  }
}
