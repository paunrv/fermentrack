'use server'

import { getAuthUserId } from '@/lib/supabase/server'
import { createSupabaseForProofApi } from '@/utils/supabase/server-api'

export async function ensureClientEtiquetaAction(input: {
  client_id: string
  nombre: string
  profile_type_v2?: string
}): Promise<{ id: string; nombre: string }> {
  const userId = await getAuthUserId()
  if (!userId) throw new Error('No autenticado')

  const nombre = input.nombre.trim()
  if (!nombre) throw new Error('Escribe la etiqueta o marca')
  if (!input.client_id) throw new Error('Falta el cliente')

  const profileType = input.profile_type_v2 || 'distributor'
  const { sb } = await createSupabaseForProofApi()

  const { data: existing, error: findErr } = await sb
    .from('client_etiquetas')
    .select('id, nombre')
    .eq('client_id', input.client_id)
    .eq('user_id', userId)
    .eq('profile_type_v2', profileType)
    .ilike('nombre', nombre)
    .limit(1)
    .maybeSingle()

  if (findErr) throw new Error(findErr.message)
  if (existing) return { id: existing.id, nombre: existing.nombre }

  const { data: created, error: insErr } = await sb
    .from('client_etiquetas')
    .insert({
      client_id: input.client_id,
      nombre,
      user_id: userId,
      profile_type_v2: profileType,
    })
    .select('id, nombre')
    .single()

  if (insErr) throw new Error(insErr.message)
  return { id: created.id, nombre: created.nombre }
}
