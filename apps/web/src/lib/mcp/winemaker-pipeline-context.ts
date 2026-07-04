import type { SupabaseClient } from '@supabase/supabase-js'
import { buildPipelineLots, type PipelineLot } from '@/lib/proof/pipeline-lot-meta'
import { buildOwnerAlertDescriptors } from '@/lib/proof/winemaker-owner-alerts'
import {
  buildWineryPipelineSummary,
  mapPipelineLotsForMcp,
  type WineryPipelineSummary,
} from '@/lib/proof/winery-pipeline-summary'
import { fetchActiveLots, fetchLotEvents } from '@/lib/supabase/winemaker-owner-home'

export type WinemakerPipelineMcpContext = {
  pipelineLots: PipelineLot[]
  pipeline: WineryPipelineSummary
  lotes: ReturnType<typeof mapPipelineLotsForMcp>
}

export async function loadWinemakerPipelineMcpContext(
  sb: SupabaseClient,
  organizationId: string
): Promise<WinemakerPipelineMcpContext> {
  const ownerLots = await fetchActiveLots(sb, organizationId)
  const lotIds = ownerLots.map(l => l.id)
  const events = await fetchLotEvents(sb, organizationId, lotIds)
  const pipelineLots = buildPipelineLots(ownerLots, events)
  const descriptors = buildOwnerAlertDescriptors(ownerLots, events)
  const pipeline = buildWineryPipelineSummary(pipelineLots, descriptors)

  return {
    pipelineLots,
    pipeline,
    lotes: mapPipelineLotsForMcp(pipelineLots),
  }
}
