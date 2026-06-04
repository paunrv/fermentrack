import { auth } from '@clerk/nextjs/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createServiceSupabase } from '@/utils/supabase/service'

function requireSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
  return url
}

function requireAnonKey(): string {
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY')
  return key
}

/**
 * Cliente Supabase para API routes PROOF.
 * Prefiere service role; si no está en .env, usa JWT Clerk (template `supabase`) + RLS.
 */
export async function createSupabaseForProofApi(): Promise<{
  sb: SupabaseClient
  mode: 'service_role' | 'clerk_jwt'
}> {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { sb: createServiceSupabase(), mode: 'service_role' }
  }

  const { getToken } = await auth()
  const token = await getToken({ template: 'supabase' })
  if (!token) {
    throw new Error(
      'Sin JWT Supabase. Configura SUPABASE_SERVICE_ROLE_KEY o la plantilla Clerk "supabase".'
    )
  }

  const sb = createClient(requireSupabaseUrl(), requireAnonKey(), {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  return { sb, mode: 'clerk_jwt' }
}
