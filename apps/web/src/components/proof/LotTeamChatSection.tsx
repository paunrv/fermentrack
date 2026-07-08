'use client'

import { useAuth } from '@/hooks/useAuth'
import { useOrganization } from '@/context/OrganizationContext'
import { TeamChatPanel } from '@/components/proof/TeamChatPanel'
import { orgHasFeature } from '@/lib/proof/org-features'

export function LotTeamChatSection({ lotId }: { lotId: string }) {
  const { user } = useAuth()
  const { activeOrg } = useOrganization()
  const chatEnabled =
    !!activeOrg &&
    orgHasFeature({ plan: activeOrg.plan, features: activeOrg.features }, 'chat')

  if (!chatEnabled) return null

  return (
    <section style={{ marginTop: 28 }}>
      <div
        style={{
          border: '0.5px solid var(--hairline)',
          borderRadius: 12,
          overflow: 'hidden',
          height: 360,
          maxHeight: 'min(420px, 60vh)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <TeamChatPanel
          organizationId={activeOrg?.id}
          userId={user?.id}
          enabled={chatEnabled}
          filter={{ loteId: lotId }}
          compact
        />
      </div>
    </section>
  )
}
