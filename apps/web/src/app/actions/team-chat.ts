'use server'

import { getAuthUserId, createClient } from '@/lib/supabase/server'
import { fetchWinemakerOrganizationIdForUser } from '@/lib/supabase/organization'
import { fetchOrgFeatureSource } from '@/lib/proof/org-features'
import {
  recordTeamMessage,
  RecordTeamMessageError,
} from '@/lib/proof/record-team-message'
import type { SendTeamMessageInput, TeamChatMessage } from '@/lib/proof/team-chat-types'
import { ensureIdentityProfileForChat } from '@/app/actions/profile'

async function assertActiveOrgWriter(
  sb: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  organizationId: string
): Promise<void> {
  const { data, error } = await sb
    .from('organization_members')
    .select('role, status')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) throw new Error('no_organization')

  const role = data.role as string
  if (!['owner', 'admin', 'member'].includes(role)) {
    throw new Error('no_permission')
  }
}

export async function sendTeamMessageAction(
  input: SendTeamMessageInput
): Promise<TeamChatMessage> {
  const userId = await getAuthUserId()
  if (!userId) throw new Error('not_authenticated')

  const organizationId = input.organizationId?.trim()
  if (!organizationId) throw new Error('no_organization')

  const sb = await createClient()

  const resolvedOrgId = await fetchWinemakerOrganizationIdForUser(
    sb,
    userId,
    organizationId
  )
  if (!resolvedOrgId) throw new Error('no_organization')

  await assertActiveOrgWriter(sb, userId, resolvedOrgId)
  await ensureIdentityProfileForChat()

  const org = await fetchOrgFeatureSource(sb, resolvedOrgId)

  try {
    return await recordTeamMessage(sb, {
      body: input.body,
      loteId: input.loteId,
      organizationId: resolvedOrgId,
      authorId: userId,
      org,
    })
  } catch (err) {
    if (err instanceof RecordTeamMessageError) {
      throw new Error(err.code)
    }
    throw err
  }
}
