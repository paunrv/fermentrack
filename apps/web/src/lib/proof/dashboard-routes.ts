import type { ExtraProfile } from '@/lib/supabase'

/** Rutas exclusivas de perfiles productor (brewer / winemaker / distiller). */
export const PRODUCER_ONLY_PREFIXES = [
  '/dashboard/lotes',
  '/dashboard/bodega',
  '/dashboard/embotellado',
  '/dashboard/muestras',
  '/dashboard/costos',
  '/dashboard/etiquetas',
  '/dashboard/agente',
] as const

export function isProducerOnlyPath(pathname: string): boolean {
  return PRODUCER_ONLY_PREFIXES.some(
    prefix => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
}

export function isProducerProfile(profileType: ExtraProfile | null | undefined): boolean {
  return profileType === 'brewer' || profileType === 'winemaker' || profileType === 'distiller'
}

/** Distribuidor no debe acceder a pantallas de fermentación / agente legacy. */
export function distributorBlockedFromPath(
  profileType: ExtraProfile | null | undefined,
  pathname: string
): boolean {
  return profileType === 'distributor' && isProducerOnlyPath(pathname)
}
