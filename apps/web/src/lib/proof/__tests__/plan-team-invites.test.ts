import { describe, expect, it } from 'vitest'
import { PLAN_LIMITS_CATALOG } from '@/lib/proof/plan-limits-types'
import { orgCanInviteTeamMembersFromLimits } from '@/lib/proof/plan-team-invites'

describe('orgCanInviteTeamMembersFromLimits', () => {
  it('blocks regular and trial (single seat)', () => {
    expect(orgCanInviteTeamMembersFromLimits(PLAN_LIMITS_CATALOG.regular)).toBe(false)
    expect(orgCanInviteTeamMembersFromLimits(PLAN_LIMITS_CATALOG.trial)).toBe(false)
  })

  it('allows pro and enterprise', () => {
    expect(orgCanInviteTeamMembersFromLimits(PLAN_LIMITS_CATALOG.pro)).toBe(true)
    expect(orgCanInviteTeamMembersFromLimits(PLAN_LIMITS_CATALOG.enterprise)).toBe(true)
  })
})
