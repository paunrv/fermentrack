import { describe, expect, it } from 'vitest'
import { buildDashboardRail, findDuplicateRailHrefs } from '@/lib/proof/dashboard-rail'
import type { Profile } from '@/lib/supabase'

const winemakerProfile = {
  profile_type_v2: 'winemaker',
  is_super_user: false,
} as Profile

const distributorProfile = {
  profile_type_v2: 'distributor',
  is_super_user: false,
} as Profile

describe('buildDashboardRail', () => {
  it('groups winemaker rail into operacion, equipo, and config', () => {
    const model = buildDashboardRail({
      profile: winemakerProfile,
      isWinemaker: true,
      chatEnabled: true,
      showEquipo: true,
    })

    expect(model.mainGroups.map(group => group.id)).toEqual(['operacion', 'equipo'])
    expect(model.configGroup.id).toBe('configuracion')
    expect(findDuplicateRailHrefs(model.flatItems)).toEqual([])
    expect(model.showChatToggle).toBe(true)
  })

  it('bodega team gets minimal rail: home, agenda, settings, chat', () => {
    const model = buildDashboardRail({
      profile: { profile_type_v2: 'bodega', is_super_user: false } as Profile,
      isWinemaker: false,
      chatEnabled: true,
      showEquipo: false,
    })

    expect(model.mainGroups.map(group => group.id)).toEqual(['operacion'])
    expect(model.mainGroups[0]?.items.map(i => i.href)).toEqual([
      '/dashboard',
      '/dashboard/winemaker/agenda',
    ])
    expect(model.configGroup.items.map(i => i.href)).toEqual(['/dashboard/settings'])
    expect(model.showChatToggle).toBe(true)
  })

  it('hides equipo link when showEquipo is false', () => {
    const model = buildDashboardRail({
      profile: winemakerProfile,
      isWinemaker: true,
      chatEnabled: false,
      showEquipo: false,
    })

    expect(model.mainGroups.find(group => group.id === 'equipo')?.items.map(i => i.href)).toEqual([
      '/dashboard/winemaker/agenda',
    ])
  })

  it('dedupes distributor items and uses unique hrefs', () => {
    const model = buildDashboardRail({
      profile: distributorProfile,
      isWinemaker: false,
      chatEnabled: false,
      showEquipo: false,
    })

    expect(findDuplicateRailHrefs(model.flatItems)).toEqual([])
    expect(model.flatItems.some(item => item.href === '/dashboard/conectar')).toBe(true)
    expect(model.flatItems.some(item => item.href === '/dashboard/settings')).toBe(true)
  })

  it('keeps distributor rail when legacy profile wins over winemaker org flag', () => {
    const model = buildDashboardRail({
      profile: distributorProfile,
      isWinemaker: true,
      chatEnabled: false,
      showEquipo: false,
    })

    expect(model.flatItems.some(item => item.href === '/dashboard/inventario')).toBe(true)
    expect(model.flatItems.some(item => item.href === '/dashboard/winemaker/lotes')).toBe(false)
  })

  it('uses two main groups max for distiller (operacion only)', () => {
    const model = buildDashboardRail({
      profile: { profile_type_v2: 'distiller', is_super_user: false } as Profile,
      isWinemaker: false,
      chatEnabled: false,
      showEquipo: false,
    })

    expect(model.mainGroups).toHaveLength(1)
    expect(model.mainGroups[0]?.id).toBe('operacion')
  })
})
