import type { RecordTeamMessageErrorCode } from '@/lib/proof/record-team-message'

export const TEAM_CHAT_ERROR_CODES = [
  'empty_body',
  'body_too_long',
  'chat_not_allowed',
  'lote_not_found',
  'no_permission',
  'profile_missing',
  'chat_unavailable',
  'no_organization',
  'not_authenticated',
  'message_create_failed',
  'load_failed',
  'send_failed',
] as const

export type TeamChatErrorCode = (typeof TEAM_CHAT_ERROR_CODES)[number]

export function isTeamChatErrorCode(value: string): value is TeamChatErrorCode {
  return (TEAM_CHAT_ERROR_CODES as readonly string[]).includes(value)
}

export function mapPostgresInsertError(error: {
  code?: string
  message?: string
}): RecordTeamMessageErrorCode {
  const code = error.code ?? ''
  const message = (error.message ?? '').toLowerCase()

  if (code === '42501' || message.includes('row-level security')) {
    return 'no_permission'
  }
  if (code === '23503') {
    if (message.includes('author_id') || message.includes('profiles')) {
      return 'profile_missing'
    }
    return 'lote_not_found'
  }
  if (code === '42P01' || message.includes('wm_mensajes')) {
    return 'chat_unavailable'
  }
  if (message.includes('lote_org_mismatch')) {
    return 'lote_not_found'
  }

  return 'message_create_failed'
}
