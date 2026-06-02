'use client'

import { ClerkProvider } from '@clerk/nextjs'
import { ProfileProvider } from '@/context/ProfileContext'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <ProfileProvider>{children}</ProfileProvider>
    </ClerkProvider>
  )
}

