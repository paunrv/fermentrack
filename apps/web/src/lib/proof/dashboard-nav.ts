import type { ExtraProfile, Profile } from '@/lib/supabase'

export type DashboardRole = ExtraProfile | 'producer'

export type NavItemDef = {
  href: string
  labelKey: string
  roles: DashboardRole[] | 'all'
}

export const PRODUCERS: ExtraProfile[] = ['brewer', 'winemaker', 'distiller']

export const NAV_OPERACION_DEFS: NavItemDef[] = [
  { href: '/dashboard', labelKey: 'nav.home', roles: 'all' },
  { href: '/dashboard/inventario', labelKey: 'nav.inventory', roles: 'all' },
  { href: '/dashboard/pedidos', labelKey: 'nav.orders', roles: ['distributor'] },
  { href: '/dashboard/movimientos', labelKey: 'nav.movements', roles: 'all' },
  { href: '/dashboard/productos', labelKey: 'nav.catalog', roles: 'all' },
]

export const NAV_FINANZAS_DEFS: NavItemDef[] = [
  { href: '/dashboard/clientes', labelKey: 'nav.clients', roles: ['distributor'] },
  { href: '/dashboard/credito', labelKey: 'nav.credit', roles: ['distributor'] },
  { href: '/dashboard/productores', labelKey: 'nav.producers', roles: ['distributor'] },
]

export const NAV_RECEPCION_DEFS: NavItemDef[] = [
  { href: '/dashboard/recepcion', labelKey: 'nav.receiving', roles: ['distributor'] },
  { href: '/dashboard/remisiones', labelKey: 'nav.remissions', roles: ['distributor'] },
]

export const NAV_DESTILADOR_DEFS: NavItemDef[] = [
  { href: '/dashboard/destilador/compras', labelKey: 'nav.distillerPurchases', roles: ['distiller'] },
  { href: '/dashboard/destilador/lotes', labelKey: 'nav.distillerLots', roles: ['distiller'] },
  { href: '/dashboard/destilador/produccion', labelKey: 'nav.distillerProduction', roles: ['distiller'] },
  { href: '/dashboard/destilador/bodega', labelKey: 'nav.distillerCellar', roles: ['distiller'] },
  { href: '/dashboard/destilador/ventas', labelKey: 'nav.distillerSales', roles: ['distiller'] },
]

export const NAV_WINEMAKER_DEFS: NavItemDef[] = [
  { href: '/dashboard/winemaker/lotes', labelKey: 'nav.winemakerLots', roles: ['winemaker'] },
  { href: '/dashboard/lab', labelKey: 'nav.winemakerLab', roles: ['winemaker'] },
  { href: '/dashboard/winemaker/bodega', labelKey: 'nav.winemakerCellar', roles: ['winemaker'] },
  { href: '/dashboard/winemaker/proveedores', labelKey: 'nav.winemakerSuppliers', roles: ['winemaker'] },
  { href: '/dashboard/winemaker/documentos', labelKey: 'nav.winemakerDocuments', roles: ['winemaker'] },
  { href: '/dashboard/winemaker/gastos', labelKey: 'nav.winemakerExpenses', roles: ['winemaker'] },
  { href: '/dashboard/winemaker/agenda', labelKey: 'nav.winemakerAgenda', roles: ['winemaker'] },
]

export const NAV_LEGACY_DEFS: NavItemDef[] = [
  { href: '/dashboard/clientes', labelKey: 'nav.clients', roles: ['producer'] },
]

export const ALL_NAV_DEFS: NavItemDef[] = [
  ...NAV_OPERACION_DEFS,
  ...NAV_FINANZAS_DEFS,
  ...NAV_RECEPCION_DEFS,
  ...NAV_DESTILADOR_DEFS,
  ...NAV_WINEMAKER_DEFS,
  ...NAV_LEGACY_DEFS,
]

export function visibleNavDefs(active: Profile | null): NavItemDef[] {
  if (!active) return NAV_OPERACION_DEFS
  // Super users keep elevated access elsewhere; nav follows the active profile type.
  const isProducer = PRODUCERS.includes(active.profile_type_v2)
  const isDistiller = active.profile_type_v2 === 'distiller'
  const isWinemaker = active.profile_type_v2 === 'winemaker'
  return ALL_NAV_DEFS.filter(n => {
    if (n.roles === 'all') {
      if (
        (isDistiller || isWinemaker) &&
        (n.href === '/dashboard/inventario' ||
          n.href === '/dashboard/movimientos' ||
          n.href === '/dashboard/productos')
      ) {
        return false
      }
      return true
    }
    return n.roles.some(r =>
      r === 'producer' ? isProducer && !isDistiller && !isWinemaker : r === active.profile_type_v2
    )
  })
}

export function pageTitleForPath(
  path: string,
  t: (key: string) => string
): string {
  const rules: [string, string][] = [
    ['/dashboard/winemaker/lotes/', 'pageTitles.winemakerLotDetail'],
    ['/dashboard/winemaker/agenda', 'pageTitles.winemakerAgenda'],
    ['/dashboard/winemaker/gastos', 'pageTitles.winemakerExpenses'],
    ['/dashboard/winemaker/documentos', 'pageTitles.winemakerDocuments'],
    ['/dashboard/winemaker/proveedores', 'pageTitles.winemakerSuppliers'],
    ['/dashboard/winemaker/lotes', 'pageTitles.winemakerLots'],
    ['/dashboard/lab', 'pageTitles.winemakerLab'],
    ['/dashboard/winemaker/bodega', 'pageTitles.winemakerCellar'],
    ['/dashboard/winemaker/chat', 'pageTitles.teamChat'],
    ['/dashboard/equipo', 'pageTitles.team'],
    ['/dashboard/destilador/lotes/', 'pageTitles.distillerLotDetail'],
    ['/dashboard/destilador/compras', 'pageTitles.distillerPurchases'],
    ['/dashboard/destilador/produccion', 'pageTitles.distillerProduction'],
    ['/dashboard/destilador/bodega', 'pageTitles.distillerCellar'],
    ['/dashboard/destilador/ventas', 'pageTitles.distillerSales'],
    ['/dashboard/destilador/lotes', 'pageTitles.distillerLots'],
    ['/dashboard/settings', 'pageTitles.settings'],
    ['/dashboard/conectar', 'pageTitles.connect'],
    ['/dashboard/costos', 'pageTitles.costs'],
    ['/dashboard/muestras', 'pageTitles.samples'],
    ['/dashboard/embotellado', 'pageTitles.bottling'],
    ['/dashboard/lotes', 'pageTitles.lots'],
    ['/dashboard/bodega', 'pageTitles.warehouse'],
    ['/dashboard/agente', 'pageTitles.agent'],
    ['/dashboard/clientes', 'pageTitles.clients'],
    ['/dashboard/etiquetas', 'pageTitles.labels'],
    ['/dashboard/remisiones', 'pageTitles.remissions'],
    ['/dashboard/recepcion', 'pageTitles.receivingPhoto'],
    ['/dashboard/productores', 'pageTitles.producers'],
    ['/dashboard/credito', 'pageTitles.credit'],
    ['/dashboard/productos', 'pageTitles.catalog'],
    ['/dashboard/movimientos', 'pageTitles.movements'],
    ['/dashboard/pedidos', 'pageTitles.orders'],
    ['/dashboard/inventario', 'pageTitles.inventory'],
    ['/dashboard', 'pageTitles.home'],
  ]

  for (const [prefix, key] of rules) {
    if (prefix === '/dashboard' && path === '/dashboard') return t(key)
    if (prefix !== '/dashboard' && path.startsWith(prefix)) return t(key)
  }
  return t('pageTitles.fallback')
}
