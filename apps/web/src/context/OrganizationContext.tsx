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
  fetchWinemakerOrganizations,
  type Organization,
  type OrganizationMembership,
  type OrgMemberRole,
  type OrgMemberStatus,
} from '@/lib/supabase/organization'
import { createClient } from '@/lib/supabase/client'

const STORAGE_KEY = 'proof_active_organization'

export interface ActiveOrganizationContext {
  id: string
  name: string
  org_type: Organization['org_type']
  plan: Organization['plan']
  plan_status: Organization['plan_status']
}

export interface ActiveMembershipContext {
  role: OrgMemberRole
  status: OrgMemberStatus
}

interface OrganizationContextValue {
  loading: boolean
  orgsResolved: boolean
  loadError: string | null
  allOrganizations: OrganizationMembership[]
  activeOrg: ActiveOrganizationContext | null
  membership: ActiveMembershipContext | null
  switchOrganization: (organizationId: string) => void
  reload: (opts?: { silent?: boolean }) => Promise<void>
}

const OrganizationContext = createContext<OrganizationContextValue | null>(null)

function readStoredOrganizationId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(STORAGE_KEY)
}

function writeStoredOrganizationId(organizationId: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, organizationId)
}

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { user, isLoaded } = useAuth()
  const [allOrganizations, setAllOrganizations] = useState<OrganizationMembership[]>([])
  const [activeOrg, setActiveOrg] = useState<ActiveOrganizationContext | null>(null)
  const [membership, setMembership] = useState<ActiveMembershipContext | null>(null)
  const [loading, setLoading] = useState(true)
  const [orgsResolved, setOrgsResolved] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const applyActive = useCallback((memberships: OrganizationMembership[]) => {
    if (memberships.length === 0) {
      setActiveOrg(null)
      setMembership(null)
      return
    }

    const storedId = readStoredOrganizationId()
    const found =
      (storedId && memberships.find(m => m.organizationId === storedId)) || memberships[0]

    if (!found) {
      setActiveOrg(null)
      setMembership(null)
      return
    }

    setActiveOrg({
      id: found.organization.id,
      name: found.organization.name,
      org_type: found.organization.org_type,
      plan: found.organization.plan,
      plan_status: found.organization.plan_status,
    })
    setMembership({ role: found.role, status: found.status })
    writeStoredOrganizationId(found.organizationId)
  }, [])

  const load = useCallback(async (): Promise<boolean> => {
    if (!user) {
      setAllOrganizations([])
      setActiveOrg(null)
      setMembership(null)
      return true
    }

    const sb = createClient()
    const memberships = await fetchWinemakerOrganizations(sb, user.id)
    setAllOrganizations(memberships)
    applyActive(memberships)
    return true
  }, [user?.id, applyActive])

  useEffect(() => {
    if (!isLoaded) return

    let cancelled = false

    async function run() {
      setLoading(true)
      setOrgsResolved(false)
      setLoadError(null)

      if (!user) {
        setAllOrganizations([])
        setActiveOrg(null)
        setMembership(null)
        setOrgsResolved(true)
        setLoading(false)
        return
      }

      try {
        await load()
      } catch (err) {
        if (!cancelled) {
          const msg =
            err instanceof Error ? err.message : 'No se pudieron cargar las organizaciones'
          setLoadError(msg)
        }
      } finally {
        if (!cancelled) {
          setOrgsResolved(true)
          setLoading(false)
        }
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
      setOrgsResolved(true)
      setLoading(false)
    }, 3_000)
    return () => window.clearTimeout(t)
  }, [isLoaded])

  const switchOrganization = useCallback(
    (organizationId: string) => {
      const next = allOrganizations.find(m => m.organizationId === organizationId)
      if (!next) return
      setActiveOrg({
        id: next.organization.id,
        name: next.organization.name,
        org_type: next.organization.org_type,
        plan: next.organization.plan,
        plan_status: next.organization.plan_status,
      })
      setMembership({ role: next.role, status: next.status })
      writeStoredOrganizationId(organizationId)
    },
    [allOrganizations]
  )

  const contextValue = useMemo(
    () => ({
      loading,
      orgsResolved,
      loadError,
      allOrganizations,
      activeOrg,
      membership,
      switchOrganization,
      reload: async (opts?: { silent?: boolean }) => {
        const silent = opts?.silent ?? false
        if (!silent) {
          setLoading(true)
          setOrgsResolved(false)
          setLoadError(null)
        }
        try {
          await load()
        } catch (err) {
          if (!silent) {
            const msg =
              err instanceof Error ? err.message : 'No se pudieron cargar las organizaciones'
            setLoadError(msg)
          }
        } finally {
          if (!silent) {
            setOrgsResolved(true)
            setLoading(false)
          }
        }
      },
    }),
    [
      loading,
      orgsResolved,
      loadError,
      allOrganizations,
      activeOrg,
      membership,
      switchOrganization,
      load,
    ]
  )

  return (
    <OrganizationContext.Provider value={contextValue}>
      {children}
    </OrganizationContext.Provider>
  )
}

export function useOrganization() {
  const ctx = useContext(OrganizationContext)
  if (!ctx) {
    throw new Error('useOrganization must be used within an OrganizationProvider')
  }
  return ctx
}
