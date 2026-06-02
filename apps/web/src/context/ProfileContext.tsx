'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { useAuth, useUser } from '@clerk/nextjs'
import {
  type ExtraProfile,
  type Profile,
  type ProfileScope,
} from '@/lib/supabase'
import { useSupabase } from '@/hooks/useSupabase'

const STORAGE_KEY = 'proof_active_profile'
const LEGACY_STORAGE_KEY = 'fermentrack_active_profile'

interface ProfileContextValue {
  loading: boolean
  allProfiles: Profile[]
  activeProfile: Profile | null
  scope: ProfileScope | null
  switchProfile: (type: ExtraProfile) => Promise<void>
  reload: () => Promise<void>
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

function normalizeProfile(row: Record<string, unknown>): Profile {
  return {
    ...(row as unknown as Profile),
    extra_profiles: (row.extra_profiles || []) as ExtraProfile[],
    is_super_user: Boolean(row.is_super_user),
    onboarding_complete: Boolean(row.onboarding_complete),
  }
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
  const { getToken } = useAuth()
  const supabase = useSupabase()
  const [allProfiles, setAllProfiles] = useState<Profile[]>([])
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) {
      setAllProfiles([])
      setActiveProfile(null)
      return
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('clerk_id', user.id)
      .order('created_at', { ascending: true })
    if (error) throw error
    const profiles = (data || []).map(row => normalizeProfile(row as Record<string, unknown>))
    setAllProfiles(profiles)

    if (profiles.length === 0) {
      setActiveProfile(null)
      return
    }

    const stored = readStoredType()
    const found =
      (stored && profiles.find(p => p.profile_type_v2 === stored)) || profiles[0]
    if (!found) {
      setActiveProfile(null)
      return
    }
    setActiveProfile(found)
    writeStoredType(found.profile_type_v2)
    try {
      await syncClerkProfileClaim(user, found.profile_type_v2, getToken)
    } catch {
      /* JWT se refrescará en la próxima interacción */
    }
  }, [user, supabase, getToken])

  useEffect(() => {
    if (!isLoaded) return
    setLoading(true)
    load().finally(() => setLoading(false))
  }, [isLoaded, load])

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

  const scope: ProfileScope | null =
    user && activeProfile
      ? { clerk_id: user.id, profile_type_v2: activeProfile.profile_type_v2 }
      : null

  return (
    <ProfileContext.Provider
      value={{
        loading,
        allProfiles,
        activeProfile,
        scope,
        switchProfile,
        reload: load,
      }}
    >
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfile() {
  const ctx = useContext(ProfileContext)
  if (!ctx) {
    throw new Error('useProfile must be used within a ProfileProvider')
  }
  return ctx
}
