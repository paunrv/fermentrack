import type {
  DestCorridaEstado,
  DestCorridaModo,
  DestLoteEstado,
  DestViajeEstado,
} from '@/lib/proof/destilador-types'

export type DistillerTranslate = (
  key: string,
  values?: Record<string, string | number>
) => string

export function viajeStatusLabel(
  t: (key: DestViajeEstado) => string,
  estado: DestViajeEstado
): string {
  return t(estado)
}

export function loteStatusLabel(
  t: (key: DestLoteEstado) => string,
  estado: DestLoteEstado
): string {
  return t(estado)
}

export function corridaStatusLabel(
  t: (key: DestCorridaEstado) => string,
  estado: DestCorridaEstado
): string {
  return t(estado)
}

export function corridaModoLabel(
  t: (key: DestCorridaModo) => string,
  modo: DestCorridaModo
): string {
  return t(modo)
}
