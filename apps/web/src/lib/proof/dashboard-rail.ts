import type { ReactNode } from 'react'
import type { Profile } from '@/lib/supabase'
import type { RailIconName } from '@/lib/proof/dashboard-rail-icons'

export type RailGroupId = 'operacion' | 'equipo' | 'configuracion'

export type RailNavItemDef = {
  href: string
  labelKey: string
  icon: RailIconName
}

export type RailGroup = {
  id: RailGroupId
  labelKey: string
  items: RailNavItemDef[]
}

export type RailBuildContext = {
  profile: Profile | null
  isWinemaker: boolean
  chatEnabled: boolean
  showEquipo: boolean
}

const WINEMAKER_OPERACION: RailNavItemDef[] = [
  { href: '/dashboard', labelKey: 'nav.home', icon: 'home' },
  { href: '/dashboard/winemaker/lotes', labelKey: 'nav.winemakerLots', icon: 'lots' },
  { href: '/dashboard/lab', labelKey: 'nav.winemakerLab', icon: 'lab' },
  { href: '/dashboard/winemaker/bodega', labelKey: 'nav.winemakerCellar', icon: 'cellar' },
  { href: '/dashboard/winemaker/documentos', labelKey: 'nav.winemakerDocuments', icon: 'documents' },
  { href: '/dashboard/winemaker/proveedores', labelKey: 'nav.winemakerSuppliers', icon: 'suppliers' },
  { href: '/dashboard/winemaker/gastos', labelKey: 'nav.winemakerExpenses', icon: 'expenses' },
]

const WINEMAKER_EQUIPO: RailNavItemDef[] = [
  { href: '/dashboard/equipo', labelKey: 'nav.team', icon: 'team' },
  { href: '/dashboard/winemaker/agenda', labelKey: 'nav.winemakerAgenda', icon: 'agenda' },
]

const DISTRIBUTOR_OPERACION: RailNavItemDef[] = [
  { href: '/dashboard', labelKey: 'nav.home', icon: 'home' },
  { href: '/dashboard/inventario', labelKey: 'nav.inventory', icon: 'inventory' },
  { href: '/dashboard/pedidos', labelKey: 'nav.orders', icon: 'orders' },
  { href: '/dashboard/movimientos', labelKey: 'nav.movements', icon: 'movements' },
  { href: '/dashboard/productos', labelKey: 'nav.catalog', icon: 'catalog' },
  { href: '/dashboard/recepcion', labelKey: 'nav.receiving', icon: 'receiving' },
  { href: '/dashboard/remisiones', labelKey: 'nav.remissions', icon: 'remissions' },
]

const DISTRIBUTOR_EQUIPO: RailNavItemDef[] = [
  { href: '/dashboard/clientes', labelKey: 'nav.clients', icon: 'clients' },
  { href: '/dashboard/credito', labelKey: 'nav.credit', icon: 'credit' },
  { href: '/dashboard/productores', labelKey: 'nav.producers', icon: 'producers' },
]

const DISTILLER_OPERACION: RailNavItemDef[] = [
  { href: '/dashboard', labelKey: 'nav.home', icon: 'home' },
  { href: '/dashboard/destilador/compras', labelKey: 'nav.distillerPurchases', icon: 'purchases' },
  { href: '/dashboard/destilador/lotes', labelKey: 'nav.distillerLots', icon: 'lots' },
  { href: '/dashboard/destilador/produccion', labelKey: 'nav.distillerProduction', icon: 'production' },
  { href: '/dashboard/destilador/bodega', labelKey: 'nav.distillerCellar', icon: 'cellar' },
  { href: '/dashboard/destilador/ventas', labelKey: 'nav.distillerSales', icon: 'sales' },
]

const PRODUCER_OPERACION: RailNavItemDef[] = [
  { href: '/dashboard', labelKey: 'nav.home', icon: 'home' },
  { href: '/dashboard/inventario', labelKey: 'nav.inventory', icon: 'inventory' },
  { href: '/dashboard/movimientos', labelKey: 'nav.movements', icon: 'movements' },
  { href: '/dashboard/productos', labelKey: 'nav.catalog', icon: 'catalog' },
  { href: '/dashboard/clientes', labelKey: 'nav.clients', icon: 'clients' },
]

const CONFIG_ITEMS: RailNavItemDef[] = [
  { href: '/dashboard/conectar', labelKey: 'nav.connectAgent', icon: 'connect' },
  { href: '/dashboard/settings', labelKey: 'nav.settings', icon: 'settings' },
]

function dedupeItems(items: RailNavItemDef[]): RailNavItemDef[] {
  const seen = new Set<string>()
  const out: RailNavItemDef[] = []
  for (const item of items) {
    if (seen.has(item.href)) continue
    seen.add(item.href)
    out.push(item)
  }
  return out
}

function filterWinemakerEquipo(items: RailNavItemDef[], ctx: RailBuildContext): RailNavItemDef[] {
  return items.filter(item => {
    if (item.href === '/dashboard/equipo') return ctx.showEquipo
    return true
  })
}

function profileKind(
  ctx: RailBuildContext
): 'super' | 'winemaker' | 'distributor' | 'distiller' | 'producer' | 'default' {
  if (ctx.profile?.is_super_user) return 'super'
  if (ctx.profile?.profile_type_v2 === 'distributor') return 'distributor'
  if (ctx.profile?.profile_type_v2 === 'distiller') return 'distiller'
  if (ctx.profile?.profile_type_v2 === 'brewer') return 'producer'
  if (ctx.isWinemaker || ctx.profile?.profile_type_v2 === 'winemaker') return 'winemaker'
  return 'default'
}

function groupsForProfile(ctx: RailBuildContext): { main: RailGroup[]; config: RailGroup } {
  const kind = profileKind(ctx)

  if (kind === 'super') {
    const operacion = dedupeItems([
      ...WINEMAKER_OPERACION,
      ...DISTRIBUTOR_OPERACION.filter(i => i.href !== '/dashboard'),
      ...DISTILLER_OPERACION.filter(i => i.href !== '/dashboard'),
      ...PRODUCER_OPERACION.filter(i => i.href !== '/dashboard'),
    ])
    const equipo = dedupeItems([
      ...filterWinemakerEquipo(WINEMAKER_EQUIPO, ctx),
      ...DISTRIBUTOR_EQUIPO,
    ])
    return {
      main: [
        { id: 'operacion', labelKey: 'rail.groups.operacion', items: operacion },
        ...(equipo.length > 0
          ? [{ id: 'equipo' as const, labelKey: 'rail.groups.equipo', items: equipo }]
          : []),
      ],
      config: { id: 'configuracion', labelKey: 'rail.groups.configuracion', items: CONFIG_ITEMS },
    }
  }

  if (kind === 'winemaker') {
    return {
      main: [
        { id: 'operacion', labelKey: 'rail.groups.operacion', items: WINEMAKER_OPERACION },
        {
          id: 'equipo',
          labelKey: 'rail.groups.equipo',
          items: filterWinemakerEquipo(WINEMAKER_EQUIPO, ctx),
        },
      ],
      config: { id: 'configuracion', labelKey: 'rail.groups.configuracion', items: CONFIG_ITEMS },
    }
  }

  if (kind === 'distributor') {
    return {
      main: [
        { id: 'operacion', labelKey: 'rail.groups.operacion', items: DISTRIBUTOR_OPERACION },
        { id: 'equipo', labelKey: 'rail.groups.equipo', items: DISTRIBUTOR_EQUIPO },
      ],
      config: { id: 'configuracion', labelKey: 'rail.groups.configuracion', items: CONFIG_ITEMS },
    }
  }

  if (kind === 'distiller') {
    return {
      main: [{ id: 'operacion', labelKey: 'rail.groups.operacion', items: DISTILLER_OPERACION }],
      config: { id: 'configuracion', labelKey: 'rail.groups.configuracion', items: CONFIG_ITEMS },
    }
  }

  if (kind === 'producer') {
    return {
      main: [{ id: 'operacion', labelKey: 'rail.groups.operacion', items: PRODUCER_OPERACION }],
      config: { id: 'configuracion', labelKey: 'rail.groups.configuracion', items: CONFIG_ITEMS },
    }
  }

  return {
    main: [
      {
        id: 'operacion',
        labelKey: 'rail.groups.operacion',
        items: [{ href: '/dashboard', labelKey: 'nav.home', icon: 'home' }],
      },
    ],
    config: { id: 'configuracion', labelKey: 'rail.groups.configuracion', items: CONFIG_ITEMS },
  }
}

export type DashboardRailModel = {
  mainGroups: RailGroup[]
  configGroup: RailGroup
  flatItems: RailNavItemDef[]
  showChatToggle: boolean
}

export function buildDashboardRail(ctx: RailBuildContext): DashboardRailModel {
  const { main, config } = groupsForProfile(ctx)
  const mainGroups = main
    .map(group => ({ ...group, items: dedupeItems(group.items) }))
    .filter(group => group.items.length > 0)

  const flatItems = dedupeItems([
    ...mainGroups.flatMap(group => group.items),
    ...config.items,
  ])

  return {
    mainGroups,
    configGroup: config,
    flatItems,
    showChatToggle: ctx.isWinemaker && ctx.chatEnabled,
  }
}

/** Detect duplicate hrefs — used in tests and B1 audit. */
export function findDuplicateRailHrefs(items: RailNavItemDef[]): string[] {
  const seen = new Set<string>()
  const dupes: string[] = []
  for (const item of items) {
    if (seen.has(item.href)) dupes.push(item.href)
    seen.add(item.href)
  }
  return dupes
}

export type FlatNavItem = {
  href: string
  label: string
  icon: ReactNode
}
