'use server'

import { auth } from '@clerk/nextjs/server'
import { createSupabaseForProofApi } from '@/utils/supabase/server-api'
import {
  createSkuCartera,
  resolveDistribuidorScope,
  updateSkuCartera,
  type SkuFormInput,
  type SkuRow,
} from '@/lib/supabase/distribuidor'
import type { ProfileScope } from '@/lib/supabase'

async function scopeFromAuth(
  sb: Awaited<ReturnType<typeof createSupabaseForProofApi>>['sb'],
  userId: string,
  profileType?: string
): Promise<ProfileScope> {
  const type = (profileType || 'distributor') as ProfileScope['profile_type_v2']
  if (type === 'distributor') {
    return resolveDistribuidorScope(sb, userId)
  }
  return { clerk_id: userId, profile_type_v2: type }
}

export async function crearSku(
  data: SkuFormInput & { profile_type_v2?: string }
): Promise<SkuRow> {
  const { userId } = await auth()
  if (!userId) throw new Error('No autenticado')

  const { profile_type_v2, ...input } = data
  const { sb } = await createSupabaseForProofApi()
  return createSkuCartera(sb, await scopeFromAuth(sb, userId, profile_type_v2), input)
}

export async function editarSku(
  id: string,
  data: Partial<SkuFormInput> & { profile_type_v2?: string }
): Promise<SkuRow> {
  const { userId } = await auth()
  if (!userId) throw new Error('No autenticado')

  const { profile_type_v2, ...input } = data
  const { sb } = await createSupabaseForProofApi()
  return updateSkuCartera(sb, await scopeFromAuth(sb, userId, profile_type_v2), id, input)
}
