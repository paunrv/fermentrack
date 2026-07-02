'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/** Legacy assistant route — redirects to BYOA connection hub on dashboard home. */
export default function AgentePage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/dashboard')
  }, [router])

  return null
}
