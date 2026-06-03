import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

export type AccessTokenFn = () => Promise<string | null>

/** Cliente browser; pasar accessToken de Clerk (template `supabase`). */
export function createSupabaseBrowserClient(
  accessToken?: AccessTokenFn
): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const rawKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!supabaseUrl || !rawKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  // During SSR/build, this module can be imported and the hook can run even for "client" components.
  // If Vercel has the new `sb_publishable_...` format wired into ANON/PUBLISHABLE, Supabase will
  // try to decode it as JWT and crash with atob(). Avoid crashing builds by only using a JWT-like
  // placeholder on the server; the real client will be created in the browser after hydration.
  const isServer = typeof window === 'undefined'
  const supabaseKey = isServer
    ? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.signature'
    : rawKey

  if (!accessToken) {
    return createBrowserClient(supabaseUrl, supabaseKey)
  }

  // No singleton: @supabase/ssr reutiliza el primer cliente del tab; si se creó sin
  // accessToken, las peticiones quedan como anon aunque el hook pase JWT después.
  return createBrowserClient(supabaseUrl, supabaseKey, {
    isSingleton: false,
    accessToken: async () => (await accessToken()) ?? null,
  })
}

/** Cliente de un solo request con JWT Clerk ya resuelto (evita race en submit). */
export function createSupabaseBrowserClientWithToken(token: string): SupabaseClient {
  return createSupabaseBrowserClient(async () => token)
}
