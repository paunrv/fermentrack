import postgres from 'postgres'

/**
 * Every query the screens make runs as `authenticated`, with the signed-in
 * user's claims set on the transaction — the same posture PostgREST gives a
 * Supabase client.
 *
 * This matters more than it looks. The connection itself is privileged, so if
 * we queried directly the row-level policies would never engage and the screens
 * would appear to work while showing everyone everything. Dropping to
 * `authenticated` for the duration of the request is what makes the database,
 * not this code, the thing deciding what a person may see.
 */

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL is not set')
}

const sql = postgres(connectionString, {
  max: 5,
  idle_timeout: 20,
  onnotice: () => {},
})

export type Sql = postgres.TransactionSql

/** Runs `fn` inside a transaction scoped to one user's identity. */
export async function asUser<T>(userId: string, fn: (tx: Sql) => Promise<T>): Promise<T> {
  // postgres.js types `begin` as unwrapping arrays out of the callback result;
  // the cast keeps callers honest about what they actually asked for.
  const result = await sql.begin(async (tx) => {
    const claims = JSON.stringify({ sub: userId, role: 'authenticated' })
    // Claims first, then drop privileges — once we are `authenticated` the
    // session is genuinely unprivileged and RLS applies to everything after.
    await tx`select set_config('request.jwt.claims', ${claims}, true)`
    await tx`select set_config('role', 'authenticated', true)`
    return fn(tx as Sql)
  })
  return result as T
}

/**
 * Reads the environment the database says it is. Used to refuse the
 * development sign-in shortcut anywhere that calls itself production, so the
 * shortcut cannot escape by way of a misconfigured deploy.
 */
export async function environmentName(): Promise<string> {
  const rows = await sql<{ name: string }[]>`select name from app.environment limit 1`
  return rows[0]?.name ?? 'unknown'
}

export { sql as privilegedSql }
