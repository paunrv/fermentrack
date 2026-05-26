'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useProfile } from '@/context/ProfileContext'
import {
  fetchDistInventory,
  fetchDistMovements,
  type DistInventoryRow,
  type DistMovementWithRefs,
  type ExtraProfile,
  type ProductCategory,
} from '@/lib/supabase'

const font = "'Space Grotesk', sans-serif"

const COLORS = ['#FAC775', '#9FE1CB', '#F5C4B3', '#B5D4F4', '#C0DD97', '#F4C0D1']

const ALERT_RED = '#E24B4A'

const PROFILE_META: Record<ExtraProfile, { emoji: string; label: string }> = {
  brewer: { emoji: '🍺', label: 'Brewer' },
  winemaker: { emoji: '🍷', label: 'Winemaker' },
  distiller: { emoji: '🥃', label: 'Distiller' },
  distributor: { emoji: '📦', label: 'Distribuidor' },
  bar: { emoji: '🍸', label: 'Bar' },
}

const CATEGORY_LABELS: Record<ProductCategory, string> = {
  cerveza: 'Cerveza',
  vino: 'Vino',
  destilado: 'Destilado',
}

const SearchIcon = (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
)

const CameraIcon = (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
)

const SendIcon = (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
)

function totalBottles(row: DistInventoryRow): number {
  const inv = row.inventory
  if (!inv) return 0
  return inv.cases * row.bottles_per_case + inv.loose_units
}

export default function DashboardPage() {
  const router = useRouter()
  const { activeProfile, scope } = useProfile()
  const [products, setProducts] = useState<DistInventoryRow[]>([])
  const [recentMovements, setRecentMovements] = useState<DistMovementWithRefs[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showAllResults, setShowAllResults] = useState(false)
  const [fermiQuery, setFermiQuery] = useState('')
  const fermiCameraRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      fetchDistInventory(scope || undefined),
      fetchDistMovements({ scope: scope || undefined, limit: 10 }),
    ])
      .then(([inv, movs]) => {
        if (cancelled) return
        setProducts(inv)
        setRecentMovements(movs)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [scope?.clerk_id, scope?.profile_type_v2])

  const stats = useMemo(() => {
    let total = 0
    let active = 0
    let low = 0
    products.forEach(p => {
      const cur = totalBottles(p)
      total += cur
      if (cur > 0) active += 1
      const max = p.inventory?.max_units || 0
      if (max > 0 && cur / max <= 0.2) low += 1
    })
    return { total, active, low }
  }, [products])

  const proximaEntrega = useMemo(() => {
    const lastVenta = recentMovements.find(m => m.movement_type === 'venta')
    if (!lastVenta) return null
    const date = new Date(lastVenta.created_at)
    return {
      time: date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
      client: lastVenta.clients?.name || '—',
    }
  }, [recentMovements])

  const trimmedQuery = searchQuery.trim()
  const hasFilter = trimmedQuery.length > 0

  const filteredProducts = useMemo(() => {
    if (!trimmedQuery) return products
    const q = trimmedQuery.toLowerCase()
    return products.filter(
      p =>
        p.name.toLowerCase().includes(q) ||
        (p.producer || '').toLowerCase().includes(q) ||
        CATEGORY_LABELS[p.category].toLowerCase().includes(q)
    )
  }, [products, trimmedQuery])

  useEffect(() => {
    setShowAllResults(false)
  }, [trimmedQuery])

  const totalFiltered = filteredProducts.length

  // Display rules:
  // - Sin filtro: máx 6 cards + card "+", grid 3 cols.
  // - Con filtro: solo coincidencias, sin card "+",
  //     - ≤6 o expandido: muestra todas.
  //     - >6 sin expandir: muestra 6 + botón "Ver todos los resultados (N)".
  const limitToSix = !hasFilter || (hasFilter && totalFiltered > 6 && !showAllResults)
  const visibleProducts = limitToSix ? filteredProducts.slice(0, 6) : filteredProducts
  const showAddCard = !hasFilter
  const showExpandButton = hasFilter && totalFiltered > 6 && !showAllResults

  let gridCols = 'repeat(3, 1fr)'
  if (hasFilter && showAllResults) {
    if (totalFiltered > 12) gridCols = 'repeat(5, 1fr)'
    else if (totalFiltered > 6) gridCols = 'repeat(4, 1fr)'
    else gridCols = 'repeat(3, 1fr)'
  }

  function handleFermiSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = fermiQuery.trim()
    if (!q) return
    router.push(`/dashboard/agente?q=${encodeURIComponent(q)}`)
  }

  function openFermiCamera() {
    fermiCameraRef.current?.click()
  }

  function goToAddLabel() {
    router.push('/dashboard/productos/nueva')
  }

  function handleFermiCameraChange(e: React.ChangeEvent<HTMLInputElement>) {
    e.target.value = ''
    router.push('/dashboard/agente')
  }

  const profileMeta = activeProfile ? PROFILE_META[activeProfile.profile_type_v2] : null

  return (
    <div
      style={{
        background: '#fff',
        minHeight: '100vh',
        fontFamily: font,
        paddingBottom: 100,
        position: 'relative',
      }}
    >
      {/* Top bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '18px 24px',
          borderBottom: '3px solid #111',
          background: '#fff',
          position: 'sticky',
          top: 0,
          zIndex: 5,
        }}
      >
        <div
          style={{
            fontSize: 20,
            fontWeight: 800,
            letterSpacing: '-.03em',
            color: '#111',
            textTransform: 'uppercase',
          }}
        >
          Fermen<span style={{ color: '#E24B4A' }}>T</span>rack
        </div>
        {profileMeta && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 12px',
              border: '3px solid #111',
              background: '#fff',
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: '.08em',
              textTransform: 'uppercase',
              color: '#111',
            }}
          >
            <span style={{ fontSize: 14 }}>{profileMeta.emoji}</span>
            <span>{profileMeta.label}</span>
          </div>
        )}
      </div>

      <div
        style={{
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 32,
        }}
      >
        {/* Quiero saber */}
        <section>
          <SectionHeader
            title="Quiero saber"
            action={
              <button type="button" onClick={() => {}} style={sectionActionStyle()}>
                ✦ personalizar
              </button>
            }
          />

          <div
            style={{
              border: '3px solid #111',
              background: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 14px',
              marginBottom: 12,
            }}
          >
            <span style={{ color: '#111', flexShrink: 0 }}>{SearchIcon}</span>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Escribe un cliente, ciudad o producto..."
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                fontSize: 14,
                fontWeight: 500,
                fontFamily: font,
                color: '#111',
                background: 'transparent',
              }}
            />
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 0,
            }}
          >
            <MetricCard
              bg="#111"
              numberColor="#fff"
              labelColor="#888"
              subtitleColor="#888"
              value={loading ? '—' : stats.total.toLocaleString('es-MX')}
              label="Botellas en bodega"
              subtitle={
                loading
                  ? '...'
                  : `${stats.active} producto${stats.active === 1 ? '' : 's'} activo${stats.active === 1 ? '' : 's'}`
              }
            />
            <MetricCard
              bg="#FAC775"
              numberColor="#111"
              labelColor="#111"
              subtitleColor="#111"
              value={loading ? '—' : stats.low}
              label="Stock bajo"
              showAlertDot={!loading && stats.low > 0}
              subtitle={
                loading
                  ? '...'
                  : `${stats.low} producto${stats.low === 1 ? '' : 's'} ≤ 20%`
              }
            />
            <MetricCard
              bg="#9FE1CB"
              numberColor="#111"
              labelColor="#111"
              subtitleColor="#111"
              value={loading ? '—' : proximaEntrega?.time || '—'}
              valueSize="medium"
              label="Próxima entrega"
              subtitle={
                loading
                  ? '...'
                  : proximaEntrega?.client || 'Sin entregas programadas'
              }
            />
          </div>
        </section>

        {/* Mis etiquetas */}
        <section>
          <SectionHeader
            title="Mis etiquetas"
            action={
              <button
                type="button"
                onClick={goToAddLabel}
                style={{
                  ...sectionActionStyle(),
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: '#111',
                  color: '#fff',
                }}
              >
                <span style={{ display: 'inline-flex' }}>{CameraIcon}</span>
                <span>+ Foto</span>
              </button>
            }
          />

          {loading ? (
            <p style={{ fontSize: 13, color: '#888' }}>Cargando...</p>
          ) : products.length === 0 ? (
            <EmptyState onAdd={goToAddLabel} />
          ) : hasFilter && totalFiltered === 0 ? (
            <NoResults query={trimmedQuery} onAdd={goToAddLabel} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div
                className="label-grid"
                style={{
                  display: 'grid',
                  gridTemplateColumns: gridCols,
                  gap: 12,
                  transition: 'grid-template-columns .35s ease',
                }}
              >
                {visibleProducts.map((p, i) => (
                  <LabelCard key={p.id} product={p} colorIndex={i} />
                ))}
                {showAddCard && (
                  <button
                    type="button"
                    onClick={goToAddLabel}
                    style={{
                      minHeight: 180,
                      border: '3px dashed #111',
                      background: '#fff',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      cursor: 'pointer',
                      fontFamily: font,
                      color: '#111',
                      transition: 'background .15s, transform .15s',
                    }}
                  >
                    <div style={{ fontSize: 36, fontWeight: 300, lineHeight: 1 }}>+</div>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: '.1em',
                        textTransform: 'uppercase',
                      }}
                    >
                      Agregar etiqueta
                    </div>
                  </button>
                )}
              </div>

              {showExpandButton && (
                <button
                  type="button"
                  onClick={() => setShowAllResults(true)}
                  style={{
                    padding: '14px 18px',
                    border: '3px dashed #111',
                    background: '#fff',
                    color: '#111',
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: '.1em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    fontFamily: font,
                    transition: 'background .15s',
                  }}
                >
                  Ver todos los resultados ({totalFiltered})
                </button>
              )}

              {hasFilter && showAllResults && totalFiltered > 6 && (
                <button
                  type="button"
                  onClick={() => setShowAllResults(false)}
                  style={{
                    padding: '12px 16px',
                    border: '3px dashed #111',
                    background: '#fff',
                    color: '#111',
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: '.1em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    fontFamily: font,
                    opacity: 0.7,
                  }}
                >
                  ▲ Ver menos
                </button>
              )}
            </div>
          )}
        </section>
      </div>

      {/* Fermi fixed bottom bar */}
      <form
        onSubmit={handleFermiSubmit}
        style={{
          position: 'fixed',
          bottom: 0,
          left: 220,
          right: 0,
          padding: 12,
          background: '#fff',
          borderTop: '3px solid #111',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          zIndex: 10,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            border: '3px solid #111',
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            fontWeight: 800,
            color: '#111',
            flexShrink: 0,
            fontFamily: font,
          }}
        >
          F
        </div>
        <input
          type="text"
          value={fermiQuery}
          onChange={e => setFermiQuery(e.target.value)}
          placeholder="Pregunta a Fermi — stock, entregas, clientes..."
          style={{
            flex: 1,
            border: '3px solid #111',
            background: '#fff',
            padding: '10px 14px',
            fontSize: 13,
            fontWeight: 500,
            color: '#111',
            outline: 'none',
            fontFamily: font,
            minWidth: 0,
          }}
        />
        <button
          type="button"
          onClick={openFermiCamera}
          style={{
            width: 40,
            height: 40,
            border: '3px solid #111',
            background: '#fff',
            color: '#111',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            padding: 0,
          }}
          aria-label="Subir foto"
        >
          {CameraIcon}
        </button>
        <button
          type="submit"
          disabled={!fermiQuery.trim()}
          style={{
            padding: '10px 16px',
            border: '3px solid #111',
            background: '#111',
            color: '#fff',
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '.08em',
            textTransform: 'uppercase',
            cursor: fermiQuery.trim() ? 'pointer' : 'not-allowed',
            opacity: fermiQuery.trim() ? 1 : 0.5,
            fontFamily: font,
            flexShrink: 0,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span>Enviar</span>
          <span style={{ display: 'inline-flex' }}>{SendIcon}</span>
        </button>
      </form>

      <input
        ref={fermiCameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFermiCameraChange}
        style={{ display: 'none' }}
      />
    </div>
  )
}

function SectionHeader({
  title,
  action,
}: {
  title: string
  action: React.ReactNode
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: 12,
        gap: 12,
        flexWrap: 'wrap',
      }}
    >
      <h2
        style={{
          fontSize: 22,
          fontWeight: 800,
          letterSpacing: '-.03em',
          color: '#111',
          lineHeight: 1.1,
        }}
      >
        {title}
      </h2>
      {action}
    </div>
  )
}

function sectionActionStyle(): React.CSSProperties {
  return {
    padding: '8px 14px',
    border: '3px solid #111',
    background: '#fff',
    color: '#111',
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: '.1em',
    textTransform: 'uppercase',
    cursor: 'pointer',
    fontFamily: font,
  }
}

function MetricCard({
  bg,
  numberColor,
  labelColor,
  subtitleColor,
  value,
  label,
  subtitle,
  valueSize = 'large',
  showAlertDot = false,
}: {
  bg: string
  numberColor: string
  labelColor: string
  subtitleColor: string
  value: React.ReactNode
  label: string
  subtitle?: string
  valueSize?: 'large' | 'medium'
  showAlertDot?: boolean
}) {
  return (
    <div
      style={{
        border: '3px solid #111',
        background: bg,
        padding: '18px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        minHeight: 130,
        marginLeft: -3,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        {showAlertDot && (
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: ALERT_RED,
              border: '2px solid #111',
              flexShrink: 0,
            }}
          />
        )}
        <span
          style={{
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: '.1em',
            textTransform: 'uppercase',
            color: labelColor,
          }}
        >
          {label}
        </span>
      </div>
      <div
        style={{
          fontSize: valueSize === 'large' ? 40 : 30,
          fontWeight: 800,
          letterSpacing: '-.03em',
          color: numberColor,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      {subtitle && (
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '.04em',
            color: subtitleColor,
            opacity: 0.75,
            marginTop: 'auto',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {subtitle}
        </div>
      )}
    </div>
  )
}

function LabelCard({
  product,
  colorIndex,
}: {
  product: DistInventoryRow
  colorIndex: number
}) {
  const inv = product.inventory
  const current = inv ? inv.cases * product.bottles_per_case + inv.loose_units : 0
  const max = inv?.max_units || 0
  const pct = max > 0 ? Math.min(100, Math.round((current / max) * 100)) : 0
  const isLow = max > 0 && current / max <= 0.2
  const color = COLORS[colorIndex % COLORS.length]

  return (
    <Link
      href={`/dashboard/productos/${product.id}`}
      style={{
        textDecoration: 'none',
        color: 'inherit',
        display: 'block',
      }}
    >
      <div
        style={{
          border: '3px solid #111',
          background: color,
          padding: 16,
          minHeight: 180,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          cursor: 'pointer',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 8,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 9,
                fontWeight: 800,
                letterSpacing: '.1em',
                textTransform: 'uppercase',
                color: '#111',
                opacity: 0.6,
              }}
            >
              {CATEGORY_LABELS[product.category]}
              {product.producer ? ` · ${product.producer}` : ''}
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 800,
                lineHeight: 1.15,
                color: '#111',
                marginTop: 4,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {product.name}
            </div>
          </div>
          {isLow && (
            <span
              style={{
                fontSize: 8,
                fontWeight: 800,
                letterSpacing: '.1em',
                textTransform: 'uppercase',
                padding: '4px 6px',
                border: '3px solid #111',
                background: ALERT_RED,
                color: '#fff',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              Stock bajo
            </span>
          )}
        </div>

        <div style={{ marginTop: 'auto' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              gap: 4,
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 800, color: '#111', lineHeight: 1 }}>
              {current}
              <span style={{ fontSize: 11, fontWeight: 700, opacity: 0.6 }}>
                /{max || '—'}
              </span>
            </div>
            <div
              style={{
                fontSize: 9,
                fontWeight: 800,
                letterSpacing: '.08em',
                textTransform: 'uppercase',
                color: '#111',
                opacity: 0.7,
              }}
            >
              {product.unit_type === 'lata' ? 'lat.' : 'bot.'}
            </div>
          </div>
          <div
            style={{
              marginTop: 6,
              height: 10,
              border: '3px solid #111',
              background: '#fff',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${pct}%`,
                height: '100%',
                background: isLow ? ALERT_RED : '#111',
                transition: 'width .25s ease',
              }}
            />
          </div>
        </div>
      </div>
    </Link>
  )
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div
      style={{
        border: '3px dashed #111',
        padding: '48px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 48, lineHeight: 1 }}>🏷️</div>
      <div
        style={{
          fontSize: 18,
          fontWeight: 800,
          color: '#111',
          letterSpacing: '-.02em',
        }}
      >
        Agrega tu primera etiqueta
      </div>
      <div style={{ fontSize: 13, fontWeight: 500, color: '#888', maxWidth: 360 }}>
        Crea productos para llevar inventario, ventas y movimientos por etiqueta.
      </div>
      <button
        type="button"
        onClick={onAdd}
        style={{
          marginTop: 8,
          padding: '12px 20px',
          background: '#111',
          color: '#fff',
          border: '3px solid #111',
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: '.08em',
          textTransform: 'uppercase',
          cursor: 'pointer',
          fontFamily: font,
        }}
      >
        + Agregar etiqueta
      </button>
    </div>
  )
}

function NoResults({ query, onAdd }: { query: string; onAdd: () => void }) {
  return (
    <div
      style={{
        border: '3px dashed #111',
        padding: '36px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 36, lineHeight: 1 }}>🔍</div>
      <div
        style={{
          fontSize: 16,
          fontWeight: 800,
          color: '#111',
          letterSpacing: '-.02em',
          maxWidth: 480,
        }}
      >
        Sin resultados para “{query}” — ¿quieres agregar esta etiqueta?
      </div>
      <button
        type="button"
        onClick={onAdd}
        style={{
          marginTop: 4,
          padding: '12px 20px',
          background: '#111',
          color: '#fff',
          border: '3px solid #111',
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: '.08em',
          textTransform: 'uppercase',
          cursor: 'pointer',
          fontFamily: font,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span style={{ fontSize: 16, lineHeight: 0.8 }}>+</span>
        <span>Agregar “{query}”</span>
      </button>
    </div>
  )
}
