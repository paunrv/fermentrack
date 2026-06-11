'use server'

import { auth } from '@clerk/nextjs/server'
import { createSupabaseForProofApi } from '@/utils/supabase/server-api'
import {
  createClienteCartera,
  fetchClienteCarteraById,
  fetchClientesCartera,
  updateClienteCartera,
  type ClienteConSaldo,
  type ClienteDetalle,
  type ClienteFormInput,
  type ClienteRow,
} from '@/lib/supabase/distribuidor'
import type { ProfileScope } from '@/lib/supabase'

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

function scopeFromAuth(
  userId: string,
  profileType?: string
): ProfileScope {
  return {
    clerk_id: userId,
    profile_type_v2: (profileType || 'distributor') as ProfileScope['profile_type_v2'],
  }
}

export async function crearCliente(
  data: ClienteFormInput & { profile_type_v2?: string }
): Promise<ClienteRow> {
  const { userId } = await auth()
  if (!userId) throw new Error('No autenticado')

  const { profile_type_v2, ...input } = data
  const { sb } = await createSupabaseForProofApi()
  return createClienteCartera(sb, scopeFromAuth(userId, profile_type_v2), input)
}

export async function editarCliente(
  id: string,
  data: Partial<ClienteFormInput> & { profile_type_v2?: string; activo?: boolean }
): Promise<ClienteRow> {
  const { userId } = await auth()
  if (!userId) throw new Error('No autenticado')

  const { profile_type_v2, ...input } = data
  const { sb } = await createSupabaseForProofApi()
  return updateClienteCartera(sb, scopeFromAuth(userId, profile_type_v2), id, input)
}

export async function obtenerClientes(input?: {
  profile_type_v2?: string
}): Promise<ClienteConSaldo[]> {
  const { userId } = await auth()
  if (!userId) throw new Error('No autenticado')

  const { sb } = await createSupabaseForProofApi()
  return fetchClientesCartera(sb, scopeFromAuth(userId, input?.profile_type_v2))
}

export async function obtenerCliente(
  id: string,
  input?: { profile_type_v2?: string }
): Promise<ClienteDetalle | null> {
  const { userId } = await auth()
  if (!userId) throw new Error('No autenticado')

  const { sb } = await createSupabaseForProofApi()
  return fetchClienteCarteraById(sb, scopeFromAuth(userId, input?.profile_type_v2), id)
}
