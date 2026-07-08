import type { SupabaseClient } from '@supabase/supabase-js'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { TeamChatFilter, TeamChatMessage } from '@/lib/proof/team-chat-types'
import { ensureGeneralConversationId } from '@/lib/proof/team-chat-conversations'

type RawTeamChatRow = {
  id: string
  organization_id: string
  conversation_id: string | null
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
      conversation_id: row.conversation_id,
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
  conversation_id,
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
    conversationId?: string | null
  }
): Promise<TeamChatMessage[]> {
  const limit = Math.max(1, Math.min(options?.limit ?? 80, 200))
  const conversationId =
    options?.conversationId ?? (await ensureGeneralConversationId(sb, organizationId))

  let query = sb
    .from('wm_mensajes')
    .select(TEAM_CHAT_SELECT)
    .eq('organization_id', organizationId)
    .eq('conversation_id', conversationId)
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

export async function fetchConversationLastReadAt(
  sb: SupabaseClient,
  conversationId: string,
  userId: string
): Promise<string | null> {
  const { data, error } = await sb
    .from('wm_conversacion_miembros')
    .select('last_read_at')
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    if (error.code === '42P01') return null
    throw error
  }
  return data?.last_read_at ?? null
}

/** @deprecated Org-level watermark — prefer conversation read state. */
export async function fetchTeamChatLastReadAt(
  sb: SupabaseClient,
  organizationId: string,
  memberId: string
): Promise<string | null> {
  const conversationId = await ensureGeneralConversationId(sb, organizationId)
  return fetchConversationLastReadAt(sb, conversationId, memberId)
}

export async function markConversationRead(
  sb: SupabaseClient,
  conversationId: string,
  userId: string,
  lastReadAt?: string
): Promise<void> {
  const ts = lastReadAt ?? new Date().toISOString()
  const { error } = await sb.from('wm_conversacion_miembros').upsert(
    {
      conversation_id: conversationId,
      user_id: userId,
      last_read_at: ts,
    },
    { onConflict: 'conversation_id,user_id' }
  )
  if (error) throw error
}

export async function markTeamChatRead(
  sb: SupabaseClient,
  organizationId: string,
  memberId: string,
  lastReadAt?: string
): Promise<void> {
  const conversationId = await ensureGeneralConversationId(sb, organizationId)
  await markConversationRead(sb, conversationId, memberId, lastReadAt)
}

export async function countConversationUnread(
  sb: SupabaseClient,
  conversationId: string,
  memberId: string
): Promise<number> {
  const lastReadAt = await fetchConversationLastReadAt(sb, conversationId, memberId)

  let query = sb
    .from('wm_mensajes')
    .select('id', { count: 'exact', head: true })
    .eq('conversation_id', conversationId)
    .neq('author_id', memberId)

  if (lastReadAt) {
    query = query.gt('created_at', lastReadAt)
  }

  const { count, error } = await query
  if (error) throw error
  return count ?? 0
}

export async function countTeamChatUnread(
  sb: SupabaseClient,
  organizationId: string,
  memberId: string
): Promise<number> {
  const conversationId = await ensureGeneralConversationId(sb, organizationId)
  return countConversationUnread(sb, conversationId, memberId)
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

type TeamChatInsertListener = (messageId: string) => void

type TeamChatChannelEntry = {
  channel: RealtimeChannel
  listeners: Set<TeamChatInsertListener>
  sb: SupabaseClient
}

/** One Realtime channel per conversation. */
const teamChatChannels = new Map<string, TeamChatChannelEntry>()

export function subscribeTeamChatMessages(
  sb: SupabaseClient,
  conversationId: string,
  onInsert: TeamChatInsertListener
): () => void {
  let entry = teamChatChannels.get(conversationId)

  if (!entry) {
    const listeners = new Set<TeamChatInsertListener>()
    const channel = sb
      .channel(`team-chat-conv-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'wm_mensajes',
          filter: `conversation_id=eq.${conversationId}`,
        },
        payload => {
          const id = (payload.new as { id?: string } | null)?.id
          if (!id) return
          for (const listener of listeners) {
            listener(id)
          }
        }
      )
      .subscribe()

    entry = { channel, listeners, sb }
    teamChatChannels.set(conversationId, entry)
  }

  entry.listeners.add(onInsert)

  return () => {
    const current = teamChatChannels.get(conversationId)
    if (!current) return
    current.listeners.delete(onInsert)
    if (current.listeners.size === 0) {
      void current.sb.removeChannel(current.channel)
      teamChatChannels.delete(conversationId)
    }
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
