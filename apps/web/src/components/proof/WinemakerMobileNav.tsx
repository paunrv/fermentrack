'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useOrganization } from '@/context/OrganizationContext'
import { fetchTeamAccess } from '@/app/actions/equipo'
import { BottomNav } from '@/components/proof/BottomNav'
import { CapturePanel, type CaptureOptionId } from '@/components/proof/CapturePanel'
import { AgendaCaptureSheet } from '@/components/proof/AgendaCaptureSection'
import { orgHasFeature } from '@/lib/proof/org-features'

/** Pilot: only options with a real in-app path. */
const WINEMAKER_CAPTURE_OPTIONS: CaptureOptionId[] = ['foto', 'lab']

export function WinemakerMobileNav() {
  const router = useRouter()
  const { activeOrg } = useOrganization()
  const [captureOpen, setCaptureOpen] = useState(false)
  const [agendaCaptureOpen, setAgendaCaptureOpen] = useState(false)
  const [showEquipo, setShowEquipo] = useState(false)
  const [canWrite, setCanWrite] = useState(true)

  const chatEnabled =
    !!activeOrg?.id &&
    orgHasFeature({ plan: activeOrg.plan, features: activeOrg.features }, 'chat')

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

  function handleCaptureSelect(id: CaptureOptionId) {
    if (id === 'foto' || id === 'lab') {
      setAgendaCaptureOpen(true)
    }
  }

  return (
    <>
      <div className="proof-capture-portal proof-mobile-only">
        <CapturePanel
          open={captureOpen && canWrite}
          onClose={() => setCaptureOpen(false)}
          onSelect={handleCaptureSelect}
          options={WINEMAKER_CAPTURE_OPTIONS}
          showCustomize={false}
        />
        <AgendaCaptureSheet
          open={agendaCaptureOpen && canWrite}
          onClose={() => setAgendaCaptureOpen(false)}
          onUploaded={() => {
            router.refresh()
          }}
        />
      </div>
      <BottomNav
        profile="winemaker"
        fixed
        showEquipo={showEquipo}
        showChat={chatEnabled}
        captureOpen={captureOpen || agendaCaptureOpen}
        onCaptureToggle={() => {
          if (!canWrite) return
          if (agendaCaptureOpen) {
            setAgendaCaptureOpen(false)
            return
          }
          setCaptureOpen(v => !v)
        }}
      />
    </>
  )
}
