'use client'

import { ProfileProvider } from '@/context/ProfileContext'
import { OrganizationProvider } from '@/context/OrganizationContext'
import { UpgradeModalProvider } from '@/components/proof/UpgradeModal'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <UpgradeModalProvider>
      <ProfileProvider>
        <OrganizationProvider>{children}</OrganizationProvider>
      </ProfileProvider>
    </UpgradeModalProvider>
  )
}
