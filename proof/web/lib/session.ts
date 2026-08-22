import { environmentName, privilegedSql } from './db'

export type Session = {
  userId: string
  email: string | null
  displayName: string | null
  organizationId: string
  organizationName: string
}

/**
 * Cycle 1 has no sign-in screen yet — Supabase Auth is wired at the database
 * level but the browser flow belongs to a later step. Until then this resolves
 * a session from PROOF_DEV_USER.
 *
 * That is a real hole, so it is nailed shut from the one place that cannot be
 * faked by a build flag: the database is asked what environment it is, and the
 * shortcut refuses to work anywhere calling itself production. A misconfigured
 * deploy therefore fails closed with no session rather than open with somebody
 * else's winery.
 */
export async function currentSession(): Promise<Session | null> {
  const env = await environmentName()
  if (env === 'production') return null

  const email = process.env.PROOF_DEV_USER
  if (!email) return null

  const rows = await privilegedSql<
    {
      user_id: string
      email: string | null
      display_name: string | null
      organization_id: string
      organization_name: string
    }[]
  >`
    select p.id            as user_id,
           p.email,
           p.display_name,
           o.id            as organization_id,
           o.name          as organization_name
    from public.profiles p
    join public.memberships m on m.user_id = p.id and m.status = 'active'
    join public.organizations o on o.id = m.organization_id and o.status = 'active'
    where lower(p.email) = lower(${email})
    order by o.created_at desc
    limit 1
  `

  const row = rows[0]
  if (!row) return null

  return {
    userId: row.user_id,
    email: row.email,
    displayName: row.display_name,
    organizationId: row.organization_id,
    organizationName: row.organization_name,
  }
}
