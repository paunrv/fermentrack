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
import { useAuth } from '@/hooks/useAuth'
import {
  type ExtraProfile,
  type Profile,
  type ProfileScope,
  PROOF_PROFILES_TABLE,
} from '@/lib/supabase'
import { resolveDistribuidorScopeClerkId } from '@/lib/supabase/distribuidor'
import {
  fetchMiInformacionProfile,
  mergeMiInformacionIntoProfile,
} from '@/lib/proof/profile-mi-informacion'
import { createClient } from '@/lib/supabase/client'

const STORAGE_KEY = 'proof_active_profile'
const LEGACY_STORAGE_KEY = 'fermentrack_active_profile'

interface ProfileContextValue {
  loading: boolean
  /** true tras consultar `profiles` en Supabase (éxito); evita mandar a onboarding por race/JWT. */
  profilesResolved: boolean
  /** Error al cargar perfiles desde Supabase (p. ej. red caída). */
  loadError: string | null
  allProfiles: Profile[]
  activeProfile: Profile | null
  scope: ProfileScope | null
  switchProfile: (type: ExtraProfile) => void
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

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user, isLoaded, isSignedIn } = useAuth()
  const [allProfiles, setAllProfiles] = useState<Profile[]>([])
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [profilesResolved, setProfilesResolved] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [scopeUserId, setScopeUserId] = useState<string | null>(null)

  /** @returns true si la consulta a `profiles` terminó; false si falta JWT (reintentar). */
  const load = useCallback(async (): Promise<boolean> => {
    if (!user) {
      setAllProfiles([])
      setActiveProfile(null)
      return true
    }

    const sb = createClient()
    const { data, error } = await sb
      .from(PROOF_PROFILES_TABLE)
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
    console.log('[ProfileContext] profiles result:', data, error)
    if (error) throw error

    const profiles = (data || []).map(
      row =>
        ({
          ...row,
          user_id: row.user_id ?? row.clerk_id,
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
    return true
  }, [user, isLoaded, isSignedIn])

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
      setLoadError(null)

      if (!user) {
        setAllProfiles([])
        setActiveProfile(null)
        setProfilesResolved(true)
        setLoading(false)
        return
      }

      let loaded = false
      let lastError: unknown = null
      const maxAttempts = 12
      for (let attempt = 0; attempt < maxAttempts && !cancelled; attempt++) {
        try {
          const done = await load()
          if (done) {
            loaded = true
            break
          }
        } catch (err) {
          lastError = err
          console.error('[ProfileContext] error cargando profiles', err)
        }
        await new Promise(r => setTimeout(r, 250))
      }

      if (!cancelled) {
        if (!loaded && lastError) {
          const msg =
            lastError instanceof Error
              ? lastError.message
              : 'No se pudo conectar con el servidor'
          setLoadError(msg)
        }
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
      console.warn('[ProfileContext] Auth no cargó a tiempo — desbloqueando UI')
      setProfilesResolved(true)
      setLoading(false)
    }, 10_000)
    return () => window.clearTimeout(t)
  }, [isLoaded])

  useEffect(() => {
    if (!user || !activeProfile) {
      setScopeUserId(null)
      return
    }

    if (activeProfile.profile_type_v2 !== 'distributor') {
      setScopeUserId(user.id)
      return
    }

    let cancelled = false

    void (async () => {
      try {
        const sb = createClient()
        const orgUserId = await resolveDistribuidorScopeClerkId(sb, user.id)
        if (!cancelled) {
          console.log('[ProfileContext] scope user_id', {
            authUserId: user.id,
            scopeUserId: orgUserId,
          })
          setScopeUserId(orgUserId)
        }
      } catch (err) {
        console.warn('[ProfileContext] resolve scope user_id', err)
        if (!cancelled) setScopeUserId(user.id)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [user?.id, activeProfile?.profile_type_v2])

  const switchProfile = useCallback(
    (type: ExtraProfile) => {
      const next = allProfiles.find(p => p.profile_type_v2 === type)
      if (!next) return
      setActiveProfile(next)
      writeStoredType(type)
    },
    [allProfiles]
  )

  const scope = useMemo((): ProfileScope | null => {
    if (!user || !activeProfile || !scopeUserId) return null
    return { user_id: scopeUserId, profile_type_v2: activeProfile.profile_type_v2 }
  }, [user, activeProfile, scopeUserId])

  const contextValue = useMemo(
    () => ({
      loading,
      profilesResolved,
      loadError,
      allProfiles,
      activeProfile,
      scope,
      switchProfile,
      reload: async (opts?: { silent?: boolean }) => {
        const silent = opts?.silent ?? false
        if (!silent) {
          setLoading(true)
          setProfilesResolved(false)
          setLoadError(null)
        }
        try {
          const done = await load()
          if (done && !silent) setProfilesResolved(true)
        } catch (err) {
          if (!silent) {
            const msg =
              err instanceof Error ? err.message : 'No se pudo conectar con el servidor'
            setLoadError(msg)
            setProfilesResolved(true)
          }
        } finally {
          if (!silent) setLoading(false)
        }
      },
    }),
    [loading, profilesResolved, loadError, allProfiles, activeProfile, scope, switchProfile, load]
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
