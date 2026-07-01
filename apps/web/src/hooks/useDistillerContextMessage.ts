'use client'

import { useCallback } from 'react'
import { useTranslations } from 'next-intl'
import type { DestLoteEstado } from '@/lib/proof/destilador-types'

export function useDistillerContextMessage() {
  const t = useTranslations('distiller.lotes.context')

  return useCallback(
    (
      estado: DestLoteEstado,
      opts?: { diasEnBodega?: number; litrosGranel?: number }
    ): string => {
      const dias = opts?.diasEnBodega ?? 0
      const litros = opts?.litrosGranel ?? 0

      switch (estado) {
        case 'en_bodega_crudo':
          if (dias > 30) return t('enBodegaCrudoStale', { days: dias })
          if (litros > 0) return t('enBodegaCrudoReady', { liters: litros })
          return t('enBodegaCrudoAvailable')
        case 'en_produccion':
          return t('enProduccion')
        case 'terminado':
          return t('terminado')
        case 'vendido_parcial':
          return t('vendidoParcial')
        default:
          return ''
      }
    },
    [t]
  )
}
