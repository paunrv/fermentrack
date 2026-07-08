/** Team chat (Epic C) — org channel + optional lote anchor. */

export const WM_MENSAJE_ORIGEN_VALUES = ['web', 'mcp'] as const
export type WmMensajeOrigen = (typeof WM_MENSAJE_ORIGEN_VALUES)[number]

export const TEAM_CHAT_BODY_MAX = 4000

export type WmMensajeRow = {
  id: string
  organization_id: string
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

export type TeamChatFilter = 'channel' | { loteId: string }

export type SendTeamMessageInput = {
  organizationId: string
  body: string
  loteId?: string | null
}
