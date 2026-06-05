'use client'

import { useAuth } from '@clerk/nextjs'
import { useMemo, useRef } from 'react'
import { createSupabaseBrowserClient } from '@/utils/supabase/browser'
import type { SupabaseClient } from '@supabase/supabase-js'

let warnedNoTemplate = false

/**
 * Cliente Supabase autenticado con JWT Clerk (Dashboard → JWT Templates → `supabase`).
 * @see docs/clerk-supabase-jwt.md
 */
export function useSupabase(): SupabaseClient {
  const { getToken, isSignedIn, isLoaded } = useAuth()
  const getTokenRef = useRef(getToken)
  getTokenRef.current = getToken

  return useMemo(() => {
    try {
      return createSupabaseBrowserClient(async () => {
        if (!isLoaded || !isSignedIn) return null
        try {
          const token = await getTokenRef.current({ template: 'supabase' })
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
      })
    } catch (err) {
      console.error('[useSupabase] init failed', err)
      return createSupabaseBrowserClient()
    }
  }, [isSignedIn, isLoaded])
}

/** JWT template `supabase` para inserts críticos (falla con mensaje claro si falta). */
export async function requireClerkSupabaseToken(
  getToken: (opts?: { template?: string }) => Promise<string | null>
): Promise<string> {
  const token = await getToken({ template: 'supabase' })
  if (!token) {
    throw new Error(
      'No hay JWT de Clerk (template "supabase"). Revisa Clerk → JWT Templates y que el signing key sea el JWT Secret de Supabase.'
    )
  }
  return token
}
