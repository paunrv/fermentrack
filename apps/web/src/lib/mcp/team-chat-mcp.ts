import type { TeamChatMessage } from '@/lib/proof/team-chat-types'

export function formatMensajesForMcp(messages: TeamChatMessage[]) {
  return messages.map(message => ({
    id: message.id,
    body: message.body,
    author_id: message.author_id,
    author_name: message.author.full_name,
    lote_id: message.lote_id,
    lote_code: message.lote_code,
    origen: message.origen,
    created_at: message.created_at,
  }))
}
