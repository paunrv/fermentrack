import { permanentRedirect, redirect } from 'next/navigation'
import { PROOF_PROFILES_TABLE } from '@/lib/supabase'
import { createClient, getAuthUserId } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

async function isWinemakerUser(userId: string): Promise<boolean> {
  const sb = await createClient()

  const { data: profiles } = await sb
    .from(PROOF_PROFILES_TABLE)
    .select('profile_type_v2')
    .or(`user_id.eq.${userId},clerk_id.eq.${userId}`)

  if ((profiles ?? []).some(row => row.profile_type_v2 === 'winemaker')) {
    return true
  }

  const { data: memberships } = await sb
    .from('organization_members')
    .select('organizations(org_type)')
    .eq('user_id', userId)
    .eq('status', 'active')

  return (memberships ?? []).some(row => {
    const org = row.organizations as { org_type?: string } | { org_type?: string }[] | null
    const resolved = Array.isArray(org) ? org[0] : org
    return resolved?.org_type === 'winemaker'
  })
}

/** Legacy bookmark URL — winemaker → canonical detail; otros perfiles → lista brewer. */
export default async function LegacyLotDetailPage({ params }: { params: { id: string } }) {
  const userId = await getAuthUserId()
  if (!userId) {
    redirect(`/sign-in?next=${encodeURIComponent(`/dashboard/lotes/${params.id}`)}`)
  }

  if (await isWinemakerUser(userId)) {
    permanentRedirect(`/dashboard/winemaker/lotes/${params.id}`)
  }

  redirect('/dashboard/lotes')
}
