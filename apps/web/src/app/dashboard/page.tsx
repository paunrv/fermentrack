'use client'

export const dynamic = 'force-dynamic'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { useProfile } from '@/context/ProfileContext'
import { useSupabase } from '@/hooks/useSupabase'
import { useProofContextBar } from '@/hooks/useProofContextBar'
import { AgentBar } from '@/components/proof/AgentBar'
import { BotellaCard, mapLoteEstadoToBotella } from '@/components/proof/BotellaCard'
import { SkuCard, mapSkuEstadoToCard } from '@/components/proof/SkuCard'
import { LoteDetalle } from '@/components/proof/LoteDetalle'
import { profileTypeFromV2 } from '@/lib/proof/canvas-kpi'
import type { ProfileType } from '@/lib/proof/kpi-metrics'
import type { DestMembresia, LoteRow } from '@/lib/proof/destilador-types'
import { fetchSkus, type SkuRow } from '@/lib/supabase'
import { fetchDestiladorMembresia, fetchLotes } from '@/lib/supabase/destilador'

const ACCENTS: Record<ProfileType, string> = {
  distiller: '#C8A96E',
  distributor: '#378ADD',
}

const PROFILE_BADGE: Record<ProfileType, string> = {
  distiller: 'DESTILADOR',
  distributor: 'DISTRIBUIDOR',
}

const MEMBRESIA_LABEL: Record<DestMembresia, string> = {
  basico: 'Básico',
  profesional: 'Profesional',
  premium: 'Premium',
}

const DISTILLER_QUICK_ACTIONS = [
  { label: '¿Cuánto stock terminado?', message: '¿Cuánto stock terminado tengo?' },
  { label: 'Lotes listos para embotellar', message: '¿Qué lotes están listos para embotellar?' },
  { label: 'Deuda palenqueros', message: '¿Cuánto debo a palenqueros?' },
  { label: '+ Nuevo viaje', message: 'Quiero registrar un nuevo viaje a Oaxaca' },
] as const

const DISTRIBUTOR_QUICK_ACTIONS = [
  { label: 'Stock bajo', message: '¿Qué SKUs tienen stock bajo?' },
  { label: 'Pedidos pendientes', message: '¿Qué pedidos están pendientes de entrega?' },
  { label: 'Por cobrar', message: '¿Cuánto tengo por cobrar?' },
  { label: '+ Nuevo pedido', message: 'Quiero registrar un nuevo pedido' },
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
  const { user } = useUser()
  const { scope } = useProfile()
  const supabase = useSupabase()

  const profileType = profileTypeFromV2(scope?.profile_type_v2)
  const accent = profileType ? ACCENTS[profileType] : '#378ADD'
  const clerkId = scope?.clerk_id
  const isDistiller = profileType === 'distiller'

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [userQuery, setUserQuery] = useState<string | null>(null)
  const [lotes, setLotes] = useState<LoteRow[]>([])
  const [skus, setSkus] = useState<SkuRow[]>([])
  const [membresia, setMembresia] = useState<DestMembresia>('basico')
  const [loading, setLoading] = useState(true)

  const itemCount = isDistiller ? lotes.length : skus.length

  useEffect(() => {
    if (!scope || !profileType) {
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    const load = async () => {
      try {
        if (profileType === 'distiller' && clerkId) {
          const [rows, m] = await Promise.all([
            fetchLotes(supabase, clerkId, { limit: 500 }),
            fetchDestiladorMembresia(supabase, clerkId),
          ])
          if (!cancelled) {
            setLotes(rows)
            setMembresia(m)
          }
        } else if (profileType === 'distributor') {
          const rows = await fetchSkus(supabase, scope)
          if (!cancelled) setSkus(rows)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [scope, profileType, clerkId, supabase])

  const agentContext = useMemo(() => {
    const base = isDistiller
      ? { lotesCount: lotes.length, selectedId }
      : { skusCount: skus.length, selectedId }
    return userQuery ? { ...base, query: userQuery } : base
  }, [isDistiller, lotes.length, skus.length, selectedId, userQuery])

  const { mensaje, loading: agentLoading } = useProofContextBar({
    pantalla: 'inicio',
    vista: isDistiller ? 'destilador' : 'distribuidor',
    contexto: agentContext,
    enabled: !loading && profileType != null,
    fallback: {
      mensaje: isDistiller
        ? `${lotes.length} lote${lotes.length === 1 ? '' : 's'} en bodega. Pregúntame por costos, merma o producción.`
        : `${skus.length} SKU${skus.length === 1 ? '' : 's'} en inventario. Pregúntame por stock, pedidos o cobros.`,
    },
  })

  const agentResponse = agentLoading ? 'PROOF analizando…' : mensaje

  const quickActionsForProfile = isDistiller
    ? [...DISTILLER_QUICK_ACTIONS]
    : [...DISTRIBUTOR_QUICK_ACTIONS]

  const handleAgentSend = useCallback((message: string) => {
    setUserQuery(message)
  }, [])

  const dividerLabel = isDistiller
    ? `Bodega — ${loading ? '…' : itemCount} lotes`
    : `Inventario — ${loading ? '…' : itemCount} SKUs`

  const initials =
    user?.firstName && user?.lastName
      ? `${user.firstName[0]}${user.lastName[0]}`
      : user?.firstName?.[0] || 'U'

  if (!profileType) {
    return (
      <div
        style={{
          background: '#F8F7F4',
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
        ['--proof-accent' as string]: accent,
        minHeight: '100vh',
        background: '#F8F7F4',
        color: '#1A1A1A',
      }}
    >
      <style>{`
        @keyframes proof-skeleton-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
      `}</style>

      <header
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 30,
          height: 56,
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 24px',
          background: '#F8F7F4',
          borderBottom: `2px solid ${accent}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              fontSize: 13,
              fontWeight: 500,
              letterSpacing: '0.15em',
              color: '#1A1A1A',
            }}
          >
            PR<span style={{ color: accent }}>O</span>OF
          </span>
          <span
            style={{
              fontSize: 9,
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              borderRadius: 4,
              padding: '3px 8px',
              background: `${accent}18`,
              color: accent,
              border: `0.5px solid ${accent}33`,
              letterSpacing: '0.06em',
            }}
          >
            {PROFILE_BADGE[profileType]}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {isDistiller && (
            <span
              style={{
                fontSize: 10,
                color: '#BBB',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              }}
            >
              {MEMBRESIA_LABEL[membresia]}
            </span>
          )}
          <div
            aria-hidden
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: `${accent}18`,
              color: accent,
              fontSize: 11,
              fontWeight: 600,
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            {initials}
          </div>
        </div>
      </header>

      <main style={{ paddingTop: 56 }}>
        <AgentBar
          accent={accent}
          onSend={handleAgentSend}
          response={agentResponse}
          quickActions={quickActionsForProfile}
        />

        <CanvasDivider label={dividerLabel} />

        {selectedId != null && (
          <LoteDetalle
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
                selected={selectedId === l.id}
                accent={accent}
                onClick={() => setSelectedId(l.id)}
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

          {!loading && itemCount === 0 && (
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
                style={{
                  fontSize: 12,
                  padding: '10px 18px',
                  borderRadius: 8,
                  border: '0.5px solid #E0DDD6',
                  background: 'transparent',
                  color: '#666',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = '#999'
                  e.currentTarget.style.color = '#1A1A1A'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = '#E0DDD6'
                  e.currentTarget.style.color = '#666'
                }}
              >
                {isDistiller ? 'Nuevo viaje' : 'Registrar entrada'}
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
