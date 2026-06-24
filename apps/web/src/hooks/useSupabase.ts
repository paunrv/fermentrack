'use client'

import { useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'

/** Cliente Supabase con sesión de cookie (Supabase Auth). */
export function useSupabase(): SupabaseClient {
  return useMemo(() => createClient(), [])
}
