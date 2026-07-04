import { describe, expect, it } from 'vitest'
import {
  assertPlanLimit,
  checkLimit,
  evaluateLimit,
  normalizePlanTier,
  planLimitsForTier,
  PlanLimitError,
  resolveEffectivePlanTier,
} from '@/lib/proof/plan-limits'

describe('normalizePlanTier', () => {
  it('maps legacy free to regular', () => {
    expect(normalizePlanTier('free')).toBe('regular')
  })

  it('resolves trialing regular as trial tier', () => {
    expect(resolveEffectivePlanTier('regular', 'trialing')).toBe('trial')
  })

  it('downgrades expired trial to regular tier', () => {
    expect(resolveEffectivePlanTier('trial', 'trialing', '2020-01-01T00:00:00.000Z')).toBe('regular')
    expect(resolveEffectivePlanTier('trial', 'trialing', '2099-01-01T00:00:00.000Z')).toBe('trial')
  })
})

describe('evaluateLimit', () => {
  it('allows creation below regular lot cap', () => {
    const result = evaluateLimit('lotes_activos', 4, 5, 'regular')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.remaining).toBe(0)
  })

  it('blocks sixth active lot on regular', () => {
    const result = evaluateLimit('lotes_activos', 5, 5, 'regular')
    expect(result).toEqual({
      ok: false,
      code: 'limit_reached',
      resource: 'lotes_activos',
      current: 5,
      limit: 5,
      plan: 'regular',
    })
  })

  it('allows unlimited on enterprise', () => {
    const limit = planLimitsForTier('enterprise').lotes_activos
    expect(limit).toBeNull()
    expect(evaluateLimit('lotes_activos', 999, null, 'enterprise').ok).toBe(true)
  })
})

describe('checkLimit', () => {
  it('counts active lots from public.lots', async () => {
    const sb = {
      from(table: string) {
        if (table === 'organizations') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    plan: 'regular',
                    plan_status: 'active',
                    features: {},
                    billing_cycle: null,
                    trial_ends_at: null,
                    primer_registro_at: null,
                    renewal_anchor: null,
                  },
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'plan_limites') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: null, error: null }),
              }),
            }),
          }
        }
        if (table === 'lots') {
          return {
            select: () => ({
              eq: () => ({
                eq: async () => ({ count: 5, error: null }),
              }),
            }),
          }
        }
        throw new Error(`unexpected table ${table}`)
      },
    }

    const result = await checkLimit(sb as never, 'org-1', 'lotes_activos')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.resource).toBe('lotes_activos')
  })
})

describe('assertPlanLimit', () => {
  it('throws PlanLimitError at etiqueta cap', async () => {
    const sb = {
      from(table: string) {
        if (table === 'organizations') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    plan: 'regular',
                    plan_status: 'active',
                    features: {},
                    billing_cycle: null,
                    trial_ends_at: null,
                    primer_registro_at: null,
                    renewal_anchor: null,
                  },
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'plan_limites') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: null, error: null }),
              }),
            }),
          }
        }
        if (table === 'wm_etiquetas') {
          return {
            select: () => ({
              eq: async () => ({ count: 5, error: null }),
            }),
          }
        }
        throw new Error(`unexpected table ${table}`)
      },
    }

    await expect(assertPlanLimit(sb as never, 'org-1', 'etiquetas')).rejects.toBeInstanceOf(
      PlanLimitError
    )
  })
})
