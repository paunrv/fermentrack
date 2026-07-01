import type { ExtraProfile } from '@/lib/supabase'
import {
  isDestiladorPath,
  isDistributorOnlyPath,
  isProducerOnlyPath,
  isWinemakerPath,
} from '@/lib/proof/dashboard-routes'

/** Ancho del rail lateral desktop (px). */
export const DASHBOARD_RAIL_WIDTH_PX = 52

export const DASHBOARD_CANVAS_HEADER_HEIGHT_PX = 64

export function shouldShowDesktopRail(isMobile: boolean): boolean {
  return !isMobile
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
