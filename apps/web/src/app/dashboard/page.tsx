'use client'

export const dynamic = 'force-dynamic'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useProfile } from '@/context/ProfileContext'
import { useSupabase } from '@/hooks/useSupabase'
import { useProofContextBar } from '@/hooks/useProofContextBar'
import { AgentBar, type Message as AgentMessage } from '@/components/proof/AgentBar'
import { BotellaCard, mapLoteEstadoToBotella } from '@/components/proof/BotellaCard'
import { PedidoCanvasCard } from '@/components/proof/PedidoCanvasCard'
import { PedidoDetalle } from '@/components/proof/PedidoDetalle'
import { SkuCard, mapSkuEstadoToCard } from '@/components/proof/SkuCard'
import { KpiConfigDrawer } from '@/components/proof/KpiConfigDrawer'
import { LoteDetalle } from '@/components/proof/LoteDetalle'
import { ViajePendienteDetalle } from '@/components/proof/ViajePendienteDetalle'
import {
  distributorMetricTone,
  profileTypeFromV2,
  resolveDistributorKpi,
} from '@/lib/proof/canvas-kpi'
import { CANVAS_BG, getProfileTheme } from '@/lib/proof/profile-theme'
import { metricCardLabel, type KpiMetric, type ProfileType } from '@/lib/proof/kpi-metrics'
import { useKpiConfig } from '@/hooks/useKpiConfig'
import type {
  CorridaRow,
  LoteRow,
  ProductoViajeRow,
  ViajeRow,
} from '@/lib/proof/destilador-types'
import { toAgentProfileType } from '@/lib/proof/agent-context-types'
import { fetchSkus, fetchPedidos, type PedidoRow, type SkuRow } from '@/lib/supabase'
import { OrdenCompraCanvasCard } from '@/components/proof/OrdenCompraCanvasCard'
import { OrdenCompraPendienteDetalle } from '@/components/proof/OrdenCompraPendienteDetalle'
import {
  fetchCorridas,
  fetchLotes,
  fetchProductosViaje,
  fetchViajes,
} from '@/lib/supabase/destilador'
import {
  fetchOrdenesCompraDistribuidorPendientes,
  fetchOrdenesCompraConCxPendiente,
  fetchPagosProveedorByCuentaIds,
  fetchPedidosConCxCPendiente,
  type OrdenCompraConCxP,
  type OrdenCompraDistribuidorWithItems,
  type PedidoConCxC,
} from '@/lib/supabase/distribuidor'

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
  { label: 'Deuda vencida', message: '¿Quién tiene deuda vencida?' },
  {
    label: '+ Orden de compra',
    message: 'Quiero registrar una orden de compra',
    href: '/dashboard/distribuidor/compras/nuevo',
  },
  {
    label: '+ Nuevo pedido',
    message: 'Quiero registrar un nuevo pedido',
    href: '/dashboard/pedidos/nuevo',
  },
] as const

const LOAD_TIMEOUT_MS = 15_000

async function loadWithTimeout<T>(
  promise: Promise<T>,
  fallback: T,
  label: string
): Promise<T> {
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        setTimeout(() => reject(new Error(`${label} timeout`)), LOAD_TIMEOUT_MS)
      }),
    ])
  } catch (e) {
    console.error(`[dashboard] ${label}`, e)
    return fallback
  }
}

const MONO = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
const PROVEEDOR_ACCENT = '#1E6FA8'
const CLIENTE_ACCENT = '#2D6A4F'
const INVENTARIO_ACCENT = '#C2410C'

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
          fontFamily: MONO,
        }}
      >
        {label}
      </span>
      <div style={{ flex: 1, height: '0.5px', background: '#E8E6E0' }} />
    </div>
  )
}

function CanvasSectionDivider({
  accent,
  label,
  ctaLabel,
  ctaHref,
}: {
  accent: string
  label: string
  ctaLabel?: string
  ctaHref?: string
}) {
  const router = useRouter()
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '0 24px 10px',
        marginTop: 20,
      }}
    >
      <div style={{ flex: 1, height: 1.5, background: `${accent}22` }} />
      <span
        style={{
          fontSize: 9,
          fontFamily: MONO,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: accent,
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
      {ctaLabel && ctaHref ? (
        <button
          type="button"
          onClick={() => router.push(ctaHref)}
          style={{
            fontSize: 11,
            padding: '4px 10px',
            borderRadius: 6,
            border: `0.5px solid ${accent}44`,
            background: 'transparent',
            color: accent,
            cursor: 'pointer',
            fontFamily: MONO,
            whiteSpace: 'nowrap',
          }}
        >
          {ctaLabel}
        </button>
      ) : (
        <div style={{ flex: 1, height: 1.5, background: `${accent}22` }} />
      )}
    </div>
  )
}

function SectionGrid({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
        gap: 12,
        padding: '0 24px 8px',
      }}
    >
      {children}
    </div>
  )
}

function SectionSkeleton({ count = 3 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          aria-hidden
          style={{
            height: 140,
            borderRadius: 12,
            background: '#F4F2EE',
            animation: 'proof-skeleton-pulse 1.5s ease-in-out infinite',
          }}
        />
      ))}
    </>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const { scope, activeProfile, loading: profileLoading, profilesResolved } = useProfile()
  const supabase = useSupabase()

  const agentProfileType = toAgentProfileType(activeProfile?.profile_type_v2)
  const profileType = profileTypeFromV2(activeProfile?.profile_type_v2)
  const theme = getProfileTheme(activeProfile?.profile_type_v2)
  const accent = theme.accent
  const clerkId = scope?.clerk_id
  const scopeProfileType = scope?.profile_type_v2
  const isDistiller = profileType === 'distiller'

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedPedidoId, setSelectedPedidoId] = useState<string | null>(null)
  const [selectedViajeId, setSelectedViajeId] = useState<string | null>(null)
  const [selectedOrdenId, setSelectedOrdenId] = useState<string | null>(null)
  const [userQuery, setUserQuery] = useState<string | null>(null)
  const [agentConversation, setAgentConversation] = useState<AgentMessage[]>([])
  const [agentImage, setAgentImage] = useState<string | null>(null)
  const [lotes, setLotes] = useState<LoteRow[]>([])
  const [viajes, setViajes] = useState<ViajeRow[]>([])
  const [productosViaje, setProductosViaje] = useState<ProductoViajeRow[]>([])
  const [corridasActivas, setCorridasActivas] = useState<CorridaRow[]>([])
  const [skus, setSkus] = useState<SkuRow[]>([])
  const [ordenesCompra, setOrdenesCompra] = useState<OrdenCompraDistribuidorWithItems[]>([])
  const [ordenesConCxP, setOrdenesConCxP] = useState<OrdenCompraConCxP[]>([])
  const [pedidos, setPedidos] = useState<(PedidoRow & { clients?: { name: string } | null })[]>(
    []
  )
  const [pedidosConCxC, setPedidosConCxC] = useState<PedidoConCxC[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [dataVersion, setDataVersion] = useState(0)
  const [silentRefresh, setSilentRefresh] = useState(0)
  const pendingSilentLoadRef = useRef(false)
  const [agentRequestId, setAgentRequestId] = useState(0)
  const [uploadingSkuId, setUploadingSkuId] = useState<string | null>(null)
  const [kpiEditor, setKpiEditor] = useState<{ skuId: string; slot: 0 | 1 | 2 } | null>(null)

  const { config: skuKpiConfig, updateKpi } = useKpiConfig(profileType ?? 'distributor')

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

  const pendingOrdenCards = useMemo(() => {
    if (isDistiller) return []
    return ordenesCompra.filter(o => o.estado === 'pendiente' || o.estado === 'parcial')
  }, [isDistiller, ordenesCompra])

  const activePedidoCards = useMemo(() => {
    if (isDistiller) return []
    return pedidos.filter(p =>
      ['confirmado', 'preparando', 'en_ruta', 'parcial'].includes(p.estado)
    )
  }, [isDistiller, pedidos])

  const proveedorPorSkuId = useMemo(() => {
    const map = new Map<string, string>()
    for (const oc of [...ordenesCompra, ...ordenesConCxP]) {
      const prov = oc.proveedor_nombre?.trim()
      if (!prov) continue
      for (const it of oc.items_orden_compra_distribuidor ?? []) {
        if (it.sku_id) map.set(it.sku_id, prov)
      }
    }
    return map
  }, [ordenesCompra, ordenesConCxP])

  const resolveProveedorSku = useCallback(
    (s: SkuRow) => {
      const direct = s.productor?.trim()
      if (direct) return direct
      return proveedorPorSkuId.get(s.id) ?? '—'
    },
    [proveedorPorSkuId]
  )

  const proveedorCount = pendingOrdenCards.length + ordenesConCxP.length
  const clienteCount = activePedidoCards.length + pedidosConCxC.length

  const bodegaCount = isDistiller
    ? lotes.length + pendingViajeCards.length
    : skus.length + proveedorCount + clienteCount

  const handleSkuImageUpload = useCallback(
    async (skuId: string, file: File) => {
      setUploadingSkuId(skuId)
      try {
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
        const path = `skus/${skuId}/${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(path, file, {
            contentType: file.type || 'image/jpeg',
            upsert: true,
          })
        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(path)
        const { error: updateError } = await supabase
          .from('skus')
          .update({ imagen_url: urlData.publicUrl })
          .eq('id', skuId)
        if (updateError) throw updateError

        setSkus(prev =>
          prev.map(s => (s.id === skuId ? { ...s, imagen_url: urlData.publicUrl } : s))
        )
      } catch (e) {
        console.error('[dashboard] sku image upload', e)
        alert(`No se pudo subir la imagen: ${e instanceof Error ? e.message : 'error'}`)
      } finally {
        setUploadingSkuId(null)
      }
    },
    [supabase]
  )

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') setDataVersion(v => v + 1)
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  useEffect(() => {
    if (!profilesResolved || !scope || !profileType) {
      setLoading(false)
      return
    }

    let cancelled = false
    const isSilent = pendingSilentLoadRef.current
    pendingSilentLoadRef.current = false
    if (!isSilent) setLoading(true)

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
          const [rows, pedidoRows, ocRows, ocCxPRows, pedCxCRows] = await Promise.all([
            loadWithTimeout(fetchSkus(supabase, scope), [] as SkuRow[], 'fetchSkus'),
            loadWithTimeout(fetchPedidos(supabase, scope, { limit: 12 }), [], 'fetchPedidos'),
            loadWithTimeout(
              fetchOrdenesCompraDistribuidorPendientes(supabase, scope),
              [],
              'fetchOrdenesCompraPendientes'
            ),
            loadWithTimeout(
              fetchOrdenesCompraConCxPendiente(supabase, scope),
              [],
              'fetchOrdenesCompraConCxPendiente'
            ),
            loadWithTimeout(
              fetchPedidosConCxCPendiente(supabase, scope),
              [],
              'fetchPedidosConCxCPendiente'
            ),
          ])
          const cxpIds = ocCxPRows.map(o => o.cxp.id)
          const pagosProveedor = await loadWithTimeout(
            fetchPagosProveedorByCuentaIds(supabase, cxpIds, scope),
            [],
            'fetchPagosProveedorByCuentaIds'
          )
          const pagosByCxp = new Map<string, typeof pagosProveedor>()
          for (const p of pagosProveedor) {
            const list = pagosByCxp.get(p.cuenta_por_pagar_id) ?? []
            list.push(p)
            pagosByCxp.set(p.cuenta_por_pagar_id, list)
          }
          const ocCxPConPagos = ocCxPRows.map(o => ({
            ...o,
            cxp: {
              ...o.cxp,
              pagos: pagosByCxp.get(o.cxp.id) ?? [],
            },
          }))
          if (!cancelled) {
            setSkus(rows)
            setPedidos(pedidoRows as (PedidoRow & { clients?: { name: string } | null })[])
            setOrdenesCompra(ocRows)
            setOrdenesConCxP(ocCxPConPagos)
            setPedidosConCxC(pedCxCRows)
          }
        }
      } catch (e) {
        console.error('[dashboard] load', e)
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : 'Error cargando dashboard')
        }
      } finally {
        setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [profilesResolved, scopeProfileType, scope?.clerk_id, profileType, clerkId, supabase, dataVersion, silentRefresh])

  /** Evita re-fetch del agente cuando solo cambia el historial del chat */
  const agentFetchHints = useMemo(
    () => ({
      query: userQuery,
      selectedId,
      ...(agentImage ? { image: agentImage } : {}),
    }),
    [userQuery, selectedId, agentImage]
  )

  const agentHints = useMemo(
    () => ({
      ...agentFetchHints,
      conversation: agentConversation.map(m => ({
        role: m.role,
        content: m.content,
      })),
    }),
    [agentFetchHints, agentConversation]
  )

  const agentFallback = useMemo(() => {
    if (agentProfileType === 'distiller') {
      return {
        mensaje: `${lotes.length} lote${lotes.length === 1 ? '' : 's'} en bodega. Pregúntame por costos, merma o producción.`,
      }
    }
    if (skus.length === 0 && pedidos.length > 0 && pendingOrdenCards.length === 0) {
      return {
        mensaje: `${pedidos.length} pedido${pedidos.length === 1 ? '' : 's'} registrado${pedidos.length === 1 ? '' : 's'} (sin catálogo SKU aún). Pregúntame por pedidos o entregas.`,
      }
    }
    if (pendingOrdenCards.length > 0) {
      return {
        mensaje: `${skus.length} SKU${skus.length === 1 ? '' : 's'} en bodega · ${pendingOrdenCards.length} orden${pendingOrdenCards.length === 1 ? '' : 'es'} por recibir. Pregúntame por stock o confirmar llegadas.`,
      }
    }
    return {
      mensaje: `${skus.length} SKU${skus.length === 1 ? '' : 's'} en inventario. Pregúntame por stock, pedidos o cobros.`,
    }
  }, [agentProfileType, lotes.length, skus.length, pedidos.length, pendingOrdenCards.length])

  const { mensaje, loading: agentLoading, refreshLoteId, refreshPedidoId } = useProofContextBar({
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
    if (!refreshLoteId && !refreshPedidoId) return
    pendingSilentLoadRef.current = true
    setSilentRefresh(v => v + 1)
    if (refreshPedidoId) {
      setSelectedPedidoId(refreshPedidoId)
      setSelectedId(null)
      setSelectedOrdenId(null)
    } else if (refreshLoteId) {
      setSelectedId(refreshLoteId)
      setSelectedPedidoId(null)
    }
  }, [refreshLoteId, refreshPedidoId])

  const handleAgentSend = useCallback(
    (message: string, conversation: AgentMessage[], image?: string | null) => {
      const q = message.toLowerCase()
      setAgentConversation(conversation)
      setAgentImage(image ?? null)
      if (
        q.includes('nuevo viaje') ||
        q.includes('nuevo pedido') ||
        q.includes('orden de compra') ||
        (q.includes('registrar') && (q.includes('viaje') || q.includes('compra')))
      ) {
        router.push(
          isDistiller
            ? '/dashboard/destilador/compras/nuevo'
            : q.includes('compra') || q.includes('orden')
              ? '/dashboard/distribuidor/compras/nuevo'
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
    : loading
      ? 'Inventario — …'
      : pendingOrdenCards.length > 0 || ordenesConCxP.length > 0
        ? `Inventario — ${skus.length} SKU${skus.length === 1 ? '' : 's'} · ${pendingOrdenCards.length} por recibir${ordenesConCxP.length > 0 ? ` · ${ordenesConCxP.length} CxP` : ''}`
        : skus.length > 0
          ? `Inventario — ${skus.length} SKUs`
          : pedidos.length > 0
            ? `Pedidos — ${pedidos.length} registrados`
            : 'Inventario — 0 SKUs'

  const showProfileGate = profileLoading
  const showSkeleton = profileLoading || loading

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

      {isDistiller && <CanvasDivider label={dividerLabel} />}

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

        {selectedOrdenId != null && !isDistiller && (
          <OrdenCompraPendienteDetalle
            key={`oc-${selectedOrdenId}-${dataVersion}`}
            ordenId={selectedOrdenId}
            accent={PROVEEDOR_ACCENT}
            onClose={() => setSelectedOrdenId(null)}
            onRecibido={() => {
              setSelectedOrdenId(null)
              setDataVersion(v => v + 1)
            }}
          />
        )}

        {selectedPedidoId != null && !isDistiller && (
          <PedidoDetalle
            key={selectedPedidoId}
            pedidoId={selectedPedidoId}
            refreshKey={silentRefresh}
            accent={accent}
            onClose={() => setSelectedPedidoId(null)}
          />
        )}

        {selectedId != null &&
          selectedViajeId == null &&
          selectedOrdenId == null &&
          selectedPedidoId == null &&
          profileType && (
          <LoteDetalle
            key={`${selectedId}-${dataVersion}`}
            loteId={selectedId}
            profileType={profileType}
            accent={accent}
            onClose={() => setSelectedId(null)}
          />
        )}

      {!isDistiller && (
        <>
          <CanvasSectionDivider
            accent={PROVEEDOR_ACCENT}
            label={
              showSkeleton
                ? 'PROVEEDORES · …'
                : `PROVEEDORES · ${proveedorCount} orden${proveedorCount !== 1 ? 'es' : ''} activa${proveedorCount !== 1 ? 's' : ''}`
            }
            ctaLabel="+ Orden de compra"
            ctaHref="/dashboard/distribuidor/compras/nuevo"
          />
          <SectionGrid>
            {showSkeleton && <SectionSkeleton count={2} />}
            {!showSkeleton &&
              pendingOrdenCards.map(o => (
                <OrdenCompraCanvasCard
                  key={o.id}
                  orden={o}
                  selected={selectedOrdenId === o.id}
                  onClick={() => {
                    setSelectedId(null)
                    setSelectedPedidoId(null)
                    setSelectedOrdenId(o.id)
                  }}
                />
              ))}
            {!showSkeleton &&
              ordenesConCxP.map(o => (
                <OrdenCompraCanvasCard
                  key={`cxp-${o.id}`}
                  orden={o}
                  selected={selectedOrdenId === o.id}
                  onClick={() => {
                    setSelectedId(null)
                    setSelectedPedidoId(null)
                    setSelectedOrdenId(o.id)
                  }}
                />
              ))}
            {!showSkeleton && proveedorCount === 0 && (
              <p style={{ gridColumn: '1 / -1', margin: 0, fontSize: 12, color: '#BBB' }}>
                Sin órdenes de compra activas.
              </p>
            )}
          </SectionGrid>

          <CanvasSectionDivider
            accent={CLIENTE_ACCENT}
            label={
              showSkeleton
                ? 'CLIENTES · …'
                : `CLIENTES · ${clienteCount} pedido${clienteCount !== 1 ? 's' : ''} activo${clienteCount !== 1 ? 's' : ''}`
            }
            ctaLabel="+ Nuevo pedido"
            ctaHref="/dashboard/pedidos/nuevo"
          />
          <SectionGrid>
            {showSkeleton && <SectionSkeleton count={2} />}
            {!showSkeleton &&
              activePedidoCards.map(p => (
                <PedidoCanvasCard
                  key={p.id}
                  pedido={p}
                  accent={CLIENTE_ACCENT}
                  selected={selectedPedidoId === p.id}
                  onClick={() => {
                    setSelectedPedidoId(p.id)
                    setSelectedId(null)
                    setSelectedOrdenId(null)
                  }}
                />
              ))}
            {!showSkeleton &&
              pedidosConCxC.map(p => (
                <PedidoCanvasCard
                  key={`cxc-${p.id}`}
                  pedido={p}
                  accent={CLIENTE_ACCENT}
                  cxc={p.cxc}
                  selected={selectedPedidoId === p.id}
                  onClick={() => {
                    setSelectedPedidoId(p.id)
                    setSelectedId(null)
                    setSelectedOrdenId(null)
                  }}
                />
              ))}
            {!showSkeleton && clienteCount === 0 && (
              <p style={{ gridColumn: '1 / -1', margin: 0, fontSize: 12, color: '#BBB' }}>
                Sin pedidos activos.
              </p>
            )}
          </SectionGrid>

          <CanvasSectionDivider
            accent={INVENTARIO_ACCENT}
            label={
              showSkeleton
                ? 'INVENTARIO · …'
                : `INVENTARIO · ${skus.length} SKU${skus.length !== 1 ? 's' : ''}`
            }
          />
        </>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isDistiller
            ? 'repeat(auto-fill, minmax(132px, 1fr))'
            : 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: 12,
          padding: isDistiller ? '0 24px 32px' : '0 24px 32px',
        }}
      >
        {showSkeleton && isDistiller &&
          Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              aria-hidden
              style={{
                height: 200,
                borderRadius: 12,
                background: '#F4F2EE',
                animation: 'proof-skeleton-pulse 1.5s ease-in-out infinite',
              }}
            />
          ))}

        {showSkeleton && !isDistiller && <SectionSkeleton count={4} />}

        {!showSkeleton &&
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

        {!showSkeleton &&
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

        {!showSkeleton &&
          !isDistiller &&
          skus.map(s => {
            const dataItems = skuKpiConfig.map(k => {
              const metric = k.metric as KpiMetric
              return {
                label: metricCardLabel('distributor', metric),
                value: resolveDistributorKpi(metric, s, [s]),
                tone: distributorMetricTone(metric, s),
              }
            })
            const editorOpen = kpiEditor?.skuId === s.id
            const editorSlot = kpiEditor?.slot ?? 0
            return (
              <SkuCard
                key={s.id}
                nombre={s.nombre}
                proveedorNombre={resolveProveedorSku(s)}
                imagenUrl={s.imagen_url}
                estado={mapSkuEstadoToCard(s.estado)}
                dataItems={dataItems}
                selected={selectedId === s.id && selectedPedidoId == null}
                accent={INVENTARIO_ACCENT}
                uploading={uploadingSkuId === s.id}
                configOpen={editorOpen}
                onClick={() => {
                  setSelectedPedidoId(null)
                  setSelectedId(s.id)
                }}
                onConfigClick={() =>
                  setKpiEditor(prev =>
                    prev?.skuId === s.id ? null : { skuId: s.id, slot: 0 }
                  )
                }
                configPanel={
                  editorOpen ? (
                    <>
                      <div
                        style={{
                          display: 'flex',
                          gap: 4,
                          marginTop: 8,
                          marginBottom: 4,
                        }}
                      >
                        {([0, 1, 2] as const).map(slot => (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => setKpiEditor({ skuId: s.id, slot })}
                            style={{
                              flex: 1,
                              fontSize: 9,
                              fontFamily:
                                'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                              padding: '4px 0',
                              borderRadius: 4,
                              border:
                                editorSlot === slot
                                  ? `0.5px solid ${INVENTARIO_ACCENT}`
                                  : '0.5px solid #E8E6E0',
                              background: editorSlot === slot ? `${INVENTARIO_ACCENT}12` : '#fff',
                              color: editorSlot === slot ? INVENTARIO_ACCENT : '#AAA',
                              cursor: 'pointer',
                            }}
                          >
                            {slot + 1}
                          </button>
                        ))}
                      </div>
                      <KpiConfigDrawer
                        slot={editorSlot}
                        profileType="distributor"
                        currentMetric={skuKpiConfig[editorSlot]?.metric ?? 'stock_disponible'}
                        currentScope={skuKpiConfig[editorSlot]?.scope ?? 'all'}
                        accent={INVENTARIO_ACCENT}
                        onSelect={(metric, scope) => {
                          void updateKpi(editorSlot, metric, scope)
                        }}
                        onClose={() => setKpiEditor(null)}
                      />
                    </>
                  ) : undefined
                }
                onImageSelect={file => void handleSkuImageUpload(s.id, file)}
              />
            )
          })}

        {!showSkeleton && !isDistiller && skus.length === 0 && (
          <p style={{ gridColumn: '1 / -1', margin: 0, fontSize: 12, color: '#BBB' }}>
            Sin SKUs en inventario.
          </p>
        )}

        {!showSkeleton && bodegaCount === 0 && (
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
                : 'Registra tu primera orden de compra o entrada de inventario'}
            </p>
            <button
              type="button"
              onClick={() =>
                router.push(
                  isDistiller
                    ? '/dashboard/destilador/compras/nuevo'
                    : '/dashboard/distribuidor/compras/nuevo'
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
              {isDistiller ? 'Nuevo viaje' : 'Nueva orden de compra'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
