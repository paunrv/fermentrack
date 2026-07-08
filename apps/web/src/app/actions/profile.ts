'use server'

import { getAuthUserId, createClient } from '@/lib/supabase/server'
import { createServiceSupabase } from '@/utils/supabase/service'
import { PROOF_PROFILES_TABLE } from '@/lib/supabase'
import {
  createWinemakerOrganization,
  fetchWinemakerOrganizations,
} from '@/lib/supabase/organization'
import { fetchPendingTeamInvite } from '@/app/actions/team-onboarding'

function defaultWineryName(email: string | undefined, fullName: string | undefined): string {
  const trimmedName = fullName?.trim()
  if (trimmedName) return trimmedName
  const local = email?.split('@')[0]?.trim()
  if (local) return local
  return 'Mi bodega'
}

/** Backfill winemaker proof_profiles for org owners created before profile upsert existed. */
export async function ensureWinemakerOwnerProfile(): Promise<{ created: boolean }> {
  const userId = await getAuthUserId()
  if (!userId) throw new Error('No autenticado')

  const sb = await createClient()
  const { data: existing, error: existingError } = await sb
    .from(PROOF_PROFILES_TABLE)
    .select('id')
    .or(`user_id.eq.${userId},clerk_id.eq.${userId}`)
    .eq('profile_type_v2', 'winemaker')
    .limit(1)

  if (existingError) throw new Error(existingError.message)
  if (existing?.length) return { created: false }

  const memberships = await fetchWinemakerOrganizations(sb, userId)
  if (!memberships.length) return { created: false }

  const { data: profileRow, error: profileError } = await sb
    .from('profiles')
    .select('full_name')
    .eq('id', userId)
    .maybeSingle()

  if (profileError) throw new Error(profileError.message)

  const orgName = memberships[0]?.organization.name ?? 'Winemaker'
  const displayName = profileRow?.full_name?.trim() || orgName

  const { data: authUser, error: authError } = await sb.auth.getUser()
  if (authError) throw new Error(authError.message)

  const service = createServiceSupabase()
  const { error: upsertError } = await service.from(PROOF_PROFILES_TABLE).upsert(
    {
      user_id: userId,
      clerk_id: userId,
      profile_type_v2: 'winemaker',
      profile_type: 'winemaker',
      username: displayName,
      onboarding_complete: true,
      email: authUser.user?.email ?? null,
      extra_profiles: [],
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,profile_type_v2' }
  )

  if (upsertError) throw new Error(upsertError.message)
  return { created: true }
}

/** New owner signups skip onboarding — org + winemaker profile are created on first dashboard load. */
export async function bootstrapWinemakerOwnerAccount(): Promise<{
  bootstrapped: boolean
  organizationId?: string
}> {
  const userId = await getAuthUserId()
  if (!userId) throw new Error('No autenticado')

  const pendingInvite = await fetchPendingTeamInvite()
  if (pendingInvite) return { bootstrapped: false }

  const sb = await createClient()

  const { data: existingProfiles, error: profileError } = await sb
    .from(PROOF_PROFILES_TABLE)
    .select('id')
    .or(`user_id.eq.${userId},clerk_id.eq.${userId}`)
    .limit(1)

  if (profileError) throw new Error(profileError.message)
  if (existingProfiles?.length) {
    await ensureWinemakerOwnerProfile()
    return { bootstrapped: false }
  }

  const memberships = await fetchWinemakerOrganizations(sb, userId)
  if (memberships.length) {
    await ensureWinemakerOwnerProfile()
    return { bootstrapped: false, organizationId: memberships[0]?.organization.id }
  }

  const { data: authUser, error: authError } = await sb.auth.getUser()
  if (authError) throw new Error(authError.message)

  const email = authUser.user?.email ?? undefined
  const fullName =
    typeof authUser.user?.user_metadata?.full_name === 'string'
      ? authUser.user.user_metadata.full_name
      : undefined

  const orgName = defaultWineryName(email, fullName)
  const org = await createWinemakerOrganization(sb, { name: orgName })

  const service = createServiceSupabase()
  const { error: upsertError } = await service.from(PROOF_PROFILES_TABLE).upsert(
    {
      user_id: userId,
      clerk_id: userId,
      profile_type_v2: 'winemaker',
      profile_type: 'winemaker',
      username: orgName,
      onboarding_complete: true,
      email: email ?? null,
      extra_profiles: [],
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,profile_type_v2' }
  )

  if (upsertError) throw new Error(upsertError.message)
  return { bootstrapped: true, organizationId: org.id }
}

/** wm_mensajes.author_id FK requires a row in public.profiles. */
export async function ensureIdentityProfileForChat(): Promise<void> {
  const userId = await getAuthUserId()
  if (!userId) throw new Error('No autenticado')

  const sb = await createClient()
  const { data: existing, error: existingError } = await sb
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle()

  if (existingError) throw new Error(existingError.message)
  if (existing?.id) return

  const { data: authUser, error: authError } = await sb.auth.getUser()
  if (authError) throw new Error(authError.message)

  const email = authUser.user?.email ?? ''
  const fullName =
    (typeof authUser.user?.user_metadata?.full_name === 'string'
      ? authUser.user.user_metadata.full_name
      : ''
    ).trim() || email.split('@')[0] || 'Usuario'

  const service = createServiceSupabase()
  const { error: insertError } = await service.from('profiles').upsert({
    id: userId,
    full_name: fullName,
    avatar_url: authUser.user?.user_metadata?.avatar_url ?? null,
  })

  if (insertError) throw new Error(insertError.message)
}
