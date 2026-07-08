'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { getUserAvatarUrl, getUserInitials } from '@/lib/auth/user'
import { useProfile } from '@/context/ProfileContext'
import { useOrganization } from '@/context/OrganizationContext'
import { type ExtraProfile, type Profile } from '@/lib/supabase'
import {
  distillerBlockedFromPath,
  distillerBlockedFromWinemakerPath,
  distributorBlockedFromPath,
  distributorBlockedFromWinemakerPath,
  isCanvasStylePath,
  isDestiladorPath,
  isDistributorOnlyPath,
  isProducerOnlyPath,
  isWinemakerPath,
  winemakerBlockedFromPath,
} from '@/lib/proof/dashboard-routes'
import type { DestMembresia } from '@/lib/proof/destilador-types'
import {
  getProfileTheme,
  proofAccentCssVars,
} from '@/lib/proof/profile-theme'
import { fetchDestiladorMembresia } from '@/lib/supabase/destilador'
import { useBreakpoint } from '@/hooks/useBreakpoint'
import { useTranslations } from 'next-intl'
import {
  DASHBOARD_CANVAS_HEADER_HEIGHT_PX,
  shouldShowDashboardInnerHeader,
  shouldShowDesktopRailForBreakpoint,
  shouldShowBottomNav,
  shouldShowTeamChatDock,
  shouldShowWinemakerMobileNav,
  resolveShellProfileType,
  isWinemakerShellMode,
  shellHorizontalPadding,
  innerHeaderAskMaxWidth,
} from '@/lib/proof/dashboard-shell'
import { pageTitleForPath } from '@/lib/proof/dashboard-nav'
import { buildDashboardRail } from '@/lib/proof/dashboard-rail'
import { railIcon } from '@/lib/proof/dashboard-rail-icons'
import { DashboardRail } from '@/components/proof/DashboardRail'
import { fetchTeamAccess } from '@/app/actions/equipo'
import { MobileBottomNav } from '@/components/proof/MobileBottomNav'
import { WinemakerMobileNav } from '@/components/proof/WinemakerMobileNav'
import { ProofDatosCobroSheet } from '@/components/proof/ProofDatosCobroSheet'
import { OrgSwitcher } from '@/components/proof/OrgSwitcher'
import {
  TeamChatDock,
  TeamChatRailToggle,
  useTeamChatDockState,
} from '@/components/proof/TeamChatDock'
import { useTeamChatUnread } from '@/hooks/useTeamChatUnread'
import { useDashboardRailExpanded } from '@/hooks/useDashboardRailExpanded'
import { orgHasFeature } from '@/lib/proof/org-features'
import { LocaleToggle } from '@/components/i18n/LocaleToggle'

type Role = ExtraProfile | 'producer'

interface NavItem {
  href: string
  label: string
  roles: Role[] | 'all'
  icon: React.ReactNode
}

const ic = (path: React.ReactNode) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ flexShrink: 0 }}
  >
    {path}
  </svg>
)

const ICONS = {
  ajustes: ic(
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </>
  ),
  camera: ic(
    <>
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </>
  ),
  infoPersonal: ic(
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="11" r="2.5" />
      <path d="M6 17v-.5a3 3 0 0 1 6 0V17" />
      <path d="M14 9h5" />
      <path d="M14 13h4" />
    </>
  ),
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations('dashboard')
  const path = usePathname()
  const router = useRouter()
  const { user, isLoaded, supabase } = useAuth()
  const { activeProfile, allProfiles, loading, profilesResolved } = useProfile()
  const { activeOrg, allOrganizations, orgsResolved, loading: orgLoading } =
    useOrganization()
  const [ask, setAsk] = useState('')
  const [membresia, setMembresia] = useState<DestMembresia>('basico')
  const [datosCobroOpen, setDatosCobroOpen] = useState(false)
  const [datosCobroStrip, setDatosCobroStrip] = useState(false)
  const [showEquipo, setShowEquipo] = useState(false)
  const askCameraRef = useRef<HTMLInputElement>(null)
  const isOnAssistant = path.startsWith('/dashboard/agente')
  const isCanvas = path === '/dashboard'
  const isCanvasStyle = isCanvasStylePath(path)
  const shellProfileType = resolveShellProfileType({
    profileType: activeProfile?.profile_type_v2,
    orgType: activeOrg?.org_type,
  })
  const isWinemaker = isWinemakerShellMode({
    profileType: activeProfile?.profile_type_v2,
    orgType: activeOrg?.org_type,
  })
  const isDistributor = shellProfileType === 'distributor'
  const isDistiller = shellProfileType === 'distiller'
  const effectiveProfileType = shellProfileType
  const theme = getProfileTheme(effectiveProfileType)
  const pageTitle = pageTitleForPath(path, key => t(key))
  const breakpoint = useBreakpoint()
  const isMobile = breakpoint === 'mobile'
  const isTablet = breakpoint === 'tablet'
  const shellPadX = shellHorizontalPadding(breakpoint)
  const isWinemakerMobileHome = isWinemaker && isCanvas && isMobile
  const isDedicatedChatPage = path.startsWith('/dashboard/winemaker/chat')
  const showWinemakerMobileNav = shouldShowWinemakerMobileNav(breakpoint, isWinemaker)
  const showTeamChatDock = shouldShowTeamChatDock(breakpoint, isWinemaker) && !isDedicatedChatPage
  const showSidebar = shouldShowDesktopRailForBreakpoint(breakpoint)
  const showMobileNav = shouldShowBottomNav(breakpoint, isWinemaker)
  const { open: chatOpen, toggle: toggleChat } = useTeamChatDockState()
  const { expanded: railExpanded, toggle: toggleRailExpanded } = useDashboardRailExpanded()
  const chatEnabled =
    isWinemaker &&
    !!activeOrg &&
    orgHasFeature(
      { plan: activeOrg.plan, features: activeOrg.features },
      'chat'
    )
  const { unreadCount: chatUnreadCount } = useTeamChatUnread({
    organizationId: activeOrg?.id,
    userId: user?.id,
    enabled: chatEnabled,
  })

  const effectiveProfile =
    activeProfile ??
    (isWinemaker ? ({ profile_type_v2: 'winemaker', is_super_user: false } as Profile) : null)

  const railModel = useMemo(
    () =>
      buildDashboardRail(
        loading
          ? {
              profile: null,
              isWinemaker: false,
              chatEnabled: false,
              showEquipo: false,
            }
          : {
              profile: effectiveProfile,
              isWinemaker,
              chatEnabled: !!chatEnabled,
              showEquipo,
            }
      ),
    [effectiveProfile, isWinemaker, chatEnabled, showEquipo, loading]
  )

  const navItems = useMemo(
    () =>
      (loading
        ? buildDashboardRail({
            profile: null,
            isWinemaker: false,
            chatEnabled: false,
            showEquipo: false,
          }).flatItems
        : railModel.flatItems
      ).map(item => ({
        href: item.href,
        label: t(item.labelKey),
        roles: 'all' as const,
        icon: railIcon(item.icon),
      })),
    [loading, railModel.flatItems, t]
  )

  const initials = getUserInitials(user)

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/sign-in')
  }

  useEffect(() => {
    if (!activeOrg?.id || !isWinemaker) {
      setShowEquipo(false)
      return
    }
    let cancelled = false
    fetchTeamAccess(activeOrg.id)
      .then(access => {
        if (!cancelled) setShowEquipo(access.canManage)
      })
      .catch(() => {
        if (!cancelled) setShowEquipo(false)
      })
    return () => {
      cancelled = true
    }
  }, [activeOrg?.id, isWinemaker])

  useEffect(() => {
    if (!isLoaded || loading || orgLoading || !profilesResolved || !orgsResolved) return
    if (!user) return
    if (allProfiles.length > 0 || allOrganizations.length > 0) return
    router.replace('/onboarding')
  }, [
    isLoaded,
    loading,
    orgLoading,
    profilesResolved,
    orgsResolved,
    user,
    allProfiles.length,
    allOrganizations.length,
    router,
  ])

  useEffect(() => {
    if (loading) return
    if (distributorBlockedFromPath(activeProfile?.profile_type_v2, path)) {
      router.replace('/dashboard')
      return
    }
    if (winemakerBlockedFromPath(activeProfile?.profile_type_v2, path)) {
      router.replace('/dashboard')
      return
    }
    if (distillerBlockedFromPath(activeProfile?.profile_type_v2, path)) {
      router.replace('/dashboard')
      return
    }
    if (distillerBlockedFromWinemakerPath(activeProfile?.profile_type_v2, path)) {
      router.replace('/dashboard')
      return
    }
    if (distributorBlockedFromWinemakerPath(activeProfile?.profile_type_v2, path)) {
      router.replace('/dashboard')
    }
  }, [loading, activeProfile?.profile_type_v2, path, router])

  useEffect(() => {
    if (!isCanvas || !isDistiller || !activeProfile?.user_id) return
    let cancelled = false
    void fetchDestiladorMembresia(supabase, activeProfile.user_id).then(m => {
      if (!cancelled) setMembresia(m)
    })
    return () => {
      cancelled = true
    }
  }, [isCanvas, isDistiller, activeProfile?.user_id, supabase])

  function submitAsk(e: React.FormEvent) {
    e.preventDefault()
    const q = ask.trim()
    if (!q) return
    setAsk('')
    router.push('/dashboard')
  }

  function handleCameraChange(e: React.ChangeEvent<HTMLInputElement>) {
    e.target.value = ''
    if (isDistributor) {
      router.push('/dashboard/recepcion')
      return
    }
    if (isDistiller || isWinemaker) {
      router.push('/dashboard')
      return
    }
    router.push('/dashboard')
  }

  function openDatosCobroSheet() {
    setDatosCobroStrip(false)
    setDatosCobroOpen(true)
  }

  function toggleDatosCobroStrip() {
    setDatosCobroOpen(false)
    setDatosCobroStrip(v => !v)
  }

  const datosCobroHeaderExpanded = isCanvas && datosCobroStrip

  const showInnerHeader = shouldShowDashboardInnerHeader({
    pathname: path,
    isCanvas,
    isCanvasStyle,
    isOnAssistant,
    profileType: activeProfile?.profile_type_v2,
    isWinemaker,
    showWinemakerMobileNav,
  })

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: 'var(--ink)',
        color: 'var(--fg-0)',
        ...proofAccentCssVars(theme),
      }}
    >
      {showWinemakerMobileNav && <WinemakerMobileNav />}

      {showMobileNav && (
        <MobileBottomNav
          primaryItems={navItems}
          overflowItems={navItems.slice(4)}
          settingsIcon={ICONS.ajustes}
        />
      )}

      {showSidebar && (
        <DashboardRail
          path={path}
          model={railModel}
          accent={theme.accent}
          t={key => t(key)}
          expanded={railExpanded}
          onToggleExpanded={toggleRailExpanded}
          chatSlot={
            showTeamChatDock && chatEnabled ? (
              <TeamChatRailToggle
                open={chatOpen}
                unreadCount={chatUnreadCount}
                onToggle={toggleChat}
                accent={theme.accent}
                expanded={railExpanded}
              />
            ) : undefined
          }
        />
      )}

      <main
        className={isMobile ? 'proof-dashboard-main--mobile' : undefined}
        style={{
          flex: 1,
          minWidth: 0,
          background: 'var(--ink)',
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {isCanvas && !isWinemakerMobileHome && (
          <header
            className="proof-canvas-header proof-dashboard-header"
            style={{
              position: 'sticky',
              top: 0,
              height: DASHBOARD_CANVAS_HEADER_HEIGHT_PX,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: isMobile ? '14px 16px' : isTablet ? '14px 20px' : '14px 24px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  letterSpacing: '-0.01em',
                  color: 'var(--fg-0)',
                }}
              >
                {t('shell.brandLabel')}
              </span>
              <span
                style={{
                  fontSize: 9,
                  fontFamily:
                    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  borderRadius: 4,
                  padding: '3px 8px',
                  background: theme.badge.bg,
                  color: theme.badge.color,
                  border: `0.5px solid ${theme.badge.border}`,
                  letterSpacing: '0.06em',
                }}
              >
                {theme.label.toUpperCase()}
              </span>
              {isWinemaker && allOrganizations.length > 1 && <OrgSwitcher compact />}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {isDistiller && (
                <span
                  style={{
                    fontSize: 11,
                    color: 'var(--fg-3)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {t(`shell.membership.${membresia}`)}
                </span>
              )}
              {isDistributor && (
                <button
                  type="button"
                  onClick={toggleDatosCobroStrip}
                  aria-expanded={datosCobroStrip}
                  aria-label={t('shell.personalInfo')}
                  title={t('shell.personalInfo')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 34,
                    height: 34,
                    padding: 0,
                    borderRadius: 8,
                    border: datosCobroStrip
                      ? `1px solid ${theme.accent}`
                      : '0.5px solid var(--hairline)',
                    background: datosCobroStrip
                      ? `color-mix(in srgb, ${theme.accent} 12%, transparent)`
                      : 'transparent',
                    color: datosCobroStrip ? theme.accent : 'var(--fg-2)',
                    cursor: 'pointer',
                  }}
                >
                  {ICONS.infoPersonal}
                </button>
              )}
              <LocaleToggle variant="dashboard" />
              <AvatarMenu
                initials={initials}
                imageUrl={getUserAvatarUrl(user)}
                accent={theme.accent}
                canSwitchProfile={allProfiles.length > 1}
                onSwitchProfile={() => router.push('/profile-select')}
                onDatosCobro={openDatosCobroSheet}
                onSignOut={() => void handleSignOut()}
              />
            </div>
          </header>
        )}

        {datosCobroHeaderExpanded && (
          <ProofDatosCobroSheet
            open
            variant="strip"
            accent={theme.accent}
            profile={activeProfile}
            onClose={() => setDatosCobroStrip(false)}
          />
        )}

        <ProofDatosCobroSheet
          open={datosCobroOpen}
          variant="sheet"
          accent={theme.accent}
          profile={activeProfile}
          onClose={() => setDatosCobroOpen(false)}
        />

        {showInnerHeader && (
          <header
            className="proof-dashboard-header"
            style={{
              position: 'sticky',
              top: 0,
              padding: isMobile ? '10px 16px' : isTablet ? `12px ${shellPadX}px` : '12px 28px',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                width: '100%',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <span
                  style={{
                    fontSize: isMobile ? 15 : isTablet ? 15 : 16,
                    fontWeight: 600,
                    letterSpacing: '-0.015em',
                    color: 'var(--fg-0)',
                  }}
                >
                  {pageTitle}
                </span>
                {!isMobile && (
                  <span
                    style={{
                      fontSize: 9,
                      fontFamily:
                        'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                      borderRadius: 4,
                      padding: '3px 8px',
                      background: theme.badge.bg,
                      color: theme.badge.color,
                      border: `0.5px solid ${theme.badge.border}`,
                      letterSpacing: '0.06em',
                    }}
                  >
                    {theme.label.toUpperCase()}
                  </span>
                )}
                {!isMobile && (
                  <span
                    aria-hidden
                    className="status-dot ok live"
                    style={{ width: 5, height: 5, background: 'var(--proof-accent)' }}
                  />
                )}
                {isWinemaker && allOrganizations.length > 1 && (
                  <OrgSwitcher compact />
                )}
              </div>
              {!isMobile && (
                <div style={{ flex: 1, minWidth: 0, maxWidth: innerHeaderAskMaxWidth(breakpoint), margin: '0 auto' }}>
                  <ProofAskForm
                    ask={ask}
                    setAsk={setAsk}
                    onSubmit={submitAsk}
                    onCamera={() => askCameraRef.current?.click()}
                    compact={false}
                  />
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                <LocaleToggle variant="dashboard" />
                <AvatarMenu
                  initials={initials}
                  imageUrl={getUserAvatarUrl(user)}
                  accent={theme.accent}
                  canSwitchProfile={allProfiles.length > 1}
                  onSwitchProfile={() => router.push('/profile-select')}
                  onDatosCobro={openDatosCobroSheet}
                  onSignOut={() => void handleSignOut()}
                />
              </div>
            </div>
            {isMobile && (
              <ProofAskForm
                ask={ask}
                setAsk={setAsk}
                onSubmit={submitAsk}
                onCamera={() => askCameraRef.current?.click()}
                compact
              />
            )}
          </header>
        )}

        <input
          ref={askCameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleCameraChange}
          style={{ display: 'none' }}
        />

        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            paddingBottom:
              showWinemakerMobileNav || showMobileNav ? 'var(--proof-bottom-nav)' : 0,
          }}
        >
          {showTeamChatDock && chatEnabled ? (
            <TeamChatDock
              organizationId={activeOrg?.id}
              userId={user?.id}
              enabled={chatEnabled}
              open={chatOpen}
            >
              {children}
            </TeamChatDock>
          ) : (
            children
          )}
        </div>
      </main>
    </div>
  )
}

function ProofAskForm({
  ask,
  setAsk,
  onSubmit,
  onCamera,
  compact,
}: {
  ask: string
  setAsk: (v: string) => void
  onSubmit: (e: React.FormEvent) => void
  onCamera: () => void
  compact?: boolean
}) {
  const t = useTranslations('dashboard.shell')

  return (
    <form
      onSubmit={onSubmit}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        width: '100%',
        background: 'var(--panel-2)',
        border: '1px solid var(--hairline)',
        borderRadius: 'var(--radius-sm)',
        padding: '6px 6px 6px 12px',
        transition: 'border-color 150ms var(--ease-out), background 150ms var(--ease-out)',
      }}
      onFocus={e => {
        e.currentTarget.style.borderColor = 'var(--line)'
        e.currentTarget.style.background = 'var(--ink)'
      }}
      onBlur={e => {
        e.currentTarget.style.borderColor = 'var(--hairline)'
        e.currentTarget.style.background = 'var(--panel-2)'
      }}
    >
      <span
        aria-hidden
        style={{
          width: 22,
          height: 22,
          display: 'grid',
          placeItems: 'center',
          color: 'var(--proof-accent)',
          fontFamily: 'var(--font-mono)',
          fontSize: 13,
          fontWeight: 600,
          flexShrink: 0,
        }}
      >
        ✦
      </span>
      <input
        type="text"
        value={ask}
        onChange={e => setAsk(e.target.value)}
        placeholder={compact ? t('askPlaceholderCompact') : t('askPlaceholder')}
        style={{
          flex: 1,
          minWidth: 0,
          background: 'transparent',
          border: 'none',
          outline: 'none',
          fontSize: 16,
          color: 'var(--fg-0)',
          letterSpacing: '-0.005em',
          fontFamily: 'var(--font-display)',
        }}
      />
      <button
        type="button"
        onClick={onCamera}
        aria-label={t('uploadPhoto')}
        style={{
          width: 44,
          height: 44,
          display: 'grid',
          placeItems: 'center',
          background: 'var(--canvas)',
          border: '1px solid var(--hairline)',
          color: 'var(--fg-2)',
          flexShrink: 0,
          borderRadius: 'var(--radius-sm)',
        }}
      >
        {ICONS.camera}
      </button>
      {!compact && (
        <button
          type="submit"
          disabled={!ask.trim()}
          style={{
            padding: '10px 14px',
            minHeight: 44,
            background: ask.trim() ? 'var(--proof-accent)' : 'var(--canvas)',
            border: '1px solid',
            borderColor: ask.trim() ? 'var(--proof-accent)' : 'var(--hairline)',
            color: ask.trim() ? '#fff' : 'var(--fg-4)',
            fontSize: 12,
            fontWeight: 600,
            flexShrink: 0,
            borderRadius: 'var(--radius-sm)',
          }}
        >
          {t('askSubmit')}
        </button>
      )}
    </form>
  )
}

function AvatarMenu({
  initials,
  imageUrl,
  accent,
  canSwitchProfile,
  onSwitchProfile,
  onDatosCobro,
  onSignOut,
}: {
  initials: string
  imageUrl?: string | null
  accent: string
  canSwitchProfile: boolean
  onSwitchProfile: () => void
  onDatosCobro?: () => void
  onSignOut: () => void
}) {
  const t = useTranslations('dashboard.shell.avatar')
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <button
        type="button"
        aria-label={t('menu')}
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
        style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          padding: 0,
          border: 'none',
          background: `${accent}18`,
          cursor: 'pointer',
          overflow: 'hidden',
          display: 'grid',
          placeItems: 'center',
          flexShrink: 0,
        }}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: accent,
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            }}
          >
            {initials}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            minWidth: 168,
            background: '#fff',
            border: '0.5px solid var(--hairline)',
            borderRadius: 10,
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
            padding: '6px 0',
            zIndex: 50,
          }}
        >
          {canSwitchProfile && (
            <DropdownItem
              label={t('switchProfile')}
              onClick={() => {
                setOpen(false)
                onSwitchProfile()
              }}
            />
          )}
          {onDatosCobro ? (
            <DropdownItem
              label={t('billingData')}
              onClick={() => {
                setOpen(false)
                onDatosCobro()
              }}
            />
          ) : null}
          <DropdownItem
            label={t('settings')}
            href="/dashboard/settings"
            onNavigate={() => setOpen(false)}
          />
          <DropdownItem
            label={t('signOut')}
            onClick={() => {
              setOpen(false)
              onSignOut()
            }}
          />
        </div>
      )}
    </div>
  )
}

function DropdownItem({
  label,
  href,
  onClick,
  onNavigate,
}: {
  label: string
  href?: string
  onClick?: () => void
  onNavigate?: () => void
}) {
  const style: React.CSSProperties = {
    display: 'block',
    width: '100%',
    textAlign: 'left',
    padding: '10px 14px',
    fontSize: 13,
    color: 'var(--fg-0)',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    textDecoration: 'none',
    fontFamily: 'inherit',
  }

  if (href) {
    return (
      <Link href={href} role="menuitem" style={style} onClick={onNavigate}>
        {label}
      </Link>
    )
  }

  return (
    <button type="button" role="menuitem" style={style} onClick={onClick}>
      {label}
    </button>
  )
}
