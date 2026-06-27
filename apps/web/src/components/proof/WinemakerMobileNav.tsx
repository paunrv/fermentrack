'use client'

import { useEffect, useState } from 'react'
import { fetchTeamAccess } from '@/app/actions/equipo'
import { BottomNav } from '@/components/proof/BottomNav'
import { CapturePanel } from '@/components/proof/CapturePanel'

export function WinemakerMobileNav() {
  const [captureOpen, setCaptureOpen] = useState(false)
  const [showEquipo, setShowEquipo] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchTeamAccess()
      .then(access => {
        if (!cancelled) setShowEquipo(access.isOwner)
      })
      .catch(() => {
        if (!cancelled) setShowEquipo(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <>
      <div className="proof-capture-portal proof-mobile-only">
        <CapturePanel open={captureOpen} onClose={() => setCaptureOpen(false)} />
      </div>
      <BottomNav
        profile="winemaker"
        fixed
        showEquipo={showEquipo}
        captureOpen={captureOpen}
        onCaptureToggle={() => setCaptureOpen(v => !v)}
      />
    </>
  )
}
