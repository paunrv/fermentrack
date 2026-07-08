import type { SupabaseClient } from '@supabase/supabase-js'
import type { TeamConversationKind } from '@/lib/proof/team-chat-types'

export type TeamConversationRow = {
  id: string
  organization_id: string
  kind: TeamConversationKind
  title: string | null
  lote_id: string | null
  created_at: string
}

export async function fetchGeneralConversationId(
  sb: SupabaseClient,
  organizationId: string
): Promise<string | null> {
  const { data, error } = await sb
    .from('wm_conversaciones')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('kind', 'general')
    .maybeSingle()

  if (error) {
    if (error.code === '42P01') return null
    throw error
  }

  return data?.id ?? null
}

export async function ensureGeneralConversationId(
  sb: SupabaseClient,
  organizationId: string
): Promise<string> {
  const existing = await fetchGeneralConversationId(sb, organizationId)
  if (existing) return existing

  const { data, error } = await sb.rpc('ensure_wm_general_conversation', {
    p_organization_id: organizationId,
  })

  if (error) throw error
  if (typeof data === 'string' && data) return data

  const created = await fetchGeneralConversationId(sb, organizationId)
  if (!created) throw new Error('conversation_create_failed')
  return created
}
