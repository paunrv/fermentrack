'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useAuth, useUser } from '@clerk/nextjs'
import {
  type ExtraProfile,
  type Profile,
  type ProfileScope,
} from '@/lib/supabase'
import { resolveDistribuidorScopeClerkId } from '@/lib/supabase/distribuidor'
import {
  fetchMiInformacionProfile,
  mergeMiInformacionIntoProfile,
} from '@/lib/proof/profile-mi-informacion'
import { createSupabaseBrowserClientWithToken } from '@/utils/supabase/browser'

const STORAGE_KEY = 'proof_active_profile'
const LEGACY_STORAGE_KEY = 'fermentrack_active_profile'

interface ProfileContextValue {
  loading: boolean
  /** true tras consultar `profiles` en Supabase (éxito); evita mandar a onboarding por race/JWT. */
  profilesResolved: boolean
  allProfiles: Profile[]
  activeProfile: Profile | null
  scope: ProfileScope | null
  switchProfile: (type: ExtraProfile) => Promise<void>
  reload: (opts?: { silent?: boolean }) => Promise<void>
}

const ProfileContext = createContext<ProfileContextValue | null>(null)

function readStoredType(): ExtraProfile | null {
  if (typeof window === 'undefined') return null
  let raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY)
    if (legacy) {
      localStorage.setItem(STORAGE_KEY, legacy)
      localStorage.removeItem(LEGACY_STORAGE_KEY)
      raw = legacy
    }
  }
  if (
    raw === 'brewer' ||
    raw === 'winemaker' ||
    raw === 'distiller' ||
    raw === 'distributor'
  ) {
    return raw
  }
  if (raw === 'bar') {
    localStorage.removeItem(STORAGE_KEY)
  }
  return null
}

function writeStoredType(type: ExtraProfile) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, type)
}

async function syncClerkProfileClaim(
  user: NonNullable<ReturnType<typeof useUser>['user']>,
  type: ExtraProfile,
  getToken: ReturnType<typeof useAuth>['getToken']
) {
  await user.update({
    unsafeMetadata: {
      ...(user.unsafeMetadata as Record<string, unknown>),
      profile_type_v2: type,
    },
  })
  await getToken({ template: 'supabase', skipCache: true })
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user, isLoaded } = useUser()
  const { getToken, isSignedIn } = useAuth()
  const [allProfiles, setAllProfiles] = useState<Profile[]>([])
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [profilesResolved, setProfilesResolved] = useState(false)
  const [scopeClerkId, setScopeClerkId] = useState<string | null>(null)

  /** @returns true si la consulta a `profiles` terminó; false si falta JWT (reintentar). */
  const load = useCallback(async (): Promise<boolean> => {
    if (!user) {
      setAllProfiles([])
      setActiveProfile(null)
      return true
    }

    const token = await getToken({ template: 'supabase' })
    console.log('[ProfileContext] token:', token ? 'OK' : 'NULL')
    console.log('[ProfileContext] isLoaded:', isLoaded, 'isSignedIn:', isSignedIn)
    if (!token) return false

    const sb = createSupabaseBrowserClientWithToken(token)
    const { data, error } = await sb
      .from('profiles')
      .select('*')
      .eq('clerk_id', user.id)
      .order('created_at', { ascending: true })
    console.log('[ProfileContext] profiles result:', data, error)
    if (error) throw error

    const profiles = (data || []).map(
      row =>
        ({
          ...row,
          extra_profiles: (row.extra_profiles || []) as ExtraProfile[],
          is_super_user: Boolean(row.is_super_user),
          onboarding_complete: Boolean(row.onboarding_complete),
        }) as Profile
    )
    setAllProfiles(profiles)

    if (profiles.length === 0) {
      setActiveProfile(null)
      return true
    }

    const stored = readStoredType()
    let found =
      (stored && profiles.find(p => p.profile_type_v2 === stored)) || profiles[0]
    if (!found) {
      setActiveProfile(null)
      return true
    }
    if (stored && found.profile_type_v2 !== stored) {
      console.warn(
        '[ProfileContext] stored profile not found, using',
        found.profile_type_v2,
        'stored was',
        stored
      )
    }
    console.log('[ProfileContext] active profile', found.profile_type_v2)
    let active = found
    if (found.profile_type_v2 === 'distributor') {
      try {
        const scopeId = await resolveDistribuidorScopeClerkId(sb, user.id)
        const scopeRow = await fetchMiInformacionProfile(sb, scopeId)
        if (scopeRow) active = mergeMiInformacionIntoProfile(found, scopeRow)
      } catch (err) {
        console.warn('[ProfileContext] mi informacion en load', err)
      }
    }
    setActiveProfile(active)
    writeStoredType(found.profile_type_v2)
    try {
      await syncClerkProfileClaim(user, found.profile_type_v2, getToken)
    } catch {
      /* JWT se refrescará en la próxima interacción */
    }
    return true
  }, [user, getToken, isLoaded, isSignedIn])

  useEffect(() => {
    console.log(
      '[ProfileContext] profilesResolved:',
      profilesResolved,
      'allProfiles:',
      allProfiles.length,
      'loading:',
      loading
    )
  }, [profilesResolved, allProfiles.length, loading])

  useEffect(() => {
    if (!isLoaded) return

    let cancelled = false

    async function run() {
      setLoading(true)
      setProfilesResolved(false)

      if (!user) {
        setAllProfiles([])
        setActiveProfile(null)
        setProfilesResolved(true)
        setLoading(false)
        return
      }

      const maxAttempts = 12
      for (let attempt = 0; attempt < maxAttempts && !cancelled; attempt++) {
        try {
          const done = await load()
          if (done) break
        } catch (err) {
          console.error('[ProfileContext] error cargando profiles', err)
        }
        await new Promise(r => setTimeout(r, 250))
      }

      if (!cancelled) {
        setProfilesResolved(true)
        setLoading(false)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [isLoaded, user?.id, load])

  useEffect(() => {
    if (isLoaded) return
    const t = window.setTimeout(() => {
      console.warn('[ProfileContext] Clerk no cargó a tiempo — desbloqueando UI')
      setProfilesResolved(true)
      setLoading(false)
    }, 10_000)
    return () => window.clearTimeout(t)
  }, [isLoaded])

  useEffect(() => {
    if (!user || !activeProfile) {
      setScopeClerkId(null)
      return
    }

    if (activeProfile.profile_type_v2 !== 'distributor') {
      setScopeClerkId(user.id)
      return
    }

    let cancelled = false

    void (async () => {
      try {
        const token = await getToken({ template: 'supabase' })
        if (!token) {
          if (!cancelled) setScopeClerkId(user.id)
          return
        }
        const sb = createSupabaseBrowserClientWithToken(token)
        const orgClerkId = await resolveDistribuidorScopeClerkId(sb, user.id)
        if (!cancelled) {
          console.log('[ProfileContext] scope clerk_id', {
            clerkUserId: user.id,
            scopeClerkId: orgClerkId,
          })
          setScopeClerkId(orgClerkId)
        }
      } catch (err) {
        console.warn('[ProfileContext] resolve scope clerk_id', err)
        if (!cancelled) setScopeClerkId(user.id)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [user?.id, activeProfile?.profile_type_v2, getToken])

  const switchProfile = useCallback(
    async (type: ExtraProfile) => {
      const next = allProfiles.find(p => p.profile_type_v2 === type)
      if (!next) return
      setActiveProfile(next)
      writeStoredType(type)
      if (user) {
        try {
          await syncClerkProfileClaim(user, type, getToken)
        } catch {
          /* JWT se refrescará en la próxima interacción */
        }
      }
    },
    [allProfiles, user, getToken]
  )

  const scope = useMemo((): ProfileScope | null => {
    if (!user || !activeProfile || !scopeClerkId) return null
    return { clerk_id: scopeClerkId, profile_type_v2: activeProfile.profile_type_v2 }
  }, [user, activeProfile, scopeClerkId])

  const contextValue = useMemo(
    () => ({
      loading,
      profilesResolved,
      allProfiles,
      activeProfile,
      scope,
      switchProfile,
      reload: async (opts?: { silent?: boolean }) => {
        const silent = opts?.silent ?? false
        if (!silent) {
          setLoading(true)
          setProfilesResolved(false)
        }
        try {
          const done = await load()
          if (done && !silent) setProfilesResolved(true)
        } finally {
          if (!silent) setLoading(false)
        }
      },
    }),
    [loading, profilesResolved, allProfiles, activeProfile, scope, switchProfile, load]
  )

  return (
    <ProfileContext.Provider value={contextValue}>{children}</ProfileContext.Provider>
  )
}

export function useProfile() {
  const ctx = useContext(ProfileContext)
  if (!ctx) {
    throw new Error('useProfile must be used within a ProfileProvider')
  }
  return ctx
}
