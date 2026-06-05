import type { SupabaseClient } from '@supabase/supabase-js'
import { buildDistillerAgentContext } from '@/lib/proof/distiller-agent-context'
import { throwIfSupabaseError } from '@/lib/proof/proof-error'
import {
  buildDistributorAgentContext,
  type DistributorAgentContext,
} from '@/lib/proof/distributor-agent-context'
import {
  fetchCorridas,
  fetchProductosViaje,
  fetchViajes,
} from '@/lib/supabase/destilador'
import {
  fetchCuentasClientes,
  fetchCuentasPorPagarActivas,
  fetchOrdenesCompraDistribuidorPendientes,
  fetchPedidos,
  fetchSkus,
} from '@/lib/supabase/distribuidor'
import type { ProfileScope } from '@/lib/supabase'
import type { CorridaRow, LoteRow, ViajeRow } from '@/lib/proof/destilador-types'
import type { AgentContextHints, AgentProfileType } from '@/lib/proof/agent-context-types'

export type { AgentContextHints, AgentProfileType } from '@/lib/proof/agent-context-types'

export async function verifyUserProfileType(
  sb: SupabaseClient,
  clerkId: string,
  profileType: AgentProfileType
): Promise<void> {
  const { data, error } = await sb
    .from('profiles')
    .select('profile_type_v2, extra_profiles, is_super_user')
    .eq('clerk_id', clerkId)
  if (error) {
    console.warn('[proof/contexto] verify profiles query failed', error.message)
    return
  }
  const rows = data ?? []
  const hasProfile = rows.some(
    r =>
      r.profile_type_v2 === profileType ||
      (Array.isArray(r.extra_profiles) && r.extra_profiles.includes(profileType))
  )
  const superUser = rows.some(r => r.is_super_user)
  if (!hasProfile && !superUser) {
    console.warn('[proof/contexto] profile not in DB, continuing with clerk auth', {
      clerkId,
      profileType,
      rows: rows.map(r => r.profile_type_v2),
    })
  }
}

/** Query directa en servidor (service role) — sin embed que pueda vaciar resultados. */
export async function fetchLotesForAgent(
  sb: SupabaseClient,
  clerkId: string,
  opts?: { limit?: number }
): Promise<LoteRow[]> {
  let q = sb
    .from('lotes')
    .select('*')
    .eq('clerk_id', clerkId)
    .order('fecha_recepcion', { ascending: false })

  if (opts?.limit) q = q.limit(opts.limit)

  const { data, error } = await q

  if (error) {
    console.log('[proof/contexto] lotes query', {
      clerk_id: clerkId,
      count: 0,
      error: error.message,
      sample: null,
    })
    throwIfSupabaseError(error, 'lotes')
  }
  console.log('[proof/contexto] lotes query', {
    clerk_id: clerkId,
    count: data?.length ?? 0,
    error: null,
    sample: data?.[0]
      ? {
          id: data[0].id,
          numero_lote: data[0].numero_lote,
          tipo_agave: data[0].tipo_agave,
          litros_disponibles_granel: data[0].litros_disponibles_granel,
        }
      : null,
  })

  return (data ?? []) as LoteRow[]
}

/** Contexto completo distribuidor (SKUs, pedidos, crédito) para agente. */
export async function loadDistributorAgentContext(
  sb: SupabaseClient,
  clerkId: string,
  hints?: AgentContextHints
): Promise<DistributorAgentContext & Record<string, unknown>> {
  const scope: ProfileScope = {
    clerk_id: clerkId,
    profile_type_v2: 'distributor',
  }
  const [skus, pedidos, cuentas, ordenesCompra, cuentasPorPagar] = await Promise.all([
    fetchSkus(sb, scope),
    fetchPedidos(sb, scope, { limit: 50 }),
    fetchCuentasClientes(sb, scope).catch(() => []),
    fetchOrdenesCompraDistribuidorPendientes(sb, scope).catch(() => []),
    fetchCuentasPorPagarActivas(sb, scope).catch(() => []),
  ])
  const datos = buildDistributorAgentContext(
    skus,
    pedidos,
    cuentas,
    ordenesCompra,
    cuentasPorPagar,
    {
    selectedId: hints?.selectedId ?? null,
    query: hints?.query ?? null,
  })
  return {
    ...datos,
    clerk_id: clerkId,
    profile_type: 'distributor',
    ...(hints?.pantalla ? { pantalla: hints.pantalla } : {}),
  }
}

export async function loadIsolatedAgentContext(
  sb: SupabaseClient,
  clerkId: string,
  profileType: AgentProfileType,
  hints?: AgentContextHints
): Promise<Record<string, unknown>> {
  await verifyUserProfileType(sb, clerkId, profileType)

  const query = hints?.query ?? undefined
  const selectedId = hints?.selectedId ?? null

  if (profileType === 'distiller') {
    const [lotes, viajes, corridas] = await Promise.all([
      fetchLotesForAgent(sb, clerkId, { limit: 500 }),
      fetchViajes(sb, clerkId, { limit: 200 }).catch(() => [] as ViajeRow[]),
      fetchCorridas(sb, clerkId, { estado: 'activa', limit: 50 }).catch(
        () => [] as CorridaRow[]
      ),
    ])
    const activos = viajes.filter(v => v.estado !== 'recibido')
    const productos = await fetchProductosViaje(sb, activos.map(v => v.id)).catch(
      () => [] as Awaited<ReturnType<typeof fetchProductosViaje>>
    )
    const datos = buildDistillerAgentContext(lotes, viajes, productos, corridas, {
      selectedId,
      query,
    })
    return {
      ...datos,
      clerk_id: clerkId,
      profile_type: 'distiller',
      ...(hints?.pantalla ? { pantalla: hints.pantalla } : {}),
    }
  }

  return loadDistributorAgentContext(sb, clerkId, hints)
}
