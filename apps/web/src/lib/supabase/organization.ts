import type { SupabaseClient } from '@supabase/supabase-js'
import type { OrgFeaturesMap } from '@/lib/proof/org-features'
import { parseOrgFeatures } from '@/lib/proof/org-features'
import {
  computeTrialEndsAt,
  formatRenewalAnchorDate,
  nextRenewalAnchorDate,
} from '@/lib/billing/billing-renewal-anchor'
import type { TeamPlatformProfile } from '@/lib/proof/team-access-code'

export type OrgType = 'winemaker'
export type OrgPlan = 'regular' | 'pro' | 'enterprise' | 'trial'
export type OrgPlanStatus = 'active' | 'trialing' | 'past_due' | 'canceled'
export type OrgMemberRole = 'owner' | 'admin' | 'member' | 'viewer'
export type OrgMemberStatus = 'active' | 'invited' | 'suspended'

export interface Organization {
  id: string
  name: string
  slug: string
  org_type: OrgType
  plan: OrgPlan
  plan_status: OrgPlanStatus
  features: Record<string, boolean>
  billing_cycle?: 'monthly' | 'annual' | null
  trial_ends_at?: string | null
  primer_registro_at?: string | null
  renewal_anchor?: string | null
  founding_member_at?: string | null
  created_at: string
}

export interface OrganizationMembership {
  organizationId: string
  role: OrgMemberRole
  status: OrgMemberStatus
  organization: Organization
}

export function slugifyOrganizationName(name: string): string {
  const base = name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
  return base || 'bodega'
}

/** PostgREST error when a selected column is absent (migration not applied yet). */
export function isMissingColumnError(error: unknown, column: string): boolean {
  if (typeof error !== 'object' || error === null || !('message' in error)) return false
  const message = String((error as { message: unknown }).message).toLowerCase()
  return message.includes(column.toLowerCase()) && message.includes('does not exist')
}

function mapOrganizationRow(
  row: Record<string, unknown>,
  opts?: { legacySchema?: boolean }
): Organization {
  const legacy = opts?.legacySchema ?? false
  return {
    id: String(row.id),
    name: String(row.name),
    slug: String(row.slug),
    org_type: legacy ? 'winemaker' : ((row.org_type as OrgType) ?? 'winemaker'),
    plan: (row.plan as OrgPlan) ?? 'regular',
    plan_status: legacy ? 'active' : ((row.plan_status as OrgPlanStatus) ?? 'active'),
    features: legacy ? {} : parseOrgFeatures(row.features) as OrgFeaturesMap,
    billing_cycle: legacy ? null : ((row.billing_cycle as Organization['billing_cycle']) ?? null),
    trial_ends_at: legacy ? null : ((row.trial_ends_at as string | null) ?? null),
    primer_registro_at: legacy ? null : ((row.primer_registro_at as string | null) ?? null),
    renewal_anchor: legacy ? null : ((row.renewal_anchor as string | null) ?? null),
    founding_member_at: legacy ? null : ((row.founding_member_at as string | null) ?? null),
    created_at: String(row.created_at ?? new Date().toISOString()),
  }
}

const MEMBERSHIP_SELECT_FULL =
  'role, status, organization_id, organizations(id, name, slug, org_type, plan, plan_status, features, billing_cycle, trial_ends_at, primer_registro_at, renewal_anchor, founding_member_at, created_at)' as const

const MEMBERSHIP_SELECT_NO_FEATURES =
  'role, status, organization_id, organizations(id, name, slug, org_type, plan, plan_status, created_at)' as const

const MEMBERSHIP_SELECT_LEGACY =
  'role, status, organization_id, organizations(id, name, slug, plan, created_at)' as const

type MembershipSelect =
  | typeof MEMBERSHIP_SELECT_FULL
  | typeof MEMBERSHIP_SELECT_NO_FEATURES
  | typeof MEMBERSHIP_SELECT_LEGACY

async function fetchActiveMembershipRows(
  sb: SupabaseClient,
  userId: string,
  select: MembershipSelect
) {
  return sb.from('organization_members').select(select).eq('user_id', userId).eq('status', 'active')
}

async function fetchMembershipRows(
  sb: SupabaseClient,
  userId: string,
  select: MembershipSelect,
  status: OrgMemberStatus
) {
  return sb.from('organization_members').select(select).eq('user_id', userId).eq('status', status)
}

export type PendingWinemakerInvite = {
  organizationId: string
  organizationName: string
  role: OrgMemberRole
  platformProfile: TeamPlatformProfile | null
}

/** Pending team invite for onboarding (status = invited). */
export async function fetchPendingWinemakerInvite(
  sb: SupabaseClient,
  userId: string
): Promise<PendingWinemakerInvite | null> {
  let legacySchema = false
  let { data, error } = await fetchMembershipRows(sb, userId, MEMBERSHIP_SELECT_FULL, 'invited')

  if (error && isMissingColumnError(error, 'org_type')) {
    legacySchema = true
    ;({ data, error } = await fetchMembershipRows(sb, userId, MEMBERSHIP_SELECT_LEGACY, 'invited'))
  } else if (error && isMissingColumnError(error, 'features')) {
    ;({ data, error } = await fetchMembershipRows(sb, userId, MEMBERSHIP_SELECT_NO_FEATURES, 'invited'))
  }

  if (error) throw error
  const row = data?.[0]
  if (!row) return null

  const orgRaw = row.organizations
  const orgRow = Array.isArray(orgRaw) ? orgRaw[0] : orgRaw
  if (!orgRow || typeof orgRow !== 'object') return null
  const org = mapOrganizationRow(orgRow as Record<string, unknown>, { legacySchema })
  if (!legacySchema && org.org_type !== 'winemaker') return null

  return {
    organizationId: String(row.organization_id),
    organizationName: org.name,
    role: row.role as OrgMemberRole,
    platformProfile: (row.platform_profile as TeamPlatformProfile | null) ?? null,
  }
}

export async function fetchWinemakerOrganizations(
  sb: SupabaseClient,
  userId: string
): Promise<OrganizationMembership[]> {
  let legacySchema = false
  let { data, error } = await fetchActiveMembershipRows(sb, userId, MEMBERSHIP_SELECT_FULL)

  if (error && isMissingColumnError(error, 'org_type')) {
    legacySchema = true
    ;({ data, error } = await fetchActiveMembershipRows(sb, userId, MEMBERSHIP_SELECT_LEGACY))
  } else if (error && isMissingColumnError(error, 'features')) {
    ;({ data, error } = await fetchActiveMembershipRows(sb, userId, MEMBERSHIP_SELECT_NO_FEATURES))
  }

  if (error) throw error

  const memberships: OrganizationMembership[] = []

  for (const row of data ?? []) {
    const orgRaw = row.organizations
    const orgRow = Array.isArray(orgRaw) ? orgRaw[0] : orgRaw
    if (!orgRow || typeof orgRow !== 'object') continue
    const org = mapOrganizationRow(orgRow as Record<string, unknown>, { legacySchema })
    if (!legacySchema && org.org_type !== 'winemaker') continue
    memberships.push({
      organizationId: String(row.organization_id),
      role: row.role as OrgMemberRole,
      status: row.status as OrgMemberStatus,
      organization: org,
    })
  }

  return memberships.sort(
    (a, b) =>
      new Date(a.organization.created_at).getTime() -
      new Date(b.organization.created_at).getTime()
  )
}

/** Org winemaker del usuario; respeta org preferida si es miembro activo. */
export async function fetchWinemakerOrganizationIdForUser(
  sb: SupabaseClient,
  userId: string,
  preferredOrganizationId?: string | null
): Promise<string | null> {
  const memberships = await fetchWinemakerOrganizations(sb, userId)
  if (preferredOrganizationId) {
    const found = memberships.find(m => m.organizationId === preferredOrganizationId)
    if (found) return found.organizationId
  }
  return memberships[0]?.organizationId ?? null
}

/** Org winemaker primaria del usuario (owner/member activo). */
export async function fetchPrimaryWinemakerOrganizationId(
  sb: SupabaseClient,
  userId: string
): Promise<string | null> {
  return fetchWinemakerOrganizationIdForUser(sb, userId)
}

export async function createWinemakerOrganization(
  sb: SupabaseClient,
  params: { name: string }
): Promise<Organization> {
  const trimmed = params.name.trim()
  if (!trimmed) throw new Error('El nombre de la bodega es obligatorio')

  const suffix = Date.now().toString(36).slice(-4)
  let slug = `${slugifyOrganizationName(trimmed)}-${suffix}`
  const now = new Date()
  const trialEndsAt = computeTrialEndsAt(now)
  const renewalAnchor = formatRenewalAnchorDate(nextRenewalAnchorDate(now))

  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await sb.rpc('create_winemaker_organization', {
      p_name: trimmed,
      p_slug: slug,
      p_trial_ends_at: trialEndsAt.toISOString(),
      p_primer_registro_at: now.toISOString(),
      p_renewal_anchor: renewalAnchor,
    })

    if (!error && data) {
      return mapOrganizationRow(data as Record<string, unknown>)
    }

    if (error?.code === '23505') {
      slug = `${slugifyOrganizationName(trimmed)}-${Date.now().toString(36).slice(-6)}`
      continue
    }

    throw error ?? new Error('No se pudo crear la organización')
  }

  throw new Error('No se pudo crear la organización')
}

export async function insertFirstWinemakerLot(
  sb: SupabaseClient,
  params: {
    userId: string
    organizationId: string
    productName: string
    varietal: string
  }
): Promise<void> {
  const lotCode = `LOT-${Date.now().toString().slice(-6)}`
  const { error } = await sb.from('wm_wine_lots').insert({
    organization_id: params.organizationId,
    lot_code: lotCode,
    name: params.productName.trim(),
    varietal: params.varietal,
    status: 'fermentation',
  })

  if (error) throw error
}
