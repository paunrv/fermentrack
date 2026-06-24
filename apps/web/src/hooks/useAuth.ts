'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

export function useAuth() {
  const supabase = useMemo(() => createClient(), [])
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: nextSession } }) => {
      setSession(nextSession)
      setUser(nextSession?.user ?? null)
      setIsLoaded(true)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setUser(nextSession?.user ?? null)
      setIsLoaded(true)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  return {
    user,
    session,
    isLoaded,
    isSignedIn: Boolean(user),
    supabase,
  }
}
