'use client'

import { useAuth } from '@clerk/nextjs'
import { useMemo } from 'react'
import { createSupabaseBrowserClient } from '@/utils/supabase/browser'
import type { SupabaseClient } from '@supabase/supabase-js'

let warnedNoTemplate = false

/**
 * Cliente Supabase autenticado con JWT Clerk (Dashboard → JWT Templates → `supabase`).
 * @see docs/clerk-supabase-jwt.md
 */
export function useSupabase(): SupabaseClient {
  const { getToken, isSignedIn } = useAuth()

  return useMemo(
    () =>
      createSupabaseBrowserClient(async () => {
        if (!isSignedIn) return null
        try {
          const token = await getToken({ template: 'supabase' })
          if (!token && !warnedNoTemplate && process.env.NODE_ENV === 'development') {
            warnedNoTemplate = true
            console.warn(
              '[PROOF] Sin JWT template "supabase" en Clerk. RLS no aplicará. Ver docs/clerk-supabase-jwt.md'
            )
          }
          return token
        } catch {
          return null
        }
      }),
    [getToken, isSignedIn]
  )
}
