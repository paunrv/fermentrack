'use server'

import { createClient, getAuthUserId } from '@/lib/supabase/server'
import {
  fetchLotBottlingContext,
  recordLotBottling,
  RecordLotBottlingError,
  type LotBottlingInput,
  type RecordLotBottlingResult,
} from '@/lib/proof/record-lot-bottling'
import { resolveWinemakerOrgForUser } from '@/app/actions/organization'

export async function fetchLotBottlingContextAction(lotId: string) {
  const userId = await getAuthUserId()
  if (!userId) throw new Error('not_authenticated')

  const organizationId = await resolveWinemakerOrgForUser()
  if (!organizationId) throw new Error('no_organization')

  const sb = await createClient()
  return fetchLotBottlingContext(sb, organizationId, lotId)
}

export async function recordLotBottlingAction(
  input: LotBottlingInput
): Promise<RecordLotBottlingResult> {
  const userId = await getAuthUserId()
  if (!userId) throw new Error('not_authenticated')

  const organizationId = await resolveWinemakerOrgForUser()
  if (!organizationId) throw new Error('no_organization')

  const sb = await createClient()
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
