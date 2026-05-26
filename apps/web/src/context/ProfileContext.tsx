'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { useUser } from '@clerk/nextjs'
import {
  fetchProfiles,
  type ExtraProfile,
  type Profile,
  type ProfileScope,
} from '@/lib/supabase'

const STORAGE_KEY = 'fermentrack_active_profile'

interface ProfileContextValue {
  loading: boolean
  allProfiles: Profile[]
  activeProfile: Profile | null
  scope: ProfileScope | null
  switchProfile: (type: ExtraProfile) => void
  reload: () => Promise<void>
}

const ProfileContext = createContext<ProfileContextValue | null>(null)

function readStoredType(): ExtraProfile | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(STORAGE_KEY)
  if (
    raw === 'brewer' ||
    raw === 'winemaker' ||
    raw === 'distiller' ||
    raw === 'distributor' ||
    raw === 'bar'
  ) {
    return raw
  }
  return null
}

function writeStoredType(type: ExtraProfile) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, type)
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user, isLoaded } = useUser()
  const [allProfiles, setAllProfiles] = useState<Profile[]>([])
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) {
      setAllProfiles([])
      setActiveProfile(null)
      return
    }
    const profiles = await fetchProfiles(user.id)
    setAllProfiles(profiles)

    if (profiles.length === 0) {
      setActiveProfile(null)
      return
    }

    const stored = readStoredType()
    const found = (stored && profiles.find(p => p.profile_type_v2 === stored)) || profiles[0]
    setActiveProfile(found)
    writeStoredType(found.profile_type_v2)
  }, [user])

  useEffect(() => {
    if (!isLoaded) return
    setLoading(true)
    load().finally(() => setLoading(false))
  }, [isLoaded, load])

  const switchProfile = useCallback(
    (type: ExtraProfile) => {
      const next = allProfiles.find(p => p.profile_type_v2 === type)
      if (!next) return
      setActiveProfile(next)
      writeStoredType(type)
    },
    [allProfiles]
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
