import type { SupabaseClient } from '@supabase/supabase-js'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { TeamChatFilter, TeamChatMessage } from '@/lib/proof/team-chat-types'

type RawTeamChatRow = {
  id: string
  organization_id: string
  lote_id: string | null
  author_id: string
  body: string
  origen: TeamChatMessage['origen']
  created_at: string
  author?: TeamChatMessage['author'] | TeamChatMessage['author'][] | null
  lot?: { code: string } | { code: string }[] | null
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

export function mapTeamChatRows(rows: RawTeamChatRow[]): TeamChatMessage[] {
  return rows.map(row => {
    const author = firstRelation(row.author)
    const lot = firstRelation(row.lot)
    return {
      id: row.id,
      organization_id: row.organization_id,
      lote_id: row.lote_id,
      author_id: row.author_id,
      body: row.body,
      origen: row.origen,
      created_at: row.created_at,
      author: {
        id: author?.id ?? row.author_id,
        full_name: author?.full_name ?? null,
        avatar_url: author?.avatar_url ?? null,
      },
      lote_code: lot?.code ?? null,
    }
  })
}

const TEAM_CHAT_SELECT = `
  id,
  organization_id,
  lote_id,
  author_id,
  body,
  origen,
  created_at,
  author:profiles!wm_mensajes_author_id_fkey ( id, full_name, avatar_url ),
  lot:lots ( code )
`

export async function fetchTeamChatMessages(
  sb: SupabaseClient,
  organizationId: string,
  options?: {
    filter?: TeamChatFilter
    limit?: number
    since?: string
  }
): Promise<TeamChatMessage[]> {
  const limit = Math.max(1, Math.min(options?.limit ?? 80, 200))
  let query = sb
    .from('wm_mensajes')
    .select(TEAM_CHAT_SELECT)
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: true })
    .limit(limit)

  const filter = options?.filter
  if (filter && filter !== 'channel') {
    query = query.eq('lote_id', filter.loteId)
  }

  if (options?.since) {
    query = query.gt('created_at', options.since)
  }

  const { data, error } = await query
  if (error) throw error
  return mapTeamChatRows((data ?? []) as RawTeamChatRow[])
}

export async function fetchTeamChatLastReadAt(
  sb: SupabaseClient,
  organizationId: string,
  memberId: string
): Promise<string | null> {
  const { data, error } = await sb
    .from('wm_mensajes_lectura')
    .select('last_read_at')
    .eq('organization_id', organizationId)
    .eq('member_id', memberId)
    .maybeSingle()

  if (error) throw error
  return data?.last_read_at ?? null
}

export async function markTeamChatRead(
  sb: SupabaseClient,
  organizationId: string,
  memberId: string,
  lastReadAt?: string
): Promise<void> {
  const ts = lastReadAt ?? new Date().toISOString()
  const { error } = await sb.from('wm_mensajes_lectura').upsert(
    {
      organization_id: organizationId,
      member_id: memberId,
      last_read_at: ts,
    },
    { onConflict: 'organization_id,member_id' }
  )
  if (error) throw error
}

export async function countTeamChatUnread(
  sb: SupabaseClient,
  organizationId: string,
  memberId: string
): Promise<number> {
  const lastReadAt = await fetchTeamChatLastReadAt(sb, organizationId, memberId)

  let query = sb
    .from('wm_mensajes')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .neq('author_id', memberId)

  if (lastReadAt) {
    query = query.gt('created_at', lastReadAt)
  }

  const { count, error } = await query
  if (error) throw error
  return count ?? 0
}

export async function fetchLotCodeMap(
  sb: SupabaseClient,
  organizationId: string
): Promise<Record<string, string>> {
  const { data, error } = await sb
    .from('lots')
    .select('id, code')
    .eq('organization_id', organizationId)
    .limit(500)

  if (error) throw error

  const map: Record<string, string> = {}
  for (const row of data ?? []) {
    map[row.code.toUpperCase()] = row.id
  }
  return map
}

export function subscribeTeamChatMessages(
  sb: SupabaseClient,
  organizationId: string,
  onInsert: (messageId: string) => void
): () => void {
  const channel: RealtimeChannel = sb
    .channel(`team-chat-${organizationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'wm_mensajes',
        filter: `organization_id=eq.${organizationId}`,
      },
      payload => {
        const id = (payload.new as { id?: string } | null)?.id
        if (id) onInsert(id)
      }
    )
    .subscribe()

  return () => {
    void sb.removeChannel(channel)
  }
}

export async function fetchTeamChatMessageById(
  sb: SupabaseClient,
  messageId: string
): Promise<TeamChatMessage | null> {
  const { data, error } = await sb
    .from('wm_mensajes')
    .select(TEAM_CHAT_SELECT)
    .eq('id', messageId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null
  const [message] = mapTeamChatRows([data as RawTeamChatRow])
  return message ?? null
}
