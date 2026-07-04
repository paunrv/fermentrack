import { LOT_ETAPA_VALUES, type LotEtapa } from '@/lib/proof/lot-etapa'
import type { PipelineLot } from '@/lib/proof/pipeline-lot-meta'
import type { OwnerAlertDescriptor } from '@/lib/proof/winemaker-owner-alerts'

export type WineryHealthStatus = 'todo_en_orden' | 'requiere_atencion'

export type WineryPipelineSummary = {
  salud: WineryHealthStatus
  lotes_requieren_atencion: number
  lotes_activos: number
  conteo_por_etapa: Record<LotEtapa, number>
}

export function buildWineryPipelineSummary(
  pipelineLots: PipelineLot[],
  descriptors: OwnerAlertDescriptor[]
): WineryPipelineSummary {
  const attentionLotIds = new Set(descriptors.map(d => d.lotId))
  const conteo_por_etapa = Object.fromEntries(
    LOT_ETAPA_VALUES.map(etapa => [etapa, 0])
  ) as Record<LotEtapa, number>

  for (const lot of pipelineLots) {
    conteo_por_etapa[lot.etapa] += 1
  }

  const lotes_requieren_atencion = attentionLotIds.size

  return {
    salud: lotes_requieren_atencion === 0 ? 'todo_en_orden' : 'requiere_atencion',
    lotes_requieren_atencion,
    lotes_activos: pipelineLots.length,
    conteo_por_etapa,
  }
}

export function mapPipelineLotsForMcp(lots: PipelineLot[]) {
  return lots.map(lot => ({
    id: lot.id,
    code: lot.code,
    etapa: lot.etapa,
    dias_sin_registro: lot.daysSinceLastRecord,
    varietal: lot.varietal,
    requiere_atencion: lot.needsAttention,
    contenedor: lot.container,
    ultima_medicion: lot.lastMeasurement,
  }))
}
