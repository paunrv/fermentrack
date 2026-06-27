'use client'

import { ProfileProvider } from '@/context/ProfileContext'
import { UpgradeModalProvider } from '@/components/proof/UpgradeModal'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <UpgradeModalProvider>
      <ProfileProvider>{children}</ProfileProvider>
    </UpgradeModalProvider>
  )
}
