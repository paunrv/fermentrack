import type { ExtraProfile } from '@/lib/supabase'

// Guardas de ruta por perfil. Winemaker → org tenancy v1 (epic #3). Ver docs/ORG-TENANCY.md

/** Subpáginas con estilo canvas (fondo claro, sin topbar oscuro). */
export const CANVAS_STYLE_PREFIXES = ['/dashboard/credito'] as const

/** Rutas PROOF Destilador (mezcal / Patrón). */
export const DESTILADOR_PREFIXES = [
  '/dashboard/destilador',
] as const

/** Rutas PROOF Winemaker (viñedo / bodega). */
export const WINEMAKER_PREFIXES = [
  '/dashboard/winemaker',
] as const

/** Rutas solo distribuidor (winemaker y destilador no deben entrar). */
export const DISTRIBUTOR_ONLY_PREFIXES = [
  '/dashboard/inventario',
  '/dashboard/pedidos',
  '/dashboard/movimientos',
  '/dashboard/productos',
  '/dashboard/clientes',
  '/dashboard/credito',
  '/dashboard/productores',
  '/dashboard/recepcion',
  '/dashboard/remisiones',
] as const

/** Rutas legacy productor (brewer / winemaker; distiller usa destilador). */
export const PRODUCER_ONLY_PREFIXES = [
  '/dashboard/lotes',
  '/dashboard/bodega',
  '/dashboard/embotellado',
  '/dashboard/muestras',
  '/dashboard/costos',
  '/dashboard/etiquetas',
  '/dashboard/agente',
] as const

export function isCanvasStylePath(pathname: string): boolean {
  return CANVAS_STYLE_PREFIXES.some(
    prefix => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
}

export function isDestiladorPath(pathname: string): boolean {
  return DESTILADOR_PREFIXES.some(
    prefix => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
}

export function isWinemakerPath(pathname: string): boolean {
  return WINEMAKER_PREFIXES.some(
    prefix => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
}

export function isDistributorOnlyPath(pathname: string): boolean {
  return DISTRIBUTOR_ONLY_PREFIXES.some(
    prefix => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
}

export function isProducerOnlyPath(pathname: string): boolean {
  return PRODUCER_ONLY_PREFIXES.some(
    prefix => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
}

export function isProducerProfile(profileType: ExtraProfile | null | undefined): boolean {
  return profileType === 'brewer' || profileType === 'winemaker' || profileType === 'distiller'
}

/** Distribuidor no debe acceder a pantallas de fermentación / agente legacy / winemaker / destilador. */
export function distributorBlockedFromPath(
  profileType: ExtraProfile | null | undefined,
  pathname: string
): boolean {
  return (
    profileType === 'distributor' &&
    (isProducerOnlyPath(pathname) || isDestiladorPath(pathname) || isWinemakerPath(pathname))
  )
}

/** Destilador (mezcal) usa /dashboard/destilador, no fermentación legacy. */
export function distillerBlockedFromPath(
  profileType: ExtraProfile | null | undefined,
  pathname: string
): boolean {
  return profileType === 'distiller' && isProducerOnlyPath(pathname)
}

/** Winemaker usa /dashboard/winemaker, no legacy ni pantallas distribuidor. */
export function winemakerBlockedFromPath(
  profileType: ExtraProfile | null | undefined,
  pathname: string
): boolean {
  if (profileType !== 'winemaker') return false
  return isProducerOnlyPath(pathname) || isDistributorOnlyPath(pathname) || isDestiladorPath(pathname)
}

/** Destilador no entra a rutas winemaker. */
export function distillerBlockedFromWinemakerPath(
  profileType: ExtraProfile | null | undefined,
  pathname: string
): boolean {
  return profileType === 'distiller' && isWinemakerPath(pathname)
}

/** Distribuidor no entra a rutas winemaker. */
export function distributorBlockedFromWinemakerPath(
  profileType: ExtraProfile | null | undefined,
  pathname: string
): boolean {
  return profileType === 'distributor' && isWinemakerPath(pathname)
}
