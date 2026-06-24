import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

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

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(requireSupabaseUrl(), requireAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // Server Component — cookies are read-only
        }
      },
    },
  })
}

export async function getAuthUserId(): Promise<string | null> {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) return null
  return user.id
}
