'use server'

import { auth } from '@clerk/nextjs/server'
import { createSupabaseForProofApi } from '@/utils/supabase/server-api'

export async function ensureClientAction(input: {
  name: string
  profile_type_v2?: string
}): Promise<{ id: string; name: string }> {
  const { userId } = await auth()
  if (!userId) throw new Error('No autenticado')

  const name = input.name.trim()
  if (!name) throw new Error('Escribe el nombre del cliente')

  const profileType = input.profile_type_v2 || 'distributor'
  const { sb } = await createSupabaseForProofApi()

  const { data: existing, error: findErr } = await sb
    .from('clients')
    .select('id, name')
    .eq('clerk_id', userId)
    .eq('profile_type_v2', profileType)
    .ilike('name', name)
    .limit(1)
    .maybeSingle()

  if (findErr) throw new Error(findErr.message)
  if (existing) return { id: existing.id, name: existing.name }

  const row: Record<string, unknown> = {
    name,
    clerk_id: userId,
    type: 'tienda',
    price_tier: 'regular',
  }
  if (profileType) row.profile_type_v2 = profileType

  const { data: created, error: insErr } = await sb
    .from('clients')
    .insert(row)
    .select('id, name')
    .single()

  if (insErr) throw new Error(insErr.message)
  return { id: created.id, name: created.name }
}
