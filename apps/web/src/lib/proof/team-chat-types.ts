/** Team chat (Epic C) — org channel + optional lote anchor. */

export const WM_MENSAJE_ORIGEN_VALUES = ['web', 'mcp'] as const
export type WmMensajeOrigen = (typeof WM_MENSAJE_ORIGEN_VALUES)[number]

export const WM_CONVERSACION_KIND_VALUES = ['general', 'dm', 'group', 'lote'] as const
export type TeamConversationKind = (typeof WM_CONVERSACION_KIND_VALUES)[number]

export const TEAM_CHAT_BODY_MAX = 4000

export type WmMensajeRow = {
  id: string
  organization_id: string
  conversation_id: string | null
  lote_id: string | null
  author_id: string
  body: string
  origen: WmMensajeOrigen
  created_at: string
}

export type WmMensajeLecturaRow = {
  organization_id: string
  member_id: string
  last_read_at: string
}

export type TeamChatAuthor = {
  id: string
  full_name: string | null
  avatar_url: string | null
}

export type TeamChatMessage = WmMensajeRow & {
  author: TeamChatAuthor
  lote_code: string | null
}

export type TeamConversation = {
  id: string
  organization_id: string
  kind: TeamConversationKind
  title: string | null
  lote_id: string | null
  created_at: string
}

export type TeamChatFilter = 'channel' | { loteId: string }

export type SendTeamMessageInput = {
  organizationId: string
  body: string
  loteId?: string | null
  conversationId?: string | null
}

export type TeamChatTarget =
  | { kind: 'general' }
  | { kind: 'dm'; peerUserId: string; peerName: string | null }

export type TeamMessageBodyInput = Pick<SendTeamMessageInput, 'body' | 'loteId'>
