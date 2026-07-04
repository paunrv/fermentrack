'use server'

import { getAuthUserId } from '@/lib/supabase/server'
import { fetchWinemakerOrganizationIdForUser } from '@/lib/supabase/organization'
import { fetchOrgFeatureSource } from '@/lib/proof/org-features'
import {
  recordWmSalida,
  RecordWmSalidaError,
  type RegistrarSalidaInput,
  type RecordWmSalidaResult,
} from '@/lib/proof/record-wm-salida'
import { createSupabaseForProofApi } from '@/utils/supabase/server-api'

export async function recordWmSalidaAction(
  input: RegistrarSalidaInput
): Promise<RecordWmSalidaResult> {
  const userId = await getAuthUserId()
  if (!userId) throw new Error('not_authenticated')

  const { sb } = await createSupabaseForProofApi()
  const organizationId = await fetchWinemakerOrganizationIdForUser(sb, userId)
  if (!organizationId) throw new Error('no_organization')

  const org = await fetchOrgFeatureSource(sb, organizationId)

  try {
    return await recordWmSalida(sb, {
      ...input,
      organizationId,
      registradoPor: userId,
      org,
    })
  } catch (err) {
    if (err instanceof RecordWmSalidaError) {
      throw new Error(err.code)
    }
    throw err
  }
}
