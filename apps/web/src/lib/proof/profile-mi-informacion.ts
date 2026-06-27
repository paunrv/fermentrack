import type { SupabaseClient } from '@supabase/supabase-js'
import type { Profile } from '@/lib/supabase'
import { PROOF_PROFILES_TABLE } from '@/lib/supabase'

const MI_INFORMACION_SELECT =
  'user_id, profile_type_v2, profile_type, username, onboarding_complete, is_super_user, extra_profiles, email, cuenta_deposito, banco_deposito, titular_cuenta, constancia_fiscal_path'

/** Perfil distributor del scope (patrón u org) donde viven cuenta y constancia fiscal. */
export async function fetchMiInformacionProfile(
  sb: SupabaseClient,
  scopeUserId: string
): Promise<Profile | null> {
  const { data, error } = await sb
    .from(PROOF_PROFILES_TABLE)
    .select(MI_INFORMACION_SELECT)
    .eq('user_id', scopeUserId)
    .eq('profile_type_v2', 'distributor')
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  return {
    ...data,
    user_id: data.user_id ?? (data as { clerk_id?: string }).clerk_id,
    extra_profiles: (data.extra_profiles || []) as Profile['extra_profiles'],
    is_super_user: Boolean(data.is_super_user),
    onboarding_complete: Boolean(data.onboarding_complete),
  } as Profile
}

export function mergeMiInformacionIntoProfile(
  active: Profile,
  scopeRow: Profile | null
): Profile {
  if (!scopeRow) return active
  return {
    ...active,
    cuenta_deposito: scopeRow.cuenta_deposito ?? null,
    banco_deposito: scopeRow.banco_deposito ?? null,
    titular_cuenta: scopeRow.titular_cuenta ?? null,
    constancia_fiscal_path: scopeRow.constancia_fiscal_path ?? null,
  }
}
