import type { SupabaseClient } from '@supabase/supabase-js'
import type { Profile } from '@/lib/supabase'

const MI_INFORMACION_SELECT =
  'clerk_id, profile_type_v2, profile_type, username, onboarding_complete, is_super_user, extra_profiles, email, cuenta_deposito, banco_deposito, titular_cuenta, constancia_fiscal_path'

/** Perfil distributor del scope (patrón u org) donde viven cuenta y constancia fiscal. */
export async function fetchMiInformacionProfile(
  sb: SupabaseClient,
  scopeClerkId: string
): Promise<Profile | null> {
  const { data, error } = await sb
    .from('profiles')
    .select(MI_INFORMACION_SELECT)
    .eq('clerk_id', scopeClerkId)
    .eq('profile_type_v2', 'distributor')
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  return {
    ...data,
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
