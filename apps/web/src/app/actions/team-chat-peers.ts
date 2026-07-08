'use server'

import { getAuthUserId, createClient } from '@/lib/supabase/server'
import { createServiceSupabase } from '@/utils/supabase/service'

export type ChatPeer = {
  userId: string
  fullName: string | null
  orgRole: string
}

function displayNameFromSources(opts: {
  fullName: string | null | undefined
  email: string | null | undefined
}): string | null {
  const name = opts.fullName?.trim()
  if (name) {
    // Prefer first name for compact chip labels
    return name.split(/\s+/)[0] ?? name
  }
  const local = opts.email?.split('@')[0]?.trim()
  return local || null
}

/** Active org members for the chat switcher (excludes current user). */
export async function fetchChatPeers(organizationId: string): Promise<ChatPeer[]> {
  const userId = await getAuthUserId()
  if (!userId || !organizationId) return []

  const sbUser = await createClient()
  const { data: membership, error: membershipError } = await sbUser
    .from('organization_members')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle()

  if (membershipError) throw new Error(membershipError.message)
  if (!membership) return []

  // profiles RLS only allows reading own row — use service role for teammate names
  const sb = createServiceSupabase()
  const { data: members, error } = await sb
    .from('organization_members')
    .select('user_id, role')
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)
  if (!members?.length) return []

  const peerIds = members.map(m => m.user_id as string).filter(id => id !== userId)
  if (!peerIds.length) return []

  const { data: profiles, error: profilesError } = await sb
    .from('profiles')
    .select('id, full_name')
    .in('id', peerIds)

  if (profilesError) throw new Error(profilesError.message)

  const nameById = new Map(
    (profiles ?? []).map(p => [p.id as string, (p.full_name as string | null) ?? null])
  )
  const roleById = new Map(members.map(m => [m.user_id as string, m.role as string]))
  const emailById = new Map<string, string | null>()

  for (const peerId of peerIds) {
    const { data: authUser, error: authError } = await sb.auth.admin.getUserById(peerId)
    if (authError) {
      emailById.set(peerId, null)
      continue
    }
    emailById.set(peerId, authUser.user.email ?? null)
  }

  return peerIds.map(id => ({
    userId: id,
    fullName: displayNameFromSources({
      fullName: nameById.get(id),
      email: emailById.get(id),
    }),
    orgRole: roleById.get(id) ?? 'member',
  }))
}
