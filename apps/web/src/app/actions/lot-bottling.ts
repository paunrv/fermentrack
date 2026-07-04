'use server'

import { getAuthUserId } from '@/lib/supabase/server'
import { fetchWinemakerOrganizationIdForUser } from '@/lib/supabase/organization'
import {
  fetchLotBottlingContext,
  recordLotBottling,
  RecordLotBottlingError,
  type LotBottlingInput,
  type RecordLotBottlingResult,
} from '@/lib/proof/record-lot-bottling'
import { createSupabaseForProofApi } from '@/utils/supabase/server-api'

export async function fetchLotBottlingContextAction(lotId: string) {
  const userId = await getAuthUserId()
  if (!userId) throw new Error('not_authenticated')

  const { sb } = await createSupabaseForProofApi()
  const organizationId = await fetchWinemakerOrganizationIdForUser(sb, userId)
  if (!organizationId) throw new Error('no_organization')

  return fetchLotBottlingContext(sb, organizationId, lotId)
}

export async function recordLotBottlingAction(
  input: LotBottlingInput
): Promise<RecordLotBottlingResult> {
  const userId = await getAuthUserId()
  if (!userId) throw new Error('not_authenticated')

  const { sb } = await createSupabaseForProofApi()
  const organizationId = await fetchWinemakerOrganizationIdForUser(sb, userId)
  if (!organizationId) throw new Error('no_organization')

  try {
    return await recordLotBottling(sb, {
      ...input,
      organizationId,
      actorUserId: userId,
    })
  } catch (err) {
    if (err instanceof RecordLotBottlingError) {
      throw new Error(err.code)
    }
    throw err
  }
}
