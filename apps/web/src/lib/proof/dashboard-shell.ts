import type { ExtraProfile } from '@/lib/supabase'
import type { ShellBreakpoint } from '@/lib/ui/breakpoints'
import {
  isDestiladorPath,
  isDistributorOnlyPath,
  isProducerOnlyPath,
  isWinemakerPath,
} from '@/lib/proof/dashboard-routes'

/** Ancho del panel de chat de equipo (px). */
export const TEAM_CHAT_PANEL_WIDTH_PX = 280

/** Ancho del rail lateral desktop (px). */
export const DASHBOARD_RAIL_WIDTH_PX = 52

/** Ancho del rail expandido con etiquetas visibles (px). */
export const DASHBOARD_RAIL_WIDTH_EXPANDED_PX = 220

export function dashboardRailWidthPx(expanded: boolean): number {
  return expanded ? DASHBOARD_RAIL_WIDTH_EXPANDED_PX : DASHBOARD_RAIL_WIDTH_PX
}

export const DASHBOARD_CANVAS_HEADER_HEIGHT_PX = 64

export function shouldShowDesktopRailForBreakpoint(breakpoint: ShellBreakpoint): boolean {
  return breakpoint !== 'mobile'
}

/** @deprecated Prefer shouldShowDesktopRailForBreakpoint */
export function shouldShowDesktopRail(isMobile: boolean): boolean {
  return !isMobile
}

export function shouldShowTeamChatDock(
  breakpoint: ShellBreakpoint,
  isWinemaker: boolean
): boolean {
  return isWinemaker && breakpoint !== 'mobile'
}

export function shouldShowWinemakerMobileNav(
  breakpoint: ShellBreakpoint,
  isWinemaker: boolean
): boolean {
  return isWinemaker && breakpoint === 'mobile'
}

export function shouldShowBottomNav(
  breakpoint: ShellBreakpoint,
  isWinemaker: boolean
): boolean {
  return breakpoint === 'mobile' && !shouldShowWinemakerMobileNav(breakpoint, isWinemaker)
}

export function shellHorizontalPadding(breakpoint: ShellBreakpoint): number {
  switch (breakpoint) {
    case 'mobile':
      return 16
    case 'tablet':
      return 20
    default:
      return 28
  }
}

export function innerHeaderAskMaxWidth(breakpoint: ShellBreakpoint): number {
  return breakpoint === 'desktop' ? 560 : 480
}

export function isDashboardNavItemActive(pathname: string, href: string): boolean {
  return pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
}

/**
 * Header de página operativa (título + ask bar). Canvas y agente usan su propio chrome.
 */
export function shouldShowDashboardInnerHeader(options: {
  pathname: string
  isCanvas: boolean
  isCanvasStyle: boolean
  isOnAssistant: boolean
  profileType: ExtraProfile | null | undefined
  isWinemaker: boolean
}): boolean {
  const { pathname, isCanvas, isCanvasStyle, isOnAssistant, profileType, isWinemaker } =
    options

  if (isCanvas || isCanvasStyle || isOnAssistant) return false

  const isDistributor = profileType === 'distributor'
  const isDistiller = profileType === 'distiller'

  if (
    isDistributor &&
    (isProducerOnlyPath(pathname) || isDestiladorPath(pathname) || isWinemakerPath(pathname))
  ) {
    return false
  }
  if (isDistiller && (isProducerOnlyPath(pathname) || isWinemakerPath(pathname))) {
    return false
  }
  if (
    isWinemaker &&
    (isProducerOnlyPath(pathname) || isDistributorOnlyPath(pathname) || isDestiladorPath(pathname))
  ) {
    return false
  }

  return true
}
