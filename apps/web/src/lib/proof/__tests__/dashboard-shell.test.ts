import { describe, expect, it } from 'vitest'
import {
  isDashboardNavItemActive,
  shouldShowDashboardInnerHeader,
  shouldShowDesktopRail,
} from '@/lib/proof/dashboard-shell'

describe('dashboard-shell', () => {
  it('shows desktop rail when not mobile', () => {
    expect(shouldShowDesktopRail(false)).toBe(true)
    expect(shouldShowDesktopRail(true)).toBe(false)
  })

  it('marks nav item active for exact and nested paths', () => {
    expect(isDashboardNavItemActive('/dashboard/inventario', '/dashboard/inventario')).toBe(true)
    expect(isDashboardNavItemActive('/dashboard/inventario/foo', '/dashboard/inventario')).toBe(
      true
    )
    expect(isDashboardNavItemActive('/dashboard', '/dashboard')).toBe(true)
    expect(isDashboardNavItemActive('/dashboard/inventario', '/dashboard')).toBe(false)
  })

  it('hides inner header on canvas, canvas-style, and assistant routes', () => {
    const base = {
      pathname: '/dashboard/inventario',
      isCanvas: false,
      isCanvasStyle: false,
      isOnAssistant: false,
      profileType: 'distributor' as const,
      isWinemaker: false,
    }

    expect(shouldShowDashboardInnerHeader(base)).toBe(true)
    expect(shouldShowDashboardInnerHeader({ ...base, isCanvas: true })).toBe(false)
    expect(shouldShowDashboardInnerHeader({ ...base, isCanvasStyle: true })).toBe(false)
    expect(shouldShowDashboardInnerHeader({ ...base, isOnAssistant: true })).toBe(false)
  })

  it('hides inner header when profile cannot access route', () => {
    expect(
      shouldShowDashboardInnerHeader({
        pathname: '/dashboard/winemaker/lotes',
        isCanvas: false,
        isCanvasStyle: false,
        isOnAssistant: false,
        profileType: 'distributor',
        isWinemaker: false,
      })
    ).toBe(false)

    expect(
      shouldShowDashboardInnerHeader({
        pathname: '/dashboard/inventario',
        isCanvas: false,
        isCanvasStyle: false,
        isOnAssistant: false,
        profileType: 'winemaker',
        isWinemaker: true,
      })
    ).toBe(false)
  })
})
