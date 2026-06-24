import { getAuthUserId } from '@/lib/supabase/server'

export async function getClerkUserId(): Promise<string | null> {
  return getAuthUserId()
}

export async function requireClerkUserId(): Promise<string | null> {
  return getAuthUserId()
}
