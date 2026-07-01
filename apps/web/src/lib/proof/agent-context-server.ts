import type { SupabaseClient } from '@supabase/supabase-js'
import { buildDistillerAgentContext } from '@/lib/proof/distiller-agent-context'
import { buildWinemakerAgentContext } from '@/lib/proof/winemaker-agent-context'
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
  fetchCuentasPorCobrarActivas,
  fetchCuentasPorPagarActivas,
  fetchOrdenesCompraDistribuidorPendientes,
  fetchPedidos,
  fetchSkus,
  fetchUltimaOrdenCompraIngresada,
  resolveDistribuidorScopeUserId,
} from '@/lib/supabase/distribuidor'
import {
  fetchDocuments,
  fetchProductionCosts,
  fetchSuppliers,
  fetchWineLots,
  fetchWinemakerSummary,
} from '@/lib/supabase/winemaker'
import { PROOF_PROFILES_TABLE, type ProfileScope } from '@/lib/supabase'
import type { CorridaRow, LoteRow, ViajeRow } from '@/lib/proof/destilador-types'
import type { AgentContextHints, AgentProfileType } from '@/lib/proof/agent-context-types'

export type { AgentContextHints, AgentProfileType } from '@/lib/proof/agent-context-types'

export async function verifyUserProfileType(
  sb: SupabaseClient,
  userId: string,
  profileType: AgentProfileType
): Promise<void> {
  const { data, error } = await sb
    .from(PROOF_PROFILES_TABLE)
    .select('profile_type_v2, extra_profiles, is_super_user')
    .eq('user_id', userId)
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
    console.warn('[proof/contexto] profile not in DB, continuing with auth user', {
      userId,
      profileType,
      rows: rows.map(r => r.profile_type_v2),
    })
  }
}

/** Query directa en servidor (service role) — sin embed que pueda vaciar resultados. */
export async function fetchLotesForAgent(
  sb: SupabaseClient,
  userId: string,
  opts?: { limit?: number }
): Promise<LoteRow[]> {
  let q = sb
    .from('lotes')
    .select('*')
    .eq('clerk_id', userId)
    .order('fecha_recepcion', { ascending: false })

  if (opts?.limit) q = q.limit(opts.limit)

  const { data, error } = await q

  if (error) {
    console.log('[proof/contexto] lotes query', {
      user_id: userId,
      count: 0,
      error: error.message,
      sample: null,
    })
    throwIfSupabaseError(error, 'lotes')
  }
  console.log('[proof/contexto] lotes query', {
    user_id: userId,
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
  userId: string,
  hints?: AgentContextHints
): Promise<DistributorAgentContext & Record<string, unknown>> {
  const scopeUserId = await resolveDistribuidorScopeUserId(sb, userId)
  const scope: ProfileScope = {
    user_id: scopeUserId,
    profile_type_v2: 'distributor',
  }

  const { data: profileRow } = await sb
    .from(PROOF_PROFILES_TABLE)
    .select('cuenta_deposito, banco_deposito, titular_cuenta, constancia_fiscal_path, username')
    .eq('user_id', scopeUserId)
    .eq('profile_type_v2', 'distributor')
    .maybeSingle()

  const contextLoadWarnings: string[] = []

  async function loadSlice<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
    try {
      return await fn()
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error(`[agente] loadDistributorAgentContext ${label} failed`, {
        scopeUserId,
        authUserId: userId,
        error: msg,
      })
      contextLoadWarnings.push(label)
      return fallback
    }
  }

  const [skus, pedidos, cuentasPorCobrar, ordenesCompra, cuentasPorPagar, ultimaOrdenIngresada] =
    await Promise.all([
    loadSlice('skus', () => fetchSkus(sb, scope), []),
    loadSlice('pedidos', () => fetchPedidos(sb, scope, { limit: 50 }), []),
    loadSlice('cuentas_por_cobrar', () => fetchCuentasPorCobrarActivas(sb, scope), []),
    loadSlice(
      'ordenes_compra_pendientes',
      () => fetchOrdenesCompraDistribuidorPendientes(sb, scope),
      []
    ),
    loadSlice('cuentas_por_pagar', () => fetchCuentasPorPagarActivas(sb, scope), []),
    loadSlice(
      'ultima_orden_ingresada',
      () => fetchUltimaOrdenCompraIngresada(sb, scope),
      null
    ),
  ])
  console.log('[agente] distributor context', {
    authUserId: userId,
    scopeUserId,
    skusEnContexto: skus.length,
    contextLoadWarnings,
  })
  const datos = buildDistributorAgentContext(
    skus,
    pedidos,
    cuentasPorCobrar,
    ordenesCompra,
    cuentasPorPagar,
    {
    selectedId: hints?.selectedId ?? null,
    query: hints?.query ?? null,
    ultimaOrdenIngresada,
    miInformacion: profileRow ?? undefined,
  })
  return {
    ...datos,
    user_id: scopeUserId,
    auth_user_id: userId,
    profile_type: 'distributor',
    ...(contextLoadWarnings.length > 0 ? { context_load_warnings: contextLoadWarnings } : {}),
    ...(hints?.pantalla ? { pantalla: hints.pantalla } : {}),
    ...(hints?.image ? { image: hints.image } : {}),
  }
}

export async function loadIsolatedAgentContext(
  sb: SupabaseClient,
  userId: string,
  profileType: AgentProfileType,
  hints?: AgentContextHints
): Promise<Record<string, unknown>> {
  await verifyUserProfileType(sb, userId, profileType)

  const query = hints?.query ?? undefined
  const selectedId = hints?.selectedId ?? null

  if (profileType === 'distiller') {
    const [lotes, viajes, corridas] = await Promise.all([
      fetchLotesForAgent(sb, userId, { limit: 500 }),
      fetchViajes(sb, userId, { limit: 200 }).catch(() => [] as ViajeRow[]),
      fetchCorridas(sb, userId, { estado: 'activa', limit: 50 }).catch(
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
      user_id: userId,
      profile_type: 'distiller',
      ...(hints?.pantalla ? { pantalla: hints.pantalla } : {}),
    }
  }

  if (profileType === 'winemaker') {
    const { fetchWinemakerOrganizationIdForUser } = await import(
      '@/lib/supabase/organization'
    )
    const organizationId = await fetchWinemakerOrganizationIdForUser(
      sb,
      userId,
      typeof hints?.organizationId === 'string' ? hints.organizationId : null
    )
    const emptySummary = {
      lotesTotal: 0,
      lotesActivos: 0,
      documentosTotal: 0,
      gastosMesMxn: 0,
      gastosBodegaMxn: 0,
      litrosEnProceso: 0,
    }
    if (!organizationId) {
      const datos = buildWinemakerAgentContext([], [], [], [], emptySummary, {
        selectedId,
        query,
        selectedDocumentId:
          typeof hints?.pantalla?.documentId === 'string'
            ? hints.pantalla.documentId
            : null,
      })
      return {
        ...datos,
        user_id: userId,
        organization_id: null,
        profile_type: 'winemaker',
        ...(hints?.pantalla ? { pantalla: hints.pantalla } : {}),
      }
    }

    const [lotes, documents, costs, suppliers, summary] = await Promise.all([
      fetchWineLots(sb, organizationId, { limit: 500 }).catch(() => []),
      fetchDocuments(sb, organizationId, { limit: 100, withLines: true }).catch(() => []),
      fetchProductionCosts(sb, organizationId, { limit: 100 }).catch(() => []),
      fetchSuppliers(sb, organizationId, { limit: 200 }).catch(() => []),
      fetchWinemakerSummary(sb, organizationId).catch(() => emptySummary),
    ])
    const datos = buildWinemakerAgentContext(lotes, documents, costs, suppliers, summary, {
      selectedId,
      query,
      selectedDocumentId:
        typeof hints?.pantalla?.documentId === 'string'
          ? hints.pantalla.documentId
          : null,
    })
    return {
      ...datos,
      user_id: userId,
      organization_id: organizationId,
      profile_type: 'winemaker',
      ...(hints?.pantalla ? { pantalla: hints.pantalla } : {}),
    }
  }

  return loadDistributorAgentContext(sb, userId, hints)
}
