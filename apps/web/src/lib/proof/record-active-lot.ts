import type { SupabaseClient } from '@supabase/supabase-js'
import type { LotEtapa } from '@/lib/proof/lot-etapa'
import { assertPlanLimit, PlanLimitError } from '@/lib/proof/plan-limits'

export type CreateActiveLotParams = {
  organizationId: string
  code: string
  vintageId?: string | null
  productType?: 'wine' | 'beer' | 'spirit'
  etapa?: LotEtapa
  notes?: string | null
}

export type CreateActiveLotErrorCode = 'missing_code' | 'duplicate_code' | 'create_failed'

export class CreateActiveLotError extends Error {
  constructor(public readonly code: CreateActiveLotErrorCode | string) {
    super(code)
    this.name = 'CreateActiveLotError'
  }
}

export { PlanLimitError }

/** Creates an active pipeline lot — enforces lotes_activos (Epic E2). */
export async function createActiveLot(
  sb: SupabaseClient,
  params: CreateActiveLotParams
): Promise<{ lotId: string }> {
  const code = params.code.trim()
  if (!code) throw new CreateActiveLotError('missing_code')

  try {
    await assertPlanLimit(sb, params.organizationId, 'lotes_activos')
  } catch (err) {
    if (err instanceof PlanLimitError) throw new CreateActiveLotError(err.code)
    throw err
  }

  const { data, error } = await sb
    .from('lots')
    .insert({
      organization_id: params.organizationId,
      code,
      vintage_id: params.vintageId ?? null,
      product_type: params.productType ?? 'wine',
      status: 'active',
      etapa: params.etapa ?? 'cosecha',
      notes: params.notes ?? null,
    })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') throw new CreateActiveLotError('duplicate_code')
    throw new CreateActiveLotError('create_failed')
  }

  return { lotId: String(data.id) }
}
