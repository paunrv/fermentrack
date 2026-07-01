import type { SupabaseClient } from '@supabase/supabase-js'

export type OrgType = 'winemaker'
export type OrgPlan = 'free' | 'pro' | 'enterprise'
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

function mapOrganizationRow(row: Record<string, unknown>): Organization {
  return {
    id: String(row.id),
    name: String(row.name),
    slug: String(row.slug),
    org_type: row.org_type as OrgType,
    plan: (row.plan as OrgPlan) ?? 'free',
    plan_status: (row.plan_status as OrgPlanStatus) ?? 'active',
    created_at: String(row.created_at),
  }
}

export async function fetchWinemakerOrganizations(
  sb: SupabaseClient,
  userId: string
): Promise<OrganizationMembership[]> {
  const { data, error } = await sb
    .from('organization_members')
    .select(
      `
      role,
      status,
      organization_id,
      organizations (
        id,
        name,
        slug,
        org_type,
        plan,
        plan_status,
        created_at
      )
    `
    )
    .eq('user_id', userId)
    .eq('status', 'active')

  if (error) throw error

  const memberships: OrganizationMembership[] = []

  for (const row of data ?? []) {
    const orgRaw = row.organizations
    const orgRow = Array.isArray(orgRaw) ? orgRaw[0] : orgRaw
    if (!orgRow || typeof orgRow !== 'object') continue
    const org = mapOrganizationRow(orgRow as Record<string, unknown>)
    if (org.org_type !== 'winemaker') continue
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

  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await sb
      .from('organizations')
      .insert({
        name: trimmed,
        slug,
        org_type: 'winemaker',
      })
      .select('id, name, slug, org_type, plan, plan_status, created_at')
      .single()

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
