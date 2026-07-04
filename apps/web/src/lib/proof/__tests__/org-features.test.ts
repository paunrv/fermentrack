import { describe, expect, it } from 'vitest'
import {
  fetchOrgFeatureSource,
  orgFeatureSourceFromPlan,
  orgHasFeature,
  parseOrgFeatures,
  PLAN_FEATURE_LABELS,
} from '@/lib/proof/org-features'

describe('parseOrgFeatures', () => {
  it('keeps known boolean keys only', () => {
    expect(parseOrgFeatures({ numeracion_botellas: true, chat: true })).toEqual({
      numeracion_botellas: true,
      chat: true,
    })
  })
})

describe('orgHasFeature numeracion_botellas', () => {
  it('enables on enterprise plan by default', () => {
    expect(orgHasFeature('enterprise', 'numeracion_botellas')).toBe(true)
  })

  it('disables on regular and pro by default', () => {
    expect(orgHasFeature('regular', 'numeracion_botellas')).toBe(false)
    expect(orgHasFeature('pro', 'numeracion_botellas')).toBe(false)
  })

  it('respects features jsonb override on pro', () => {
    expect(
      orgHasFeature(
        { plan: 'pro', features: { numeracion_botellas: true } },
        'numeracion_botellas'
      )
    ).toBe(true)
  })

  it('can revoke on enterprise via override', () => {
    expect(
      orgHasFeature(
        { plan: 'enterprise', features: { numeracion_botellas: false } },
        'numeracion_botellas'
      )
    ).toBe(false)
  })

  it('documents enterprise-only features for billing copy', () => {
    expect(PLAN_FEATURE_LABELS.enterprise).toContain('numeracion_botellas')
    expect(PLAN_FEATURE_LABELS.pro).not.toContain('numeracion_botellas')
  })
})

describe('orgHasFeature chat', () => {
  it('enables on pro and enterprise by default', () => {
    expect(orgHasFeature('pro', 'chat')).toBe(true)
    expect(orgHasFeature('enterprise', 'chat')).toBe(true)
  })

  it('disables on regular by default', () => {
    expect(orgHasFeature('regular', 'chat')).toBe(false)
  })

  it('respects features jsonb override', () => {
    expect(orgHasFeature({ plan: 'regular', features: { chat: true } }, 'chat')).toBe(true)
    expect(orgHasFeature({ plan: 'pro', features: { chat: false } }, 'chat')).toBe(false)
  })

  it('documents chat on pro billing copy', () => {
    expect(PLAN_FEATURE_LABELS.pro).toContain('chat')
    expect(PLAN_FEATURE_LABELS.regular).not.toContain('chat')
  })
})

describe('orgFeatureSourceFromPlan', () => {
  it('wraps plan without overrides', () => {
    expect(orgFeatureSourceFromPlan('pro')).toEqual({
      plan: 'pro',
      plan_status: 'active',
      features: {},
    })
  })
})

describe('fetchOrgFeatureSource', () => {
  it('loads plan and features from organizations', async () => {
    const sb = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: { plan: 'enterprise', features: { numeracion_botellas: false } },
              error: null,
            }),
          }),
        }),
      }),
    }

    const source = await fetchOrgFeatureSource(sb as never, 'org-1')
    expect(source.plan).toBe('enterprise')
    expect(source.features?.numeracion_botellas).toBe(false)
    expect(orgHasFeature(source, 'numeracion_botellas')).toBe(false)
  })
})
