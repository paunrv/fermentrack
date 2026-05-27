import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

export type AccessTokenFn = () => Promise<string | null>

/** Cliente browser; pasar accessToken de Clerk (template `supabase`). */
export function createSupabaseBrowserClient(
  accessToken?: AccessTokenFn
): SupabaseClient {
  if (!accessToken) {
    return createBrowserClient(supabaseUrl, supabaseKey)
  }

  return createBrowserClient(supabaseUrl, supabaseKey, {
    accessToken: async () => (await accessToken()) ?? null,
  })
}
