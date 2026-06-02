'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { useProfile } from '@/context/ProfileContext'
import { useSupabase } from '@/hooks/useSupabase'
import {
  fetchDistMovements,
  fetchSkus,
  type DistMovementWithRefs,
  type MovementType,
  type ProductCategory,
  type SkuRow,
} from '@/lib/supabase'
import { buildAlertasFromSkus, resolverEstadoInicio } from '@/lib/proof/alerts'
import { fmtMoney } from '@/lib/proof/format'
import type { InicioEstado } from '@/lib/proof/types'
import { AlertCard } from '@/components/proof/AlertCard'
import { ConnectedProofAIBar } from '@/components/proof/ConnectedProofAIBar'

/* =========================================================================
   PROOF · DASHBOARD
   "What requires my attention right now?" — calm operational focus.
   ========================================================================= */

const CATEGORY_LABELS: Record<ProductCategory, string> = {
  cerveza: 'Cerveza',
  vino: 'Vino',
  destilado: 'Destilado',
}

const MOVEMENT_VERB: Record<
  MovementType,
  { verb: string; tone: string; sign: '+' | '−' | '·' }
> = {
  entrada: { verb: 'Entraron', tone: 'var(--ok)', sign: '+' },
  venta: { verb: 'Vendiste', tone: 'var(--copper)', sign: '−' },
  donacion: { verb: 'Donaste', tone: 'var(--info)', sign: '−' },
  merma: { verb: 'Mermaron', tone: 'var(--crit)', sign: '−' },
  muestra: { verb: 'Sacaste muestra de', tone: 'var(--fg-2)', sign: '·' },
}

function fmt(n: number): string {
  return n.toLocaleString('es-MX')
}

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.round(diff / 60000)
  if (m < 1) return 'hace un momento'
  if (m < 60) return `hace ${m} min`
  const h = Math.round(m / 60)
  if (h < 24) return `hace ${h} h`
  const d = Math.round(h / 24)
  return `hace ${d} d`
}

function greetingFor(name: string): string {
  const h = new Date().getHours()
  const part =
    h < 6 ? 'Buenas noches' : h < 13 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'
  return `${part}, ${name}.`
}

/* =========================================================================
   PAGE
   ========================================================================= */

export default function DashboardPage() {
  const router = useRouter()
  const { user } = useUser()
  const { scope } = useProfile()
  const supabase = useSupabase()
  const [skus, setSkus] = useState<SkuRow[]>([])
  const [movements, setMovements] = useState<DistMovementWithRefs[]>([])
  const [loading, setLoading] = useState(true)
  const cameraRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    if (!scope) {
      setLoading(false)
      return
    }
    Promise.all([
      fetchSkus(supabase, scope),
      fetchDistMovements(supabase, { scope, limit: 30 }),
    ])
      .then(([skuRows, movs]) => {
        if (cancelled) return
        setSkus(skuRows)
        setMovements(movs)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [scope?.clerk_id, scope?.profile_type_v2, supabase])

  const firstName = user?.firstName?.split(' ')[0] || 'operador'

  const alertas = useMemo(() => buildAlertasFromSkus(skus), [skus])

  const estadoInicio: InicioEstado = useMemo(
    () => resolverEstadoInicio(skus.length, alertas),
    [skus.length, alertas]
  )

  const alertasVivas = useMemo(() => alertas.slice(0, 3), [alertas])

  const quiebres = useMemo(
    () => skus.filter(s => s.estado === 'quiebre' || s.stock_disponible <= 0).length,
    [skus]
  )

  const attention = useMemo(() => {
    const items: {
      id: string
      kind: 'low' | 'quiebre' | 'sobrevendido'
      message: React.ReactNode
      cta?: { label: string; href: string }
      tone: string
    }[] = []

    skus.forEach(s => {
      if (s.estado === 'sobrevendido') {
        items.push({
          id: `sov-${s.id}`,
          kind: 'sobrevendido',
          tone: 'var(--purple)',
          message: (
            <>
              <strong style={{ color: 'var(--fg-0)' }}>{s.nombre}</strong> sobrevendido — reserva
              mayor que stock.
            </>
          ),
          cta: { label: 'Ver inventario', href: '/dashboard/inventario' },
        })
        return
      }

      if (s.estado === 'quiebre' || s.stock_disponible <= 0) {
        items.push({
          id: `empty-${s.id}`,
          kind: 'quiebre',
          tone: 'var(--crit)',
          message: (
            <>
              <strong style={{ color: 'var(--fg-0)' }}>{s.nombre}</strong> en quiebre (
              {fmt(s.stock_disponible)} bts disp.).
            </>
          ),
          cta: { label: 'Registrar entrada', href: '/dashboard/recepcion' },
        })
        return
      }

      if (s.estado === 'bajo') {
        items.push({
          id: `low-${s.id}`,
          kind: 'low',
          tone: 'var(--warn)',
          message: (
            <>
              Stock bajo en <strong style={{ color: 'var(--fg-0)' }}>{s.nombre}</strong> —{' '}
              {fmt(s.stock_disponible)} bts (mín. {fmt(s.stock_minimo)}).
            </>
          ),
          cta: { label: 'Ver inventario', href: '/dashboard/inventario' },
        })
      }
    })
    return items.slice(0, 5)
  }, [skus])

  /* ─── Today's summary ──────────────────────────────────────── */
  const todaySummary = useMemo(() => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000
    const todayMovs = movements.filter(m => new Date(m.created_at).getTime() >= cutoff)
    const entradas = todayMovs.filter(m => m.movement_type === 'entrada')
    const ventas = todayMovs.filter(m => m.movement_type === 'venta')
    const mermas = todayMovs.filter(m => m.movement_type === 'merma')
    const bottlesIn = entradas.reduce(
      (acc, m) => acc + m.cases * (m.dist_products?.bottles_per_case || 0) + m.loose_units,
      0
    )
    const bottlesOut = ventas.reduce(
      (acc, m) => acc + m.cases * (m.dist_products?.bottles_per_case || 0) + m.loose_units,
      0
    )
    return { entradas: entradas.length, ventas: ventas.length, mermas: mermas.length, bottlesIn, bottlesOut }
  }, [movements])

  const totalBottlesAll = useMemo(
    () => skus.reduce((acc, s) => acc + s.stock_total, 0),
    [skus]
  )

  function openCamera() {
    cameraRef.current?.click()
  }

  function onCameraChange(e: React.ChangeEvent<HTMLInputElement>) {
    e.target.value = ''
    router.push(isDistributor ? '/dashboard/recepcion' : '/dashboard/agente')
  }

  const empty = !loading && skus.length === 0
  const isDistributor = scope?.profile_type_v2 === 'distributor'
  const crisis = estadoInicio === 'crisis'
  const tranquilo = estadoInicio === 'tranquilo'

  const subtitulo =
    crisis && alertas.length > 0
      ? `Hay ${alertas.filter(a => a.nivel === 'P1' || a.nivel === 'P2').length || alertas.length} situaciones que no pueden esperar.`
      : tranquilo
        ? 'Todo al corriente. Nada urgente hoy.'
        : 'Esto es lo que necesita tu atención hoy.'

  const subtituloColor = crisis ? 'var(--crit)' : tranquilo ? 'var(--ok)' : 'var(--fg-2)'

  const proofMessage =
    crisis
      ? 'Prioriza quiebres y sobrevendidos antes de confirmar más pedidos.'
      : tranquilo
        ? 'Flujo estable. Revisa oportunidades de rotación en inventario muerto.'
        : quiebres > 0
          ? `${quiebres} SKU${quiebres === 1 ? '' : 's'} en quiebre — surte o ajusta pedidos hoy.`
          : 'Pregúntame por stock, cobros o lo que sale hoy.'

  return (
    <div
      style={{
        fontFamily: 'var(--font-display)',
        color: 'var(--fg-1)',
        padding: '36px 28px 80px',
        minHeight: 'calc(100vh - 62px)',
        position: 'relative',
      }}
    >
      <div style={{ maxWidth: 1080, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 28 }}>
        {/* ═════════ HERO · WARM GREETING ═════════ */}
        <section className="fade-up">
          <div
            className="eyebrow"
            style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}
          >
            <span className="status-dot ok live" />
            <span>PROOF · Inicio</span>
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: 36,
              fontWeight: 600,
              letterSpacing: '-0.025em',
              lineHeight: 1.1,
              color: 'var(--fg-0)',
              maxWidth: 760,
            }}
          >
            {greetingFor(firstName)}
            <br />
            <span style={{ color: subtituloColor }}>{subtitulo}</span>
          </h1>
        </section>

        {empty ? (
          <FirstRunEmpty onCamera={openCamera} firstName={firstName} />
        ) : (
          <>
            {/* ═════════ ALERTAS VIVAS (P1→P6, máx 3) ═════════ */}
            {alertasVivas.length > 0 && (
              <section
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                {alertasVivas.map(a => (
                  <AlertCard key={a.id} alerta={a} fullWidth={crisis} />
                ))}
              </section>
            )}

            {crisis && (
              <section
                style={{
                  padding: '16px 18px',
                  border: '1px solid var(--hairline)',
                  background: 'var(--panel)',
                  borderRadius: 'var(--radius-card)',
                }}
              >
                <div className="eyebrow" style={{ marginBottom: 8, color: 'var(--gold)' }}>
                  PROOF · síntesis
                </div>
                <p style={{ margin: 0, fontSize: 14, color: 'var(--fg-1)', lineHeight: 1.55 }}>
                  Riesgo operativo concentrado en stock y surtido. Posición financiera semanal
                  disponible en{' '}
                  <Link href="/dashboard/credito" style={{ color: 'var(--gold)' }}>
                    Crédito
                  </Link>
                  .
                </p>
              </section>
            )}

            {tranquilo && (
              <section
                style={{
                  display: 'grid',
                  gap: 10,
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                }}
              >
                <InsightCard
                  title="Rotación"
                  body="Sin alertas P1–P4. Revisa SKUs sin movimiento en Inventario → filtro Sin rotar."
                  href="/dashboard/inventario"
                />
                <InsightCard
                  title="Flujo"
                  body={`${fmtMoney(0)} posición neta estimada — conecta cobros y pagos en Crédito.`}
                  href="/dashboard/credito"
                />
              </section>
            )}

            {/* ═════════ QUICK ACTIONS · UPLOAD-FIRST ═════════ */}
            {!crisis && (
            <section
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 10,
              }}
            >
              <QuickAction
                primary
                onClick={openCamera}
                icon={<CameraIcon />}
                title="Subir foto"
                hint="Factura, pallet o etiqueta"
              />
              <QuickAction
                onClick={() =>
                  router.push(
                    isDistributor
                      ? '/dashboard/recepcion'
                      : '/dashboard/agente?q=' +
                          encodeURIComponent('Registra una entrada de inventario')
                  )
                }
                icon={<ArrowDownIcon />}
                title="Registrar entrada"
                hint={isDistributor ? 'Entrada foto PROOF' : 'Cajas, botellas o materias'}
              />
              <QuickAction
                onClick={() => router.push('/dashboard/inventario')}
                icon={<BoxIcon />}
                title="Ver inventario"
                hint={loading ? '…' : `${fmt(totalBottlesAll)} botellas en stock`}
              />
              {!isDistributor && (
                <QuickAction
                  onClick={() => router.push('/dashboard/agente')}
                  icon={<SparkIcon />}
                  title="Hablar con PROOF"
                  hint="Te ayuda a operar"
                />
              )}
            </section>
            )}

            {/* ═════════ RESUMEN HOY + FLUJO (no crisis) ═════════ */}
            {!crisis && (
              <section
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: 10,
                }}
              >
                <FlowChip label="Pedidos hoy" value="—" hint="Módulo pedidos próximo" />
                <FlowChip
                  label="SKUs en quiebre"
                  value={String(quiebres)}
                  hint={quiebres === 0 ? 'Sin quiebres' : 'Requiere surtido'}
                  tone={quiebres > 0 ? 'var(--crit)' : 'var(--ok)'}
                />
                <FlowChip
                  label="Me deben"
                  value="—"
                  hint="Ver Crédito"
                  href="/dashboard/credito"
                />
                <FlowChip
                  label="Les debo"
                  value="—"
                  hint="Ver productores"
                  href="/dashboard/productores"
                />
              </section>
            )}

            {/* ═════════ ATTENTION + SUMMARY ═════════ */}
            {!crisis && (
              <section
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1.6fr) minmax(280px, 1fr)',
                  gap: 20,
                }}
              >
                <Panel title="Necesita tu atención" loading={loading}>
                  <AttentionList items={attention} loading={loading} />
                </Panel>

                <Panel title="Tu día en cifras" loading={loading}>
                  <TodayDigest summary={todaySummary} loading={loading} totalInStock={totalBottlesAll} />
                </Panel>
              </section>
            )}

            {/* ═════════ RECENT MOVEMENTS · NARRATIVE ═════════ */}
            {!crisis && (
            <section>
              <Panel
                title="Movimientos recientes"
                action={
                  <Link
                    href="/dashboard/movimientos"
                    style={{
                      fontSize: 12,
                      color: 'var(--fg-2)',
                      textDecoration: 'none',
                      letterSpacing: '0.005em',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--copper)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--fg-2)')}
                  >
                    Ver todos →
                  </Link>
                }
                loading={loading}
              >
                <MovementsNarrative rows={movements} loading={loading} onCamera={openCamera} />
              </Panel>
            </section>
            )}

            {/* ═════════ TAGLINE FOOTER ═════════ */}
            <footer
              style={{
                marginTop: 8,
                paddingTop: 24,
                borderTop: '1px solid var(--hairline)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 16,
                flexWrap: 'wrap',
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  color: 'var(--fg-3)',
                  letterSpacing: '-0.005em',
                  maxWidth: 480,
                }}
              >
                Cada botella cuenta una historia. <span style={{ color: 'var(--copper)' }}>Nosotros rastreamos la verdad.</span>
              </p>
              <span
                className="mono"
                style={{
                  fontSize: 10,
                  color: 'var(--fg-4)',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                }}
              >
                PROOF · v2.4
              </span>
            </footer>
          </>
        )}
      </div>

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onCameraChange}
        style={{ display: 'none' }}
      />

      {!empty && !loading && (
        <ConnectedProofAIBar
          pantalla="inicio"
          vista={estadoInicio}
          contexto={{
            estadoInicio,
            alertasCount: alertas.length,
            quiebres,
            crisis,
            tranquilo,
            totalBottlesAll,
            todaySummary,
          }}
          fallback={{ mensaje: proofMessage, accionLabel: 'Preguntar a PROOF' }}
        />
      )}
    </div>
  )
}

function InsightCard({
  title,
  body,
  href,
}: {
  title: string
  body: string
  href: string
}) {
  return (
    <Link
      href={href}
      style={{
        padding: '14px 16px',
        border: '1px solid var(--hairline)',
        background: 'var(--panel)',
        borderRadius: 'var(--radius-card)',
        textDecoration: 'none',
        display: 'block',
      }}
    >
      <div className="eyebrow" style={{ marginBottom: 6 }}>
        {title}
      </div>
      <p style={{ margin: 0, fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.5 }}>{body}</p>
    </Link>
  )
}

function FlowChip({
  label,
  value,
  hint,
  tone = 'var(--fg-0)',
  href,
}: {
  label: string
  value: string
  hint: string
  tone?: string
  href?: string
}) {
  const inner = (
    <>
      <div className="eyebrow" style={{ marginBottom: 6 }}>
        {label}
      </div>
      <div className="mono" style={{ fontSize: 22, fontWeight: 600, color: tone }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 4 }}>{hint}</div>
    </>
  )
  const box = {
    padding: '14px 16px',
    border: '1px solid var(--hairline)',
    background: 'var(--panel)',
    borderRadius: 'var(--radius-md)',
    textDecoration: 'none' as const,
    display: 'block' as const,
  }
  if (href) {
    return (
      <Link href={href} style={box}>
        {inner}
      </Link>
    )
  }
  return <div style={box}>{inner}</div>
}

/* =========================================================================
   PANEL
   ========================================================================= */

function Panel({
  title,
  action,
  children,
  loading,
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
  loading?: boolean
}) {
  return (
    <section
      style={{
        border: '1px solid var(--hairline)',
        background: 'var(--panel)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '14px 18px',
          borderBottom: '1px solid var(--hairline)',
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: '-0.005em',
            color: 'var(--fg-0)',
          }}
        >
          {title}
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {loading && (
            <span
              className="mono"
              style={{
                fontSize: 10,
                color: 'var(--fg-4)',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}
            >
              Cargando…
            </span>
          )}
          {action}
        </div>
      </header>
      <div>{children}</div>
    </section>
  )
}

/* =========================================================================
   QUICK ACTIONS
   ========================================================================= */

function QuickAction({
  icon,
  title,
  hint,
  onClick,
  primary,
}: {
  icon: React.ReactNode
  title: string
  hint: string
  onClick: () => void
  primary?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '14px 16px',
        background: primary ? 'var(--copper-glow)' : 'var(--panel)',
        border: '1px solid',
        borderColor: primary ? 'var(--copper-soft)' : 'var(--hairline)',
        color: 'var(--fg-0)',
        textAlign: 'left',
        cursor: 'pointer',
        transition: 'background 180ms var(--ease-out), border-color 180ms var(--ease-out), transform 180ms var(--ease-out)',
        fontFamily: 'var(--font-display)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = primary ? 'var(--copper)' : 'var(--line)'
        e.currentTarget.style.background = primary ? 'var(--copper-glow)' : 'var(--panel-2)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = primary ? 'var(--copper-soft)' : 'var(--hairline)'
        e.currentTarget.style.background = primary ? 'var(--copper-glow)' : 'var(--panel)'
      }}
    >
      <span
        aria-hidden
        style={{
          width: 34,
          height: 34,
          display: 'grid',
          placeItems: 'center',
          border: '1px solid',
          borderColor: primary ? 'var(--copper)' : 'var(--line)',
          background: primary ? 'var(--copper)' : 'var(--canvas)',
          color: primary ? 'var(--ink)' : 'var(--copper)',
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontSize: 13.5,
            fontWeight: 600,
            color: 'var(--fg-0)',
            letterSpacing: '-0.005em',
          }}
        >
          {title}
        </div>
        <div
          style={{
            marginTop: 2,
            fontSize: 11.5,
            color: 'var(--fg-3)',
            letterSpacing: '0.005em',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {hint}
        </div>
      </div>
    </button>
  )
}

/* =========================================================================
   ATTENTION LIST · human Spanish, conversational
   ========================================================================= */

function AttentionList({
  items,
  loading,
}: {
  items: {
    id: string
    tone: string
    message: React.ReactNode
    cta?: { label: string; href: string }
  }[]
  loading: boolean
}) {
  if (loading) {
    return (
      <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="sweep"
            style={{
              position: 'relative',
              height: 38,
              background: 'var(--canvas)',
              border: '1px solid var(--hairline)',
            }}
          />
        ))}
      </div>
    )
  }
  if (items.length === 0) {
    return (
      <div
        style={{
          padding: '28px 18px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          textAlign: 'center',
        }}
      >
        <span className="status-dot ok" style={{ width: 8, height: 8 }} />
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg-0)' }}>
          Todo está en orden.
        </div>
        <div style={{ fontSize: 12, color: 'var(--fg-3)', maxWidth: 260 }}>
          No hay alertas activas. Te avisaremos si algo cambia.
        </div>
      </div>
    )
  }
  return (
    <div>
      {items.map((item, i) => (
        <div
          key={item.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '14px 18px',
            borderBottom: i === items.length - 1 ? 'none' : '1px solid var(--hairline)',
            transition: 'background 180ms var(--ease-out)',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--panel-2)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <span
            aria-hidden
            style={{
              width: 3,
              height: 36,
              background: item.tone,
              flexShrink: 0,
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 13.5,
                color: 'var(--fg-1)',
                lineHeight: 1.5,
                letterSpacing: '-0.005em',
              }}
            >
              {item.message}
            </div>
          </div>
          {item.cta && (
            <Link
              href={item.cta.href}
              style={{
                flexShrink: 0,
                fontSize: 11,
                fontWeight: 500,
                color: 'var(--fg-2)',
                textDecoration: 'none',
                padding: '6px 10px',
                border: '1px solid var(--hairline)',
                background: 'var(--canvas)',
                transition: 'border-color 180ms var(--ease-out), color 180ms var(--ease-out)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--copper-soft)'
                e.currentTarget.style.color = 'var(--copper)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--hairline)'
                e.currentTarget.style.color = 'var(--fg-2)'
              }}
            >
              {item.cta.label} →
            </Link>
          )}
        </div>
      ))}
    </div>
  )
}

/* =========================================================================
   TODAY DIGEST · narrative numbers
   ========================================================================= */

function TodayDigest({
  summary,
  loading,
  totalInStock,
}: {
  summary: {
    entradas: number
    ventas: number
    mermas: number
    bottlesIn: number
    bottlesOut: number
  }
  loading: boolean
  totalInStock: number
}) {
  if (loading) {
    return (
      <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="sweep"
            style={{
              position: 'relative',
              height: 28,
              background: 'var(--canvas)',
              border: '1px solid var(--hairline)',
            }}
          />
        ))}
      </div>
    )
  }
  const lines: { num: number | string; label: string; tone: string }[] = [
    {
      num: fmt(totalInStock),
      label: 'botellas en stock',
      tone: 'var(--fg-0)',
    },
    {
      num: summary.entradas === 0 ? 'Nada' : fmt(summary.bottlesIn),
      label:
        summary.entradas === 0
          ? 'entró hoy'
          : `botellas entraron en ${summary.entradas} movimiento${summary.entradas === 1 ? '' : 's'}`,
      tone: summary.entradas > 0 ? 'var(--ok)' : 'var(--fg-3)',
    },
    {
      num: summary.ventas === 0 ? 'Nada' : fmt(summary.bottlesOut),
      label:
        summary.ventas === 0
          ? 'saliste hoy'
          : `botellas vendidas en ${summary.ventas} venta${summary.ventas === 1 ? '' : 's'}`,
      tone: summary.ventas > 0 ? 'var(--copper)' : 'var(--fg-3)',
    },
  ]
  if (summary.mermas > 0) {
    lines.push({
      num: fmt(summary.mermas),
      label: `merma${summary.mermas === 1 ? '' : 's'} registrada${summary.mermas === 1 ? '' : 's'}`,
      tone: 'var(--crit)',
    })
  }
  return (
    <div style={{ padding: '14px 18px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      {lines.map((l, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: 10,
          }}
        >
          <span
            className="mono"
            style={{
              fontSize: 22,
              fontWeight: 600,
              color: l.tone,
              letterSpacing: '-0.02em',
              lineHeight: 1,
            }}
          >
            {l.num}
          </span>
          <span style={{ fontSize: 12, color: 'var(--fg-2)', textAlign: 'right', lineHeight: 1.3 }}>
            {l.label}
          </span>
        </div>
      ))}
    </div>
  )
}

/* =========================================================================
   MOVEMENTS · narrative log
   ========================================================================= */

function MovementsNarrative({
  rows,
  loading,
  onCamera,
}: {
  rows: DistMovementWithRefs[]
  loading: boolean
  onCamera: () => void
}) {
  if (loading) {
    return (
      <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="sweep"
            style={{
              position: 'relative',
              height: 24,
              background: 'var(--canvas)',
              border: '1px solid var(--hairline)',
            }}
          />
        ))}
      </div>
    )
  }
  if (rows.length === 0) {
    return (
      <div
        style={{
          padding: '28px 18px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <span
          className="mono"
          style={{
            fontSize: 10,
            color: 'var(--copper)',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
          }}
        >
          ▢ Aún sin movimientos
        </span>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg-0)' }}>
          No has registrado movimientos todavía.
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--fg-3)', maxWidth: 360, lineHeight: 1.55 }}>
          Sube una foto de una factura o un pallet y PROOF extrae la información por ti.
        </div>
        <button
          type="button"
          onClick={onCamera}
          style={{
            marginTop: 6,
            padding: '8px 14px',
            background: 'var(--copper)',
            border: '1px solid var(--copper)',
            color: 'var(--ink)',
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          Subir foto
        </button>
      </div>
    )
  }
  return (
    <div>
      {rows.slice(0, 7).map((m, i) => {
        const meta = MOVEMENT_VERB[m.movement_type]
        const units =
          m.cases * (m.dist_products?.bottles_per_case || 0) + m.loose_units
        const product = m.dist_products?.name
        const counterparty = m.clients?.name || m.recipient || m.event
        return (
          <div
            key={m.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '12px 18px',
              borderBottom: i === Math.min(rows.length, 7) - 1 ? 'none' : '1px solid var(--hairline)',
              transition: 'background 180ms var(--ease-out)',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--panel-2)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <span
              className="mono"
              style={{
                fontSize: 10,
                color: 'var(--fg-4)',
                letterSpacing: '0.04em',
                minWidth: 80,
                flexShrink: 0,
              }}
            >
              {relTime(m.created_at)}
            </span>
            <span
              style={{
                width: 4,
                height: 18,
                background: meta.tone,
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: 13.5,
                color: 'var(--fg-1)',
                lineHeight: 1.5,
                letterSpacing: '-0.005em',
                flex: 1,
                minWidth: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ color: meta.tone, fontWeight: 500 }}>{meta.verb}</span>{' '}
              <span className="mono" style={{ color: meta.tone, fontWeight: 600 }}>
                {meta.sign === '·' ? '' : meta.sign}
                {fmt(units)}
              </span>{' '}
              {product && (
                <>
                  botella{units === 1 ? '' : 's'} de{' '}
                  <strong style={{ color: 'var(--fg-0)', fontWeight: 500 }}>{product}</strong>
                </>
              )}
              {counterparty && (
                <>
                  {' '}· <span style={{ color: 'var(--fg-3)' }}>{counterparty}</span>
                </>
              )}
              {!counterparty && m.dist_products?.category && (
                <>
                  {' '}· <span style={{ color: 'var(--fg-3)' }}>{CATEGORY_LABELS[m.dist_products.category]}</span>
                </>
              )}
            </span>
          </div>
        )
      })}
    </div>
  )
}

/* =========================================================================
   FIRST RUN EMPTY · onboarding-friendly
   ========================================================================= */

function FirstRunEmpty({ onCamera, firstName }: { onCamera: () => void; firstName: string }) {
  return (
    <section
      style={{
        position: 'relative',
        border: '1px solid var(--hairline)',
        background: 'var(--panel)',
        padding: '48px 32px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: 14,
      }}
      className="fade-up"
    >
      {(['tl', 'tr', 'bl', 'br'] as const).map(c => (
        <span
          key={c}
          aria-hidden
          style={{
            position: 'absolute',
            top: c.startsWith('t') ? 10 : 'auto',
            bottom: c.startsWith('b') ? 10 : 'auto',
            left: c.endsWith('l') ? 10 : 'auto',
            right: c.endsWith('r') ? 10 : 'auto',
            width: 14,
            height: 14,
            borderColor: 'var(--copper)',
            borderStyle: 'solid',
            borderWidth:
              c === 'tl'
                ? '1px 0 0 1px'
                : c === 'tr'
                  ? '1px 1px 0 0'
                  : c === 'bl'
                    ? '0 0 1px 1px'
                    : '0 1px 1px 0',
            opacity: 0.5,
          }}
        />
      ))}
      <div
        aria-hidden
        style={{
          width: 56,
          height: 56,
          display: 'grid',
          placeItems: 'center',
          border: '1px solid var(--copper-soft)',
          background: 'var(--copper-glow)',
          color: 'var(--copper)',
          fontFamily: 'var(--font-mono)',
          fontSize: 22,
          marginBottom: 4,
        }}
      >
        ✦
      </div>
      <h2
        style={{
          margin: 0,
          fontSize: 22,
          fontWeight: 600,
          letterSpacing: '-0.02em',
          color: 'var(--fg-0)',
        }}
      >
        {firstName}, encendamos PROOF.
      </h2>
      <p style={{ margin: 0, fontSize: 13, color: 'var(--fg-3)' }}>
        Aún no hay inventario registrado.
      </p>
      <p
        style={{
          margin: 0,
          fontSize: 14,
          color: 'var(--fg-2)',
          maxWidth: 480,
          lineHeight: 1.6,
        }}
      >
        Sube una foto de un pallet, una factura o una botella. Yo identifico lo que hay y lo
        registro por ti.
      </p>
      <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          type="button"
          onClick={onCamera}
          style={{
            padding: '11px 18px',
            background: 'var(--copper)',
            border: '1px solid var(--copper)',
            color: 'var(--ink)',
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <CameraIcon /> Subir foto
        </button>
        <Link
          href="/dashboard/productos/nueva"
          style={{
            padding: '11px 18px',
            background: 'transparent',
            border: '1px solid var(--line)',
            color: 'var(--fg-1)',
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: '0.005em',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          Registrar manualmente
        </Link>
      </div>
    </section>
  )
}

/* =========================================================================
   ICONS
   ========================================================================= */

function CameraIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  )
}
function ArrowDownIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <polyline points="19 12 12 19 5 12" />
    </svg>
  )
}
function BoxIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <path d="M3.27 6.96L12 12l8.73-5.04" />
      <path d="M12 22V12" />
    </svg>
  )
}
function SparkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l2.39 5.96L20 9l-4.5 3.9L17 19l-5-3-5 3 1.5-6.1L4 9l5.61-1.04L12 2z" />
    </svg>
  )
}
