'use client'

export const dynamic = 'force-dynamic'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useProfile } from '@/context/ProfileContext'
import { useSupabase } from '@/hooks/useSupabase'
import { useProofContextBar } from '@/hooks/useProofContextBar'
import { AgentBar } from '@/components/proof/AgentBar'
import { BotellaCard, mapLoteEstadoToBotella } from '@/components/proof/BotellaCard'
import { SkuCard, mapSkuEstadoToCard } from '@/components/proof/SkuCard'
import { LoteDetalle } from '@/components/proof/LoteDetalle'
import { ViajePendienteDetalle } from '@/components/proof/ViajePendienteDetalle'
import { profileTypeFromV2 } from '@/lib/proof/canvas-kpi'
import { CANVAS_BG, getProfileTheme } from '@/lib/proof/profile-theme'
import type { ProfileType } from '@/lib/proof/kpi-metrics'
import type {
  CorridaRow,
  LoteRow,
  ProductoViajeRow,
  ViajeRow,
} from '@/lib/proof/destilador-types'
import { toAgentProfileType } from '@/lib/proof/agent-context-types'
import { fetchSkus, type SkuRow } from '@/lib/supabase'
import {
  fetchCorridas,
  fetchLotes,
  fetchProductosViaje,
  fetchViajes,
} from '@/lib/supabase/destilador'

const DISTILLER_QUICK_ACTIONS = [
  { label: '¿Cuánto stock terminado?', message: '¿Cuánto stock terminado tengo?' },
  { label: 'Lotes listos para embotellar', message: '¿Qué lotes están listos para embotellar?' },
  { label: 'Deuda palenqueros', message: '¿Cuánto debo a palenqueros?' },
  {
    label: '+ Nuevo viaje',
    message: 'Quiero registrar un nuevo viaje a Oaxaca',
    href: '/dashboard/destilador/compras/nuevo',
  },
] as const

const DISTRIBUTOR_QUICK_ACTIONS = [
  { label: 'Stock bajo', message: '¿Qué SKUs tienen stock bajo?' },
  { label: 'Pedidos pendientes', message: '¿Qué pedidos están pendientes de entrega?' },
  { label: 'Por cobrar', message: '¿Cuánto tengo por cobrar?' },
  {
    label: '+ Nuevo pedido',
    message: 'Quiero registrar un nuevo pedido',
    href: '/dashboard/pedidos/nuevo',
  },
] as const

function CanvasDivider({ label }: { label: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '0 24px',
        marginBottom: 8,
      }}
    >
      <div style={{ flex: 1, height: '0.5px', background: '#E8E6E0' }} />
      <span
        style={{
          fontSize: 9,
          color: '#CCC',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        }}
      >
        {label}
      </span>
      <div style={{ flex: 1, height: '0.5px', background: '#E8E6E0' }} />
    </div>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const { scope, activeProfile, loading: profileLoading } = useProfile()
  const supabase = useSupabase()

  const agentProfileType = toAgentProfileType(activeProfile?.profile_type_v2)
  const profileType = profileTypeFromV2(activeProfile?.profile_type_v2)
  const theme = getProfileTheme(activeProfile?.profile_type_v2)
  const accent = theme.accent
  const clerkId = scope?.clerk_id
  const isDistiller = profileType === 'distiller'

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedViajeId, setSelectedViajeId] = useState<string | null>(null)
  const [userQuery, setUserQuery] = useState<string | null>(null)
  const [lotes, setLotes] = useState<LoteRow[]>([])
  const [viajes, setViajes] = useState<ViajeRow[]>([])
  const [productosViaje, setProductosViaje] = useState<ProductoViajeRow[]>([])
  const [corridasActivas, setCorridasActivas] = useState<CorridaRow[]>([])
  const [skus, setSkus] = useState<SkuRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [dataVersion, setDataVersion] = useState(0)
  const [agentRequestId, setAgentRequestId] = useState(0)

  const pendingViajeCards = useMemo(() => {
    if (!isDistiller) return []
    const pendientes = viajes.filter(
      v => v.estado === 'confirmado' || v.estado === 'en_transito'
    )
    return pendientes.map(v => {
      const prods = productosViaje.filter(p => p.viaje_id === v.id)
      const litros = prods.reduce((s, p) => s + Number(p.litros_acordados), 0)
      const nombre =
        prods.length === 0
          ? 'Viaje'
          : prods.length === 1
            ? prods[0]!.tipo_agave
            : prods.map(p => p.tipo_agave).join(' · ')
      return {
        viajeId: v.id,
        nombre,
        region: v.region || v.comunidad || '—',
        litros,
        estado: v.estado,
      }
    })
  }, [isDistiller, viajes, productosViaje])

  const bodegaCount = isDistiller
    ? lotes.length + pendingViajeCards.length
    : skus.length

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') setDataVersion(v => v + 1)
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  useEffect(() => {
    if (!scope || !profileType) {
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    const load = async () => {
      setLoadError(null)
      try {
        if (profileType === 'distiller' && clerkId) {
          const errors: string[] = []
          let loteRows: LoteRow[] = []
          let viajeRows: ViajeRow[] = []
          let corridaRows: CorridaRow[] = []

          try {
            loteRows = await fetchLotes(supabase, clerkId, { limit: 500 })
          } catch (e) {
            console.error('[dashboard] fetchLotes', e)
            errors.push(e instanceof Error ? e.message : 'Error cargando lotes')
          }

          try {
            viajeRows = await fetchViajes(supabase, clerkId, { limit: 200 })
          } catch (e) {
            console.error('[dashboard] fetchViajes', e)
            errors.push(e instanceof Error ? e.message : 'Error cargando viajes')
          }

          try {
            corridaRows = await fetchCorridas(supabase, clerkId, {
              estado: 'activa',
              limit: 50,
            })
          } catch (e) {
            console.error('[dashboard] fetchCorridas', e)
            errors.push(e instanceof Error ? e.message : 'Error cargando corridas')
          }

          let productos: ProductoViajeRow[] = []
          try {
            const activos = viajeRows.filter(v => v.estado !== 'recibido')
            productos = await fetchProductosViaje(supabase, activos.map(v => v.id))
          } catch (e) {
            console.error('[dashboard] fetchProductosViaje', e)
            errors.push(e instanceof Error ? e.message : 'Error cargando productos')
          }

          if (!cancelled) {
            setLotes(loteRows)
            setViajes(viajeRows)
            setProductosViaje(productos)
            setCorridasActivas(corridaRows)
            if (errors.length > 0) {
              setLoadError(errors[0] ?? 'Error cargando bodega')
            }
          }
        } else if (profileType === 'distributor') {
          const rows = await fetchSkus(supabase, scope)
          if (!cancelled) setSkus(rows)
        }
      } catch (e) {
        console.error('[dashboard] load', e)
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : 'Error cargando dashboard')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [scope, profileType, clerkId, supabase, dataVersion])

  const agentHints = useMemo(
    () => ({
      query: userQuery,
      selectedId,
    }),
    [userQuery, selectedId]
  )

  const agentFallback = useMemo(
    () => ({
      mensaje:
        agentProfileType === 'distiller'
          ? `${lotes.length} lote${lotes.length === 1 ? '' : 's'} en bodega. Pregúntame por costos, merma o producción.`
          : `${skus.length} SKU${skus.length === 1 ? '' : 's'} en inventario. Pregúntame por stock, pedidos o cobros.`,
    }),
    [agentProfileType, lotes.length, skus.length]
  )

  const { mensaje, loading: agentLoading, refreshLoteId } = useProofContextBar({
    pantalla: 'inicio',
    vista: agentProfileType === 'distiller' ? 'destilador' : 'distribuidor',
    profileType: agentProfileType,
    hints: agentHints,
    requestId: agentRequestId,
    enabled: Boolean(clerkId) && agentProfileType != null,
    fallback: agentFallback,
  })

  const quickActionsForProfile = isDistiller
    ? [...DISTILLER_QUICK_ACTIONS]
    : [...DISTRIBUTOR_QUICK_ACTIONS]

  useEffect(() => {
    if (!refreshLoteId) return
    setSelectedId(refreshLoteId)
    setDataVersion(v => v + 1)
  }, [refreshLoteId])

  const handleAgentSend = useCallback(
    (message: string) => {
      const q = message.toLowerCase()
      if (
        q.includes('nuevo viaje') ||
        q.includes('nuevo pedido') ||
        (q.includes('registrar') && q.includes('viaje'))
      ) {
        router.push(
          isDistiller
            ? '/dashboard/destilador/compras/nuevo'
            : '/dashboard/pedidos/nuevo'
        )
        return
      }
      setUserQuery(message)
      setAgentRequestId(n => n + 1)
    },
    [router, isDistiller]
  )

  const dividerLabel = isDistiller
    ? loading
      ? 'Bodega — …'
      : pendingViajeCards.length > 0
        ? `Bodega — ${lotes.length} lote${lotes.length === 1 ? '' : 's'} · ${pendingViajeCards.length} por recibir`
        : `Bodega — ${lotes.length} lote${lotes.length === 1 ? '' : 's'}`
    : `Inventario — ${loading ? '…' : skus.length} SKUs`

  const showProfileGate = profileLoading && !activeProfile

  if (showProfileGate) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: CANVAS_BG,
          display: 'grid',
          placeItems: 'center',
          color: '#999',
          fontSize: 13,
        }}
      >
        Cargando PROOF…
      </div>
    )
  }

  if (!profileType) {
    return (
      <div
        style={{
          background: CANVAS_BG,
          minHeight: '100vh',
          padding: 48,
          textAlign: 'center',
          color: '#888',
          fontSize: 13,
        }}
      >
        Perfil no compatible con el canvas PROOF.
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: CANVAS_BG,
        color: '#1A1A1A',
      }}
    >
      <style>{`
        @keyframes proof-skeleton-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
        .proof-quick-action:hover {
          border-color: var(--proof-accent) !important;
          color: #1A1A1A !important;
        }
      `}</style>

      <AgentBar
        accent={accent}
        onSend={handleAgentSend}
        response={mensaje}
        isLoading={agentLoading}
        quickActions={quickActionsForProfile}
      />

      <CanvasDivider label={dividerLabel} />

      {!loading && loadError && (
        <div
          style={{
            margin: '0 24px 16px',
            padding: '12px 16px',
            borderRadius: 10,
            border: '0.5px solid #E8B4B4',
            background: '#FFF5F5',
            fontSize: 12,
            color: '#8B2E2E',
            lineHeight: 1.5,
          }}
        >
          No pude cargar la bodega: {loadError}.
          {loadError.includes('clerk_id') && (
            <>
              {' '}
              La tabla <code style={{ fontSize: 11 }}>skus</code> en Supabase debe ser la PROOF
              (con <code style={{ fontSize: 11 }}>clerk_id</code>). Aplica la migración{' '}
              <code style={{ fontSize: 11 }}>20250604100000_skus_proof_replace_legacy.sql</code>{' '}
              y recarga.
            </>
          )}
          {!loadError.includes('clerk_id') && (
            <>
              {' '}
              Si acabas de aplicar SQL, ejecuta{' '}
              <code style={{ fontSize: 11 }}>NOTIFY pgrst, &apos;reload schema&apos;;</code> y
              recarga.
            </>
          )}
        </div>
      )}

        {selectedViajeId != null && clerkId && (
          <ViajePendienteDetalle
            key={`viaje-${selectedViajeId}-${dataVersion}`}
            viajeId={selectedViajeId}
            accent={accent}
            onClose={() => setSelectedViajeId(null)}
            onRecibido={loteId => {
              setSelectedViajeId(null)
              setSelectedId(loteId)
              setDataVersion(v => v + 1)
            }}
          />
        )}

        {selectedId != null && selectedViajeId == null && profileType && (
          <LoteDetalle
            key={`${selectedId}-${dataVersion}`}
            loteId={selectedId}
            profileType={profileType}
            accent={accent}
            onClose={() => setSelectedId(null)}
          />
        )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
          gap: 12,
          padding: '0 24px 32px',
        }}
      >
        {loading &&
          Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              aria-hidden
              style={{
                height: 160,
                borderRadius: 12,
                background: '#F4F2EE',
                animation: 'proof-skeleton-pulse 1.5s ease-in-out infinite',
              }}
            />
          ))}

        {!loading &&
          isDistiller &&
          lotes.map(l => (
            <BotellaCard
              key={l.id}
              id={l.numero_lote}
              nombre={l.tipo_agave}
              maestro={l.maestro ?? '—'}
              estado={mapLoteEstadoToBotella(l.estado)}
              litrosDisponibles={l.litros_disponibles_granel}
              fechaEmbotelladoProgramada={l.fecha_embotellado_programada}
              selected={selectedId === l.id && selectedViajeId == null}
              accent={accent}
              onClick={() => {
                setSelectedViajeId(null)
                setSelectedId(l.id)
              }}
            />
          ))}

        {!loading &&
          isDistiller &&
          pendingViajeCards.map(v => (
            <BotellaCard
              key={`viaje-${v.viajeId}`}
              id={v.estado === 'en_transito' ? 'En tránsito' : 'Por recibir'}
              nombre={v.nombre}
              maestro={v.region}
              estado="pendiente"
              litrosDisponibles={v.litros > 0 ? v.litros : undefined}
              selected={selectedViajeId === v.viajeId}
              dashed
              accent={accent}
              onClick={() => {
                setSelectedId(null)
                setSelectedViajeId(v.viajeId)
              }}
            />
          ))}

        {!loading &&
          !isDistiller &&
          skus.map(s => (
            <SkuCard
              key={s.id}
              id={s.codigo}
              nombre={s.nombre}
              stockDisponible={s.stock_disponible}
              stockTotal={s.stock_total}
              estado={mapSkuEstadoToCard(s.estado)}
              selected={selectedId === s.id}
              accent={accent}
              onClick={() => setSelectedId(s.id)}
            />
          ))}

        {!loading && bodegaCount === 0 && (
          <div
            style={{
              gridColumn: '1 / -1',
              textAlign: 'center',
              padding: '56px 24px',
            }}
          >
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#BBB' }}>
              {isDistiller
                ? 'Registra tu primer viaje a Oaxaca'
                : 'Agrega tu primer SKU al inventario'}
            </p>
            <button
              type="button"
              onClick={() =>
                router.push(
                  isDistiller
                    ? '/dashboard/destilador/compras/nuevo'
                    : '/dashboard/recepcion'
                )
              }
              className="proof-quick-action"
              style={{
                fontSize: 12,
                padding: '10px 18px',
                borderRadius: 8,
                border: '0.5px solid #E0DDD6',
                background: 'transparent',
                color: '#666',
                cursor: 'pointer',
                transition: 'border-color 0.15s ease, color 0.15s ease',
              }}
            >
              {isDistiller ? 'Nuevo viaje' : 'Registrar entrada'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
