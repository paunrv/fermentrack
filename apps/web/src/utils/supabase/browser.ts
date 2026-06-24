/** @deprecated Usa `createClient` desde `@/lib/supabase/client`. */
export { createClient as createSupabaseBrowserClient } from '@/lib/supabase/client'

import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'

/** @deprecated La sesión viaja en cookies; usa `createClient()`. */
export function createSupabaseBrowserClientWithToken(_token: string): SupabaseClient {
  return createClient()
}
