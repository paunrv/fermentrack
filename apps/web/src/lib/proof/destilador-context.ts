import type { DestLoteEstado } from '@/lib/proof/destilador-types'

/**
 * @deprecated Use `useDistillerContextMessage` from `@/hooks/useDistillerContextMessage` in client components.
 */
export function mensajeContextualLote(
  estado: DestLoteEstado,
  opts?: { diasEnBodega?: number; litrosGranel?: number }
): string {
  const dias = opts?.diasEnBodega ?? 0
  const litros = opts?.litrosGranel ?? 0

  switch (estado) {
    case 'en_bodega_crudo':
      if (dias > 30) {
        return `Lleva ${dias} días en crudo sin embotellar. Cada día es costo de oportunidad.`
      }
      return `${litros > 0 ? `${litros} L listos` : 'Granel disponible'} — inicia una corrida cuando tengas botellas y etiquetas.`
    case 'en_produccion':
      return 'Corrida activa. Al cerrar se calcula costo real por botella y el lote pasa a terminado.'
    case 'terminado':
      return 'Lote embotellado. Revisa costo por botella antes de fijar precios de venta.'
    case 'vendido_parcial':
      return 'Queda inventario mixto (granel y/o botellas). No mezcles lotes en un mismo pedido.'
    default:
      return ''
  }
}
