import { describe, expect, it } from 'vitest'
import {
  isDashboardNavItemActive,
  shouldShowDashboardInnerHeader,
  shouldShowBottomNav,
  shouldShowDesktopRail,
  shouldShowDesktopRailForBreakpoint,
  shouldShowWinemakerMobileNav,
  resolveShellProfileType,
  isWinemakerShellMode,
  shellHorizontalPadding,
} from '@/lib/proof/dashboard-shell'

describe('dashboard-shell', () => {
  it('shows desktop rail on tablet and desktop', () => {
    expect(shouldShowDesktopRailForBreakpoint('tablet')).toBe(true)
    expect(shouldShowDesktopRailForBreakpoint('desktop')).toBe(true)
    expect(shouldShowDesktopRailForBreakpoint('mobile')).toBe(false)
  })

  it('shows desktop rail when not mobile (legacy)', () => {
    expect(shouldShowDesktopRail(false)).toBe(true)
    expect(shouldShowDesktopRail(true)).toBe(false)
  })

  it('uses winemaker mobile nav only on mobile', () => {
    expect(shouldShowWinemakerMobileNav('mobile', true)).toBe(true)
    expect(shouldShowWinemakerMobileNav('tablet', true)).toBe(false)
    expect(shouldShowWinemakerMobileNav('mobile', false)).toBe(false)
  })

  it('shows bottom nav only on mobile without winemaker nav', () => {
    expect(shouldShowBottomNav('mobile', false)).toBe(true)
    expect(shouldShowBottomNav('mobile', true)).toBe(false)
    expect(shouldShowBottomNav('tablet', false)).toBe(false)
  })

  it('uses tiered horizontal padding', () => {
    expect(shellHorizontalPadding('mobile')).toBe(16)
    expect(shellHorizontalPadding('tablet')).toBe(20)
    expect(shellHorizontalPadding('desktop')).toBe(28)
  })

  it('marks nav item active for exact and nested paths', () => {
    expect(isDashboardNavItemActive('/dashboard/inventario', '/dashboard/inventario')).toBe(true)
    expect(isDashboardNavItemActive('/dashboard/inventario/foo', '/dashboard/inventario')).toBe(
      true
    )
    expect(isDashboardNavItemActive('/dashboard', '/dashboard')).toBe(true)
    expect(isDashboardNavItemActive('/dashboard/inventario', '/dashboard')).toBe(false)
  })

  it('resolves bodega team shell in winemaker org', () => {
    expect(
      resolveShellProfileType({
        profileType: 'bodega',
        orgType: 'winemaker',
      })
    ).toBe('bodega')
    expect(
      isWinemakerShellMode({
        profileType: 'bodega',
        orgType: 'winemaker',
      })
    ).toBe(true)
  })

  it('prefers legacy distributor profile over winemaker org for shell badge', () => {
    expect(
      resolveShellProfileType({
        profileType: 'distributor',
        orgType: 'winemaker',
      })
    ).toBe('distributor')
    expect(
      isWinemakerShellMode({
        profileType: 'distributor',
        orgType: 'winemaker',
      })
    ).toBe(false)
    expect(
      resolveShellProfileType({
        profileType: undefined,
        orgType: 'winemaker',
      })
    ).toBe('winemaker')
  })

  it('hides inner header on winemaker mobile shell (bottom nav)', () => {
    expect(
      shouldShowDashboardInnerHeader({
        pathname: '/dashboard/equipo',
        isCanvas: false,
        isCanvasStyle: false,
        isOnAssistant: false,
        profileType: 'winemaker',
        isWinemaker: true,
        showWinemakerMobileNav: true,
      })
    ).toBe(false)
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
