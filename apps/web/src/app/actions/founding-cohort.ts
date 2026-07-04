'use server'

import { FOUNDING_COHORT_MAX } from '@/lib/billing/founding-cohort'
import { createClient, getAuthUserId } from '@/lib/supabase/server'
import { PROOF_PROFILES_TABLE, SUPER_USER_EMAIL } from '@/lib/supabase'
import { createServiceSupabase } from '@/utils/supabase/service'

async function requireSuperUser(): Promise<string> {
  const userId = await getAuthUserId()
  if (!userId) throw new Error('No autenticado')

  const sb = await createClient()
  const { data: authUser } = await sb.auth.getUser()
  const email = authUser.user?.email?.toLowerCase() ?? ''

  if (email === SUPER_USER_EMAIL.toLowerCase()) return userId

  const { data: profiles, error } = await sb
    .from(PROOF_PROFILES_TABLE)
    .select('is_super_user')
    .eq('user_id', userId)

  if (error) throw new Error(error.message)
  if (profiles?.some(p => p.is_super_user)) return userId

  throw new Error('Solo super user puede gestionar la cohorte fundadora')
}

export type MarkFoundingMemberResult =
  | { ok: true; foundingMemberAt: string }
  | { ok: false; error: string }

/** Mark org as founding cohort member (max 30). Requires super user + service role. */
export async function markOrganizationFoundingMemberAction(
  organizationId: string
): Promise<MarkFoundingMemberResult> {
  try {
    await requireSuperUser()

    const admin = createServiceSupabase()

    const { data: org, error: orgError } = await admin
      .from('organizations')
      .select('id, founding_member_at')
      .eq('id', organizationId)
      .maybeSingle()

    if (orgError) return { ok: false, error: orgError.message }
    if (!org) return { ok: false, error: 'Organización no encontrada' }
    if (org.founding_member_at) {
      return { ok: true, foundingMemberAt: String(org.founding_member_at) }
    }

    const { count, error: countError } = await admin
      .from('organizations')
      .select('id', { count: 'exact', head: true })
      .not('founding_member_at', 'is', null)

    if (countError) return { ok: false, error: countError.message }
    if ((count ?? 0) >= FOUNDING_COHORT_MAX) {
      return { ok: false, error: `Cohorte fundadora llena (máx. ${FOUNDING_COHORT_MAX})` }
    }

    const foundingMemberAt = new Date().toISOString()
    const { error: updateError } = await admin
      .from('organizations')
      .update({ founding_member_at: foundingMemberAt })
      .eq('id', organizationId)

    if (updateError) return { ok: false, error: updateError.message }

    return { ok: true, foundingMemberAt }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Error al marcar cohorte fundadora' }
  }
}

export async function countFoundingMembersAction(): Promise<number> {
  await requireSuperUser()
  const admin = createServiceSupabase()
  const { count, error } = await admin
    .from('organizations')
    .select('id', { count: 'exact', head: true })
    .not('founding_member_at', 'is', null)
  if (error) throw new Error(error.message)
  return count ?? 0
}
