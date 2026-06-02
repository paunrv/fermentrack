'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useProfile } from '@/context/ProfileContext'
import { useSupabase } from '@/hooks/useSupabase'
import {
  fetchClients,
  fetchDistMovements,
  fetchDistProductById,
  createDistMovement,
  updateDistInventory,
  type Client,
  type DistInventoryRow,
  type DistMovementWithRefs,
  type MovementType,
  type ProductCategory,
} from '@/lib/supabase'

const font = "'Space Grotesk', sans-serif"

const CATEGORY_COLORS: Record<ProductCategory, string> = {
  cerveza: '#FAC775',
  vino: '#9FE1CB',
  destilado: '#F5C4B3',
}

const CATEGORY_LABELS: Record<ProductCategory, string> = {
  cerveza: 'Cerveza',
  vino: 'Vino',
  destilado: 'Destilado',
}

const ORIGIN_LABELS = { local: 'Local', importado: 'Importado' } as const

type SalidaType = 'venta' | 'donacion' | 'merma' | 'muestra'

const SALIDA_TYPES: SalidaType[] = ['venta', 'donacion', 'merma', 'muestra']

const TYPE_LABELS: Record<MovementType, string> = {
  entrada: 'Entrada',
  venta: 'Venta',
  donacion: 'Donación',
  merma: 'Merma',
  muestra: 'Muestra',
}

const TYPE_BADGE: Record<MovementType, string> = {
  venta: '#C0DD97',
  entrada: '#B5D4F4',
  muestra: '#FAC775',
  merma: '#F5C4B3',
  donacion: '#F4C0D1',
}

const MERMA_REASONS = ['rota', 'vencida', 'dañada', 'otro'] as const
type MermaReason = (typeof MERMA_REASONS)[number]

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: '.1em',
  textTransform: 'uppercase',
  color: '#111',
  marginBottom: 6,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#fff',
  border: '3px solid #111',
  padding: '10px 12px',
  fontSize: 13,
  fontWeight: 500,
  color: '#111',
  outline: 'none',
  fontFamily: font,
}

function formatMoney(n: number, currency = 'MXN') {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(n)
}

function priceForTier(
  product: DistInventoryRow,
  tier: Client['price_tier']
): number {
  if (tier === 'mayoreo') return Number(product.price_mayoreo)
  if (tier === 'especial') return Number(product.price_especial)
  return Number(product.price_regular)
}

const CameraIcon = (
  <svg
    width="28"
    height="28"
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

const BackIcon = (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ flexShrink: 0 }}
  >
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
)

const UploadIcon = (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ flexShrink: 0 }}
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
)

const ChevronDown = (
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
    <polyline points="6 9 12 15 18 9" />
  </svg>
)

const ChevronUp = (
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
    <polyline points="18 15 12 9 6 15" />
  </svg>
)

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id
  const router = useRouter()
  const { scope } = useProfile()
  const supabase = useSupabase()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [product, setProduct] = useState<DistInventoryRow | null>(null)
  const [movements, setMovements] = useState<DistMovementWithRefs[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showMoreInfo, setShowMoreInfo] = useState(false)
  const [showPrices, setShowPrices] = useState(false)
  const [showModal, setShowModal] = useState(false)

  async function load() {
    if (!id) return
    const [p, m, cs] = await Promise.all([
      fetchDistProductById(supabase, id),
      fetchDistMovements(supabase, { productId: id, scope: scope ?? undefined }),
      fetchClients(supabase, scope ?? undefined),
    ])
    if (!p) {
      setNotFound(true)
      setLoading(false)
      return
    }
    setProduct(p)
    setMovements(m)
    setClients(cs)
  }

  useEffect(() => {
    setLoading(true)
    load().finally(() => setLoading(false))
  }, [id])

  const stats = useMemo(() => {
    if (!product) return null
    const bpc = product.bottles_per_case
    let initialBottles = 0
    let soldBottles = 0
    let soldCases = 0
    let sampleBottles = 0
    let mermaBottles = 0
    let donacionBottles = 0
    movements.forEach(m => {
      const bottles = (m.cases || 0) * bpc + (m.loose_units || 0)
      if (m.movement_type === 'entrada') {
        initialBottles += bottles
      } else if (m.movement_type === 'venta') {
        soldBottles += bottles
        soldCases += m.cases || 0
      } else if (m.movement_type === 'muestra') {
        sampleBottles += bottles
      } else if (m.movement_type === 'merma') {
        mermaBottles += bottles
      } else if (m.movement_type === 'donacion') {
        donacionBottles += bottles
      }
    })
    const inv = product.inventory
    const currentBottles = inv ? inv.cases * bpc + inv.loose_units : 0
    const currentCases = inv?.cases ?? 0
    const pct =
      initialBottles > 0 ? Math.round((currentBottles / initialBottles) * 100) : 0
    const inversionInicial = initialBottles * Number(product.cost_per_unit || 0)
    return {
      initialBottles,
      currentBottles,
      currentCases,
      pct,
      soldBottles,
      soldCases,
      sampleBottles,
      mermaBottles,
      donacionBottles,
      inversionInicial,
    }
  }, [product, movements])

  const lastFive = movements.slice(0, 5)

  function triggerUpload() {
    fileInputRef.current?.click()
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !product) return

    setUploading(true)
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
      const path = `${product.id}/${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(path, file, {
          contentType: file.type || 'image/jpeg',
          upsert: true,
        })
      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(path)
      const publicUrl = urlData.publicUrl

      const { error: updateError } = await supabase
        .from('dist_products')
        .update({ image_url: publicUrl })
        .eq('id', product.id)
      if (updateError) throw updateError

      await load()
    } catch (err: any) {
      alert(`No se pudo subir la imagen: ${err?.message || 'error desconocido'}`)
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ fontFamily: font, padding: 32 }}>
        <p style={{ fontSize: 13, color: '#888' }}>Cargando...</p>
      </div>
    )
  }

  if (notFound || !product) {
    return (
      <div style={{ fontFamily: font, padding: 32 }}>
        <Link
          href="/dashboard/productos"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '.08em',
            textTransform: 'uppercase',
            color: '#111',
            textDecoration: 'none',
            border: '3px solid #111',
            padding: '8px 12px',
            marginBottom: 16,
          }}
        >
          {BackIcon}
          <span>Mis etiquetas</span>
        </Link>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#111' }}>
          Producto no encontrado
        </h1>
      </div>
    )
  }

  const categoryColor = CATEGORY_COLORS[product.category]

  return (
    <div
      style={{
        fontFamily: font,
        background: '#fff',
        minHeight: '100vh',
        paddingBottom: 96,
      }}
    >
      {/* Banner */}
      <div
        style={{
          height: 180,
          background: categoryColor,
          borderBottom: '3px solid #111',
          padding: '14px 20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 12,
          }}
        >
          <Link
            href="/dashboard/productos"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: '.08em',
              textTransform: 'uppercase',
              color: '#111',
              textDecoration: 'none',
              border: '3px solid #111',
              background: '#fff',
              padding: '6px 10px',
            }}
          >
            {BackIcon}
            <span>Mis etiquetas</span>
          </Link>

          <button
            type="button"
            onClick={triggerUpload}
            disabled={uploading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: '.08em',
              textTransform: 'uppercase',
              color: '#fff',
              background: '#111',
              border: '3px solid #111',
              padding: '6px 10px',
              cursor: uploading ? 'wait' : 'pointer',
              opacity: uploading ? 0.5 : 1,
              fontFamily: font,
            }}
          >
            {UploadIcon}
            <span>{uploading ? 'Subiendo...' : 'Subir etiqueta'}</span>
          </button>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            flex: 1,
            minHeight: 0,
          }}
        >
          <button
            type="button"
            onClick={triggerUpload}
            disabled={uploading}
            style={{
              width: 130,
              height: 130,
              flexShrink: 0,
              border: '3px solid #111',
              background: '#fff',
              padding: 0,
              cursor: uploading ? 'wait' : 'pointer',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label="Subir imagen de etiqueta"
          >
            {product.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.image_url}
                alt={product.name}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  color: '#111',
                }}
              >
                {CameraIcon}
                <span
                  style={{
                    fontSize: 8,
                    fontWeight: 800,
                    letterSpacing: '.1em',
                    textTransform: 'uppercase',
                  }}
                >
                  Sin etiqueta
                </span>
              </div>
            )}
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
      </div>

      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Nombre + stock */}
        <section
          style={{
            border: '3px solid #111',
            background: '#111',
            color: '#fff',
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 800,
                  lineHeight: 1.05,
                  letterSpacing: '-.03em',
                  color: '#fff',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}
              >
                {product.name}
              </div>
              <div
                style={{
                  marginTop: 6,
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: '.08em',
                  textTransform: 'uppercase',
                  color: '#888',
                }}
              >
                {product.unit_type === 'lata' ? 'Lata' : 'Botella'} ·{' '}
                {CATEGORY_LABELS[product.category]} · {ORIGIN_LABELS[product.origin]}
                {product.producer ? ` · ${product.producer}` : ''}
              </div>
            </div>
            {stats && stats.initialBottles > 0 && stats.pct <= 20 && (
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 800,
                  letterSpacing: '.1em',
                  textTransform: 'uppercase',
                  padding: '6px 10px',
                  border: '3px solid #fff',
                  background: '#E24B4A',
                  color: '#fff',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                ⚠ Stock bajo
              </span>
            )}
          </div>

          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                gap: 8,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: '.1em',
                  textTransform: 'uppercase',
                  color: '#888',
                }}
              >
                Botellas en bodega
              </div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '.05em',
                  textTransform: 'uppercase',
                  color: '#888',
                }}
              >
                {stats?.pct ?? 0}% del inicial
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
              <span
                style={{
                  fontSize: 44,
                  fontWeight: 800,
                  lineHeight: 1,
                  letterSpacing: '-.03em',
                }}
              >
                {stats?.currentBottles ?? 0}
              </span>
              <span style={{ fontSize: 18, fontWeight: 700, color: '#888' }}>
                / {stats?.initialBottles ?? 0}
              </span>
            </div>

            <div
              style={{
                marginTop: 12,
                height: 12,
                border: '3px solid #fff',
                background: '#111',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${Math.min(100, stats?.pct ?? 0)}%`,
                  height: '100%',
                  background: stats && stats.pct <= 20 ? '#E24B4A' : '#FAC775',
                  transition: 'width .35s ease, background .25s ease',
                }}
              />
            </div>
          </div>
        </section>

        {/* Nivel 2 — Ver más */}
        <Collapsible
          open={showMoreInfo}
          onToggle={() => setShowMoreInfo(v => !v)}
          labelClosed="Ver más"
          labelOpen="Ver menos"
        >
          {stats && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: 12,
              }}
            >
              {[
                {
                  label: 'Cajas en bodega',
                  value: `${stats.currentCases}`,
                  hint: `${product.bottles_per_case}/caja`,
                },
                {
                  label: 'Botellas vendidas',
                  value: `${stats.soldBottles}`,
                },
                {
                  label: 'Cajas vendidas',
                  value: `${stats.soldCases}`,
                },
                {
                  label: 'Muestras',
                  value: `${stats.sampleBottles}`,
                },
                {
                  label: 'Mermas',
                  value: `${stats.mermaBottles}`,
                },
                ...(stats.donacionBottles > 0
                  ? [
                      {
                        label: 'Donaciones',
                        value: `${stats.donacionBottles}`,
                      },
                    ]
                  : []),
              ].map(({ label, value, hint }) => (
                <StatCard key={label} label={label} value={value} hint={hint} />
              ))}
            </div>
          )}
        </Collapsible>

        {/* Nivel 3 — Costos y precios */}
        <Collapsible
          open={showPrices}
          onToggle={() => setShowPrices(v => !v)}
          labelClosed="Costos y precios"
          labelOpen="Ocultar"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <SubHeader text="Costos" />
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: 12,
                  marginTop: 8,
                }}
              >
                <StatCard
                  label="Inversión inicial"
                  value={formatMoney(
                    stats?.inversionInicial ?? 0,
                    product.currency || 'MXN'
                  )}
                />
                <StatCard
                  label="Costo por botella"
                  value={formatMoney(
                    Number(product.cost_per_unit || 0),
                    product.currency || 'MXN'
                  )}
                />
                <StatCard
                  label="Costo por caja"
                  value={formatMoney(
                    Number(product.cost_per_unit || 0) * product.bottles_per_case,
                    product.currency || 'MXN'
                  )}
                />
              </div>
            </div>
            <div>
              <SubHeader text="Precio de venta" />
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: 12,
                  marginTop: 8,
                }}
              >
                {[
                  {
                    label: 'Regular',
                    bg: '#fff',
                    value: Number(product.price_regular),
                  },
                  {
                    label: 'Mayoreo',
                    bg: '#C0DD97',
                    value: Number(product.price_mayoreo),
                  },
                  {
                    label: 'Especial',
                    bg: '#F4C0D1',
                    value: Number(product.price_especial),
                  },
                ].map(({ label, value, bg }) => (
                  <div
                    key={label}
                    style={{
                      border: '3px solid #111',
                      padding: 12,
                      background: bg,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 9,
                        fontWeight: 800,
                        letterSpacing: '.1em',
                        textTransform: 'uppercase',
                        color: '#111',
                        opacity: 0.7,
                        marginBottom: 4,
                      }}
                    >
                      {label}
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#111' }}>
                      {formatMoney(value, product.currency || 'MXN')}
                    </div>
                    <div
                      style={{
                        marginTop: 2,
                        fontSize: 10,
                        fontWeight: 700,
                        color: '#111',
                        opacity: 0.6,
                      }}
                    >
                      por botella
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Collapsible>

        {/* Movimientos recientes */}
        <section>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: 12,
            }}
          >
            <h2
              style={{
                fontSize: 14,
                fontWeight: 800,
                letterSpacing: '.1em',
                textTransform: 'uppercase',
              }}
            >
              Movimientos recientes
            </h2>
            <Link
              href="/dashboard/movimientos"
              style={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: '.08em',
                textTransform: 'uppercase',
                color: '#111',
                textDecoration: 'none',
                borderBottom: '2px solid #111',
              }}
            >
              Ver todos →
            </Link>
          </div>
          {lastFive.length === 0 ? (
            <p style={{ fontSize: 13, color: '#888' }}>
              Aún no hay movimientos para este producto.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {lastFive.map(m => {
                const type = m.movement_type
                const bpc = m.dist_products?.bottles_per_case || product.bottles_per_case
                const bottles = (m.cases || 0) * bpc + (m.loose_units || 0)
                const time = new Date(m.created_at).toLocaleString('es-MX', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })
                const detail =
                  type === 'venta'
                    ? m.clients?.name || '—'
                    : type === 'merma'
                      ? `Motivo: ${m.reason || '—'}`
                      : type === 'muestra'
                        ? [m.recipient, m.event].filter(Boolean).join(' · ') || '—'
                        : type === 'donacion'
                          ? m.recipient || '—'
                          : m.notes || 'Entrada de mercancía'

                return (
                  <div
                    key={m.id}
                    style={{
                      border: '3px solid #111',
                      background: '#fff',
                      padding: 12,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        letterSpacing: '.08em',
                        textTransform: 'uppercase',
                        padding: '6px 10px',
                        border: '3px solid #111',
                        background: TYPE_BADGE[type] || '#fff',
                        color: '#111',
                        flexShrink: 0,
                        minWidth: 90,
                        textAlign: 'center',
                      }}
                    >
                      {TYPE_LABELS[type]}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 800,
                          color: '#111',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {detail}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: '#666',
                          marginTop: 2,
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 800,
                            color: type === 'entrada' ? '#1D9E75' : '#E24B4A',
                          }}
                        >
                          {type === 'entrada' ? '+' : '−'}
                          {bottles}
                        </span>{' '}
                        bot.
                        {(m.cases || 0) > 0 ? ` · ${m.cases} caja${m.cases === 1 ? '' : 's'}` : ''}
                        {type === 'venta' && m.total_amount != null
                          ? ` · ${formatMoney(
                              Number(m.total_amount),
                              m.currency || product.currency || 'MXN'
                            )}`
                          : ''}
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: '#888',
                        letterSpacing: '.05em',
                        textTransform: 'uppercase',
                        flexShrink: 0,
                      }}
                    >
                      {time}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>

      {/* Footer fijo */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 220,
          right: 0,
          padding: 16,
          background: '#fff',
          borderTop: '3px solid #111',
          display: 'flex',
          justifyContent: 'center',
          zIndex: 10,
        }}
      >
        <button
          type="button"
          onClick={() => setShowModal(true)}
          style={{
            padding: '14px 28px',
            background: '#111',
            color: '#fff',
            border: '3px solid #111',
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: '.1em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            fontFamily: font,
            minWidth: 280,
          }}
        >
          + Registrar movimiento
        </button>
      </div>

      {showModal && (
        <MovementModal
          product={product}
          clients={clients}
          onClose={() => setShowModal(false)}
          onSaved={async () => {
            setShowModal(false)
            await load()
          }}
        />
      )}
    </div>
  )
}

function Collapsible({
  open,
  onToggle,
  labelClosed,
  labelOpen,
  children,
}: {
  open: boolean
  onToggle: () => void
  labelClosed: string
  labelOpen: string
  children: React.ReactNode
}) {
  return (
    <section style={{ border: '3px solid #111', overflow: 'hidden' }}>
      <button
        type="button"
        onClick={onToggle}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
          padding: '14px 18px',
          background: open ? '#111' : '#fff',
          color: open ? '#fff' : '#111',
          border: 'none',
          borderBottom: open ? '3px solid #111' : 'none',
          fontSize: 12,
          fontWeight: 800,
          letterSpacing: '.1em',
          textTransform: 'uppercase',
          cursor: 'pointer',
          fontFamily: font,
          transition: 'background .2s ease',
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          {open ? ChevronUp : ChevronDown}
          <span>{open ? labelOpen : labelClosed}</span>
        </span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '.05em',
            opacity: 0.7,
          }}
        >
          {open ? '▲' : '▼'}
        </span>
      </button>
      <div
        style={{
          display: 'grid',
          gridTemplateRows: open ? '1fr' : '0fr',
          transition: 'grid-template-rows .35s ease',
        }}
      >
        <div style={{ overflow: 'hidden' }}>
          <div style={{ padding: 18, background: '#fff' }}>{children}</div>
        </div>
      </div>
    </section>
  )
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string
  value: React.ReactNode
  hint?: string
}) {
  return (
    <div
      style={{
        border: '3px solid #111',
        padding: 12,
        background: '#fff',
      }}
    >
      <div
        style={{
          fontSize: 9,
          fontWeight: 800,
          letterSpacing: '.1em',
          textTransform: 'uppercase',
          color: '#888',
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 18, fontWeight: 800, color: '#111' }}>{value}</div>
      {hint && (
        <div
          style={{
            marginTop: 2,
            fontSize: 10,
            fontWeight: 700,
            color: '#888',
            letterSpacing: '.04em',
          }}
        >
          {hint}
        </div>
      )}
    </div>
  )
}

function SubHeader({ text }: { text: string }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: '.12em',
        textTransform: 'uppercase',
        color: '#111',
        opacity: 0.6,
        borderBottom: '3px solid #111',
        paddingBottom: 6,
      }}
    >
      {text}
    </div>
  )
}

function MovementModal({
  product,
  clients,
  onClose,
  onSaved,
}: {
  product: DistInventoryRow
  clients: Client[]
  onClose: () => void
  onSaved: () => void | Promise<void>
}) {
  const supabase = useSupabase()
  const [type, setType] = useState<SalidaType>('venta')
  const [cases, setCases] = useState('')
  const [looseUnits, setLooseUnits] = useState('')
  const [notes, setNotes] = useState('')
  const [clientId, setClientId] = useState(clients[0]?.id || '')
  const [unitPrice, setUnitPrice] = useState('')
  const [recipient, setRecipient] = useState('')
  const [reason, setReason] = useState<MermaReason>('rota')
  const [event, setEvent] = useState('')
  const [saving, setSaving] = useState(false)

  const inv = product.inventory
  const bpc = product.bottles_per_case
  const available = inv ? inv.cases * bpc + inv.loose_units : 0

  const c = parseInt(cases, 10) || 0
  const u = parseInt(looseUnits, 10) || 0
  const requestedBottles = c * bpc + u

  const selectedClient = clients.find(cl => cl.id === clientId) || null

  useEffect(() => {
    if (type !== 'venta' || !selectedClient) return
    const p = priceForTier(product, selectedClient.price_tier)
    if (p > 0) setUnitPrice(String(p))
  }, [type, selectedClient, product])

  const computedTotal = useMemo(() => {
    const price = parseFloat(unitPrice) || 0
    return requestedBottles * price
  }, [unitPrice, requestedBottles])

  function resetForm() {
    setCases('')
    setLooseUnits('')
    setNotes('')
    setRecipient('')
    setEvent('')
    setReason('rota')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (requestedBottles <= 0) return
    if (requestedBottles > available) {
      alert(`Solo hay ${available} botellas disponibles`)
      return
    }
    if (type === 'venta' && !clientId) {
      alert('Selecciona un cliente')
      return
    }

    setSaving(true)
    try {
      const today = new Date().toISOString().slice(0, 10)
      const baseRecord = {
        product_id: product.id,
        movement_type: type,
        cases: c,
        loose_units: u,
        movement_date: today,
        notes: notes.trim() || null,
        clerk_id: product.clerk_id ?? null,
        profile_type_v2: product.profile_type_v2 ?? null,
      }

      if (type === 'venta') {
        const price = parseFloat(unitPrice) || 0
        await createDistMovement(supabase, {
          ...baseRecord,
          client_id: clientId,
          unit_price: price,
          total_amount: requestedBottles * price,
          currency: product.currency || 'MXN',
        } as any)
      } else if (type === 'donacion') {
        await createDistMovement(supabase, {
          ...baseRecord,
          recipient: recipient.trim() || null,
        } as any)
      } else if (type === 'merma') {
        await createDistMovement(supabase, {
          ...baseRecord,
          reason,
        } as any)
      } else if (type === 'muestra') {
        await createDistMovement(supabase, {
          ...baseRecord,
          recipient: recipient.trim() || null,
          event: event.trim() || null,
        } as any)
      }

      await updateDistInventory(supabase, product.id, -c, -u, bpc)
      resetForm()
      await onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      role="dialog"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        fontFamily: font,
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff',
          border: '3px solid #111',
          width: '100%',
          maxWidth: 560,
          maxHeight: '90vh',
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            padding: 20,
            borderBottom: '3px solid #111',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: '#111',
                lineHeight: 1.1,
              }}
            >
              {product.name}
            </div>
            <div
              style={{
                marginTop: 4,
                fontSize: 11,
                fontWeight: 700,
                color: '#888',
                letterSpacing: '.05em',
                textTransform: 'uppercase',
              }}
            >
              {available} botellas disponibles
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 36,
              height: 36,
              border: '3px solid #111',
              background: '#fff',
              cursor: 'pointer',
              fontSize: 18,
              fontWeight: 800,
              fontFamily: font,
            }}
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            borderBottom: '3px solid #111',
          }}
        >
          {SALIDA_TYPES.map(t => {
            const active = t === type
            return (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setType(t)
                  resetForm()
                }}
                style={{
                  padding: '14px 8px',
                  border: 'none',
                  borderRight: t === 'muestra' ? 'none' : '3px solid #111',
                  background: active ? '#111' : TYPE_BADGE[t],
                  color: active ? '#fff' : '#111',
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: '.08em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  fontFamily: font,
                }}
              >
                {TYPE_LABELS[t]}
              </button>
            )
          })}
        </div>

        <form
          onSubmit={handleSubmit}
          style={{
            padding: 20,
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 12,
          }}
        >
          {type === 'venta' && (
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Cliente</label>
              <select
                value={clientId}
                onChange={e => setClientId(e.target.value)}
                style={inputStyle}
                required
              >
                <option value="">Seleccionar cliente</option>
                {clients.map(cl => (
                  <option key={cl.id} value={cl.id}>
                    {cl.name} — tier {cl.price_tier}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label style={labelStyle}>Cajas</label>
            <input
              type="number"
              min={0}
              value={cases}
              onChange={e => setCases(e.target.value)}
              style={inputStyle}
              placeholder="0"
            />
          </div>
          <div>
            <label style={labelStyle}>Unidades sueltas</label>
            <input
              type="number"
              min={0}
              value={looseUnits}
              onChange={e => setLooseUnits(e.target.value)}
              style={inputStyle}
              placeholder="0"
            />
          </div>

          {type === 'venta' && (
            <>
              <div>
                <label style={labelStyle}>Precio unitario</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={unitPrice}
                  onChange={e => setUnitPrice(e.target.value)}
                  style={inputStyle}
                  placeholder="0.00"
                  required
                />
              </div>
              <div>
                <label style={labelStyle}>Total</label>
                <div
                  style={{
                    ...inputStyle,
                    background: '#111',
                    color: '#fff',
                    fontWeight: 800,
                    fontSize: 15,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {formatMoney(computedTotal, product.currency || 'MXN')}
                </div>
              </div>
            </>
          )}

          {(type === 'donacion' || type === 'muestra') && (
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>
                {type === 'donacion' ? 'Destinatario' : 'A quién'}
              </label>
              <input
                type="text"
                value={recipient}
                onChange={e => setRecipient(e.target.value)}
                style={inputStyle}
                placeholder={
                  type === 'donacion'
                    ? 'Organización, persona, evento'
                    : 'Cliente potencial, periodista...'
                }
              />
            </div>
          )}

          {type === 'muestra' && (
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Evento / ocasión</label>
              <input
                type="text"
                value={event}
                onChange={e => setEvent(e.target.value)}
                style={inputStyle}
                placeholder="Cata, feria, lanzamiento..."
              />
            </div>
          )}

          {type === 'merma' && (
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Motivo</label>
              <select
                value={reason}
                onChange={e => setReason(e.target.value as MermaReason)}
                style={inputStyle}
                required
              >
                {MERMA_REASONS.map(r => (
                  <option key={r} value={r}>
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Notas</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              style={inputStyle}
              placeholder="Observaciones (opcional)"
            />
          </div>

          <div
            style={{
              gridColumn: '1 / -1',
              display: 'flex',
              gap: 12,
              alignItems: 'center',
              flexWrap: 'wrap',
              marginTop: 4,
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '12px 20px',
                background: '#fff',
                color: '#111',
                border: '3px solid #111',
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: '.08em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                fontFamily: font,
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || requestedBottles <= 0}
              style={{
                flex: 1,
                padding: '12px 20px',
                background: '#111',
                color: '#fff',
                border: '3px solid #111',
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: '.08em',
                textTransform: 'uppercase',
                cursor: saving ? 'wait' : 'pointer',
                opacity: saving ? 0.5 : 1,
                fontFamily: font,
              }}
            >
              {saving
                ? 'Guardando...'
                : `Registrar ${TYPE_LABELS[type].toLowerCase()} (${requestedBottles} bot.)`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
