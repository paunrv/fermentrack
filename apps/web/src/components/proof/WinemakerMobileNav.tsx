'use client'

import { useEffect, useState } from 'react'
import { useOrganization } from '@/context/OrganizationContext'
import { fetchTeamAccess } from '@/app/actions/equipo'
import { BottomNav } from '@/components/proof/BottomNav'
import { CapturePanel } from '@/components/proof/CapturePanel'

export function WinemakerMobileNav() {
  const { activeOrg } = useOrganization()
  const [captureOpen, setCaptureOpen] = useState(false)
  const [showEquipo, setShowEquipo] = useState(false)
  const [canWrite, setCanWrite] = useState(true)

  useEffect(() => {
    if (!activeOrg?.id) {
      setShowEquipo(false)
      setCanWrite(true)
      return
    }
    let cancelled = false
    fetchTeamAccess(activeOrg.id)
      .then(access => {
        if (!cancelled) {
          setShowEquipo(access.canManage)
          setCanWrite(access.canWrite)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setShowEquipo(false)
          setCanWrite(true)
        }
      })
    return () => {
      cancelled = true
    }
  }, [activeOrg?.id])

  return (
    <>
      <div className="proof-capture-portal proof-mobile-only">
        <CapturePanel
          open={captureOpen && canWrite}
          onClose={() => setCaptureOpen(false)}
        />
      </div>
      <BottomNav
        profile="winemaker"
        fixed
        showEquipo={showEquipo}
        captureOpen={captureOpen}
        onCaptureToggle={() => {
          if (!canWrite) return
          setCaptureOpen(v => !v)
        }}
      />
    </>
  )
}
