import { createBrowserClient } from '@supabase/ssr'

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

export function createClient() {
  return createBrowserClient(requireSupabaseUrl(), requireAnonKey())
}
