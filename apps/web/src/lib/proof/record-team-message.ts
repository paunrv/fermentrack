import type { SupabaseClient } from '@supabase/supabase-js'
import { orgHasFeature } from '@/lib/proof/org-features'
import type { OrgFeatureSource } from '@/lib/proof/org-features'
import {
  TEAM_CHAT_BODY_MAX,
  type SendTeamMessageInput,
  type TeamChatMessage,
  type WmMensajeOrigen,
} from '@/lib/proof/team-chat-types'
import { mapTeamChatRows } from '@/lib/proof/team-chat'

export type RecordTeamMessageParams = SendTeamMessageInput & {
  organizationId: string
  authorId: string
  origen?: WmMensajeOrigen
  org: OrgFeatureSource
}

export type RecordTeamMessageValidationCode =
  | 'empty_body'
  | 'body_too_long'
  | 'chat_not_allowed'

export type RecordTeamMessageErrorCode =
  | RecordTeamMessageValidationCode
  | 'lote_not_found'
  | 'message_create_failed'

export class RecordTeamMessageError extends Error {
  constructor(public code: RecordTeamMessageErrorCode) {
    super(code)
    this.name = 'RecordTeamMessageError'
  }
}

export function validateTeamMessageInput(
  input: SendTeamMessageInput
): { ok: true; body: string } | { ok: false; code: RecordTeamMessageValidationCode } {
  const body = input.body.trim()
  if (!body) return { ok: false, code: 'empty_body' }
  if (body.length > TEAM_CHAT_BODY_MAX) return { ok: false, code: 'body_too_long' }
  return { ok: true, body }
}

export async function recordTeamMessage(
  sb: SupabaseClient,
  params: RecordTeamMessageParams
): Promise<TeamChatMessage> {
  if (!orgHasFeature(params.org, 'chat')) {
    throw new RecordTeamMessageError('chat_not_allowed')
  }

  const validated = validateTeamMessageInput(params)
  if (!validated.ok) throw new RecordTeamMessageError(validated.code)

  const loteId = params.loteId?.trim() || null
  if (loteId) {
    const { data: lot, error: lotError } = await sb
      .from('lots')
      .select('id')
      .eq('id', loteId)
      .eq('organization_id', params.organizationId)
      .maybeSingle()

    if (lotError) throw lotError
    if (!lot) throw new RecordTeamMessageError('lote_not_found')
  }

  const { data, error } = await sb
    .from('wm_mensajes')
    .insert({
      organization_id: params.organizationId,
      lote_id: loteId,
      author_id: params.authorId,
      body: validated.body,
      origen: params.origen ?? 'web',
    })
    .select(
      `
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
    )
    .single()

  if (error || !data) throw new RecordTeamMessageError('message_create_failed')

  const [message] = mapTeamChatRows([data as never])
  if (!message) throw new RecordTeamMessageError('message_create_failed')
  return message
}
