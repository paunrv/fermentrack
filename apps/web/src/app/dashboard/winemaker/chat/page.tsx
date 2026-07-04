'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useOrganization } from '@/context/OrganizationContext'
import { useBreakpoint } from '@/hooks/useBreakpoint'
import { TeamChatPanel } from '@/components/proof/TeamChatPanel'
import { orgHasFeature } from '@/lib/proof/org-features'

export default function WinemakerChatPage() {
  const router = useRouter()
  const breakpoint = useBreakpoint()
  const { user } = useAuth()
  const { activeOrg } = useOrganization()
  const chatEnabled =
    !!activeOrg &&
    orgHasFeature({ plan: activeOrg.plan, features: activeOrg.features }, 'chat')

  useEffect(() => {
    if (breakpoint !== 'mobile') {
      router.replace('/dashboard')
    }
  }, [breakpoint, router])

  if (breakpoint !== 'mobile') {
    return null
  }

  return (
    <div
      style={{
        minHeight: '100%',
        background: 'var(--canvas)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <TeamChatPanel
        organizationId={activeOrg?.id}
        userId={user?.id}
        enabled={chatEnabled}
        compact
      />
    </div>
  )
}
