'use server'

import { getAuthUserId } from '@/lib/supabase/server'
import { fetchWinemakerOrganizationIdForUser } from '@/lib/supabase/organization'
import { fetchOrgFeatureSource } from '@/lib/proof/org-features'
import {
  recordTeamMessage,
  RecordTeamMessageError,
} from '@/lib/proof/record-team-message'
import type { SendTeamMessageInput, TeamChatMessage } from '@/lib/proof/team-chat-types'
import { createSupabaseForProofApi } from '@/utils/supabase/server-api'

export async function sendTeamMessageAction(
  input: SendTeamMessageInput
): Promise<TeamChatMessage> {
  const userId = await getAuthUserId()
  if (!userId) throw new Error('not_authenticated')

  const { sb } = await createSupabaseForProofApi()
  const organizationId = await fetchWinemakerOrganizationIdForUser(sb, userId)
  if (!organizationId) throw new Error('no_organization')

  const org = await fetchOrgFeatureSource(sb, organizationId)

  try {
    return await recordTeamMessage(sb, {
      ...input,
      organizationId,
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
