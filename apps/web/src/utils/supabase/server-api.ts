import { createClient } from '@/lib/supabase/server'
import { createServiceSupabase } from '@/utils/supabase/service'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Cliente Supabase para API routes PROOF.
 * Prefiere service role; si no está en .env, usa sesión Supabase Auth + RLS.
 */
export async function createSupabaseForProofApi(): Promise<{
  sb: SupabaseClient
  mode: 'service_role' | 'user_session'
}> {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { sb: createServiceSupabase(), mode: 'service_role' }
  }

  const sb = await createClient()
  const {
    data: { user },
    error,
  } = await sb.auth.getUser()
  if (error || !user) {
    throw new Error('No autenticado. Inicia sesión o configura SUPABASE_SERVICE_ROLE_KEY.')
  }

  return { sb, mode: 'user_session' }
}
