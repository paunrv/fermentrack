'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import type { AppLocale } from '@/i18n/routing'
import { useProfile } from '@/context/ProfileContext'
import { formatCurrencyMxn } from '@/lib/i18n/format'
import { useIntlLocaleTag } from '@/lib/i18n/locale'
import { useSupabase } from '@/hooks/useSupabase'
import {
  fetchClients,
  type Client,
  type DistInventoryRow,
  type DistMovementWithRefs,
  type MovementType,
  type ProductCategory,
} from '@/lib/supabase'
import {
  fetchMovimientosSku,
  fetchSkuById,
  registrarMovimientoSku,
  updateSkuImagenUrl,
} from '@/lib/supabase/distribuidor'
import {
  movimientoSkuToDistMovement,
  skuRowToInventoryRow,
} from '@/lib/proof/sku-dist-adapter'
import { VuOpsPage } from '@/components/proof/VuOpsPage'
import { ContentCard, PageFrame } from '@fermentrack/ui'

const CATEGORY_COLORS: Record<ProductCategory, string> = {
  cerveza: '#FAC775',
  vino: '#9FE1CB',
  destilado: '#F5C4B3',
}

type SalidaType = 'venta' | 'donacion' | 'merma' | 'muestra'

const SALIDA_TYPES: SalidaType[] = ['venta', 'donacion', 'merma', 'muestra']

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
  color: 'var(--fg-0)',
  marginBottom: 6,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--surface-card)',
  border: '1px solid var(--hairline)',
  padding: '10px 12px',
  fontSize: 13,
  fontWeight: 500,
  color: 'var(--fg-0)',
  outline: 'none',
  fontFamily: 'var(--font-display)',
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
  const t = useTranslations('distributor.productos.detail')
  const tCommon = useTranslations('distributor.common')
  const tCat = useTranslations('distributor.productCategories')
  const tOrigin = useTranslations('distributor.origins')
  const tUnit = useTranslations('distributor.units')
  const tTipo = useTranslations('distributor.movimientoTipo')
  const tMerma = useTranslations('distributor.mermaReason')
  const tMov = useTranslations('distributor.movimientos')
  const locale = useLocale() as AppLocale
  const localeTag = useIntlLocaleTag()
  const params = useParams<{ id: string }>()
  const id = params?.id
  const router = useRouter()
  const { scope } = useProfile()
  const supabase = useSupabase()
  const fileInputRef = useRef<HTMLInputElement>(null)

  function formatMoney(n: number, currency = 'MXN') {
    if (currency === 'MXN') return formatCurrencyMxn(n, locale)
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(n)
  }

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
    if (!id || !scope) return
    const [sku, m, cs] = await Promise.all([
      fetchSkuById(supabase, scope, id),
      fetchMovimientosSku(supabase, { skuId: id, scope }),
      fetchClients(supabase, scope),
    ])
    if (!sku) {
      setNotFound(true)
      setLoading(false)
      return
    }
    setProduct(skuRowToInventoryRow(sku))
    setMovements(m.map(movimientoSkuToDistMovement))
    setClients(cs)
  }

  useEffect(() => {
    if (!scope) return
    setLoading(true)
    load().finally(() => setLoading(false))
  }, [id, scope?.user_id, scope?.profile_type_v2, supabase])

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
      const path = `skus/${product.id}/${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(path, file, {
          contentType: file.type || 'image/jpeg',
          upsert: true,
        })
      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(path)
      const publicUrl = urlData.publicUrl

      await updateSkuImagenUrl(supabase, product.id, publicUrl)

      await load()
    } catch (err: any) {
      alert(t('uploadError', { message: err?.message ?? '' }))
    } finally {
      setUploading(false)
    }
  }

  const backLink = (
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
        color: 'var(--fg-0)',
        textDecoration: 'none',
        border: '1px solid var(--hairline)',
        padding: '8px 12px',
      }}
    >
      {BackIcon}
      <span>{t('back')}</span>
    </Link>
  )

  if (loading) {
    return (
      <VuOpsPage title={tCommon('loading')} actions={backLink}>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--fg-3)' }}>{tCommon('loading')}</p>
      </VuOpsPage>
    )
  }

  if (notFound || !product) {
    return (
      <VuOpsPage title={t('notFound')} actions={backLink}>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--fg-2)' }}>{t('notFound')}</p>
      </VuOpsPage>
    )
  }

  const categoryColor = CATEGORY_COLORS[product.category]

  return (
    <PageFrame style={{ overflow: 'auto', paddingBottom: 96 }}>
      <ContentCard style={{ padding: 0, overflow: 'hidden' }}>
      {/* Banner */}
      <div
        style={{
          height: 180,
          background: categoryColor,
          borderBottom: '1px solid var(--hairline)',
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
              color: 'var(--fg-0)',
              textDecoration: 'none',
              border: '1px solid var(--hairline)',
              background: '#fff',
              padding: '6px 10px',
            }}
          >
            {BackIcon}
            <span>{t('back')}</span>
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
              background: 'var(--fg-0)',
              border: '1px solid var(--hairline)',
              padding: '6px 10px',
              cursor: uploading ? 'wait' : 'pointer',
              opacity: uploading ? 0.5 : 1,
              fontFamily: 'var(--font-display)',
            }}
          >
            {UploadIcon}
            <span>{uploading ? t('uploading') : t('uploadLabel')}</span>
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
              border: '1px solid var(--hairline)',
              background: '#fff',
              padding: 0,
              cursor: uploading ? 'wait' : 'pointer',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label={t('uploadAria')}
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
                  color: 'var(--fg-0)',
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
                  {t('noLabel')}
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
            border: '1px solid var(--hairline)',
            background: 'var(--fg-0)',
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
                  color: 'var(--fg-3)',
                }}
              >
                {tUnit(product.unit_type)} ·{' '}
                {tCat(product.category)} · {tOrigin(product.origin)}
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
                  background: 'var(--crit)',
                  color: '#fff',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {t('lowStock')}
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
                  color: 'var(--fg-3)',
                }}
              >
                {t('warehouseBottles')}
              </div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '.05em',
                  textTransform: 'uppercase',
                  color: 'var(--fg-3)',
                }}
              >
                {t('pctOfInitial', { pct: stats?.pct ?? 0 })}
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
              <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg-3)' }}>
                / {stats?.initialBottles ?? 0}
              </span>
            </div>

            <div
              style={{
                marginTop: 12,
                height: 12,
                border: '3px solid #fff',
                background: 'var(--fg-0)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${Math.min(100, stats?.pct ?? 0)}%`,
                  height: '100%',
                  background: stats && stats.pct <= 20 ? 'var(--crit)' : 'var(--warn)',
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
          labelClosed={t('showMore')}
          labelOpen={t('showLess')}
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
                  label: t('stats.casesInWarehouse'),
                  value: `${stats.currentCases}`,
                  hint: t('stats.perCase', { count: product.bottles_per_case }),
                },
                {
                  label: t('stats.soldBottles'),
                  value: `${stats.soldBottles}`,
                },
                {
                  label: t('stats.soldCases'),
                  value: `${stats.soldCases}`,
                },
                {
                  label: t('stats.samples'),
                  value: `${stats.sampleBottles}`,
                },
                {
                  label: t('stats.shrinkage'),
                  value: `${stats.mermaBottles}`,
                },
                ...(stats.donacionBottles > 0
                  ? [
                      {
                        label: t('stats.donations'),
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
          labelClosed={t('costsPrices')}
          labelOpen={t('hide')}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <SubHeader text={t('costs')} />
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: 12,
                  marginTop: 8,
                }}
              >
                <StatCard
                  label={t('initialInvestment')}
                  value={formatMoney(
                    stats?.inversionInicial ?? 0,
                    product.currency || 'MXN'
                  )}
                />
                <StatCard
                  label={t('costPerBottle')}
                  value={formatMoney(
                    Number(product.cost_per_unit || 0),
                    product.currency || 'MXN'
                  )}
                />
                <StatCard
                  label={t('costPerCase')}
                  value={formatMoney(
                    Number(product.cost_per_unit || 0) * product.bottles_per_case,
                    product.currency || 'MXN'
                  )}
                />
              </div>
            </div>
            <div>
              <SubHeader text={t('salePrice')} />
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
                    label: t('priceTiers.regular'),
                    bg: '#fff',
                    value: Number(product.price_regular),
                  },
                  {
                    label: t('priceTiers.wholesale'),
                    bg: '#C0DD97',
                    value: Number(product.price_mayoreo),
                  },
                  {
                    label: t('priceTiers.special'),
                    bg: '#F4C0D1',
                    value: Number(product.price_especial),
                  },
                ].map(({ label, value, bg }) => (
                  <div
                    key={label}
                    style={{
                      border: '1px solid var(--hairline)',
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
                        color: 'var(--fg-0)',
                        opacity: 0.7,
                        marginBottom: 4,
                      }}
                    >
                      {label}
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--fg-0)' }}>
                      {formatMoney(value, product.currency || 'MXN')}
                    </div>
                    <div
                      style={{
                        marginTop: 2,
                        fontSize: 10,
                        fontWeight: 700,
                        color: 'var(--fg-0)',
                        opacity: 0.6,
                      }}
                    >
                      {t('perBottle')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Collapsible>
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
              {t('recentMovements')}
            </h2>
            <Link
              href="/dashboard/movimientos"
              style={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: '.08em',
                textTransform: 'uppercase',
                color: 'var(--fg-0)',
                textDecoration: 'none',
                borderBottom: '1px solid var(--hairline)',
              }}
            >
              {t('viewAll')}
            </Link>
          </div>
          {lastFive.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--fg-3)' }}>
              {t('emptyMovements')}
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {lastFive.map(m => {
                const type = m.movement_type
                const bpc = m.dist_products?.bottles_per_case || product.bottles_per_case
                const bottles = (m.cases || 0) * bpc + (m.loose_units || 0)
                const time = new Date(m.created_at).toLocaleString(localeTag, {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })
                const detail =
                  type === 'venta'
                    ? m.clients?.name || tCommon('dash')
                    : type === 'merma'
                      ? tMov('historyReason', {
                          reason: m.reason
                            ? tMerma(m.reason as MermaReason)
                            : tCommon('dash'),
                        })
                      : type === 'muestra'
                        ? [m.recipient, m.event].filter(Boolean).join(' · ') || tCommon('dash')
                        : type === 'donacion'
                          ? m.recipient || tCommon('dash')
                          : m.notes || t('goodsEntry')

                return (
                  <div
                    key={m.id}
                    style={{
                      border: '1px solid var(--hairline)',
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
                        border: '1px solid var(--hairline)',
                        background: TYPE_BADGE[type] || '#fff',
                        color: 'var(--fg-0)',
                        flexShrink: 0,
                        minWidth: 90,
                        textAlign: 'center',
                      }}
                    >
                      {tTipo(type)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 800,
                          color: 'var(--fg-0)',
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
                          color: 'var(--fg-3)',
                          marginTop: 2,
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 800,
                            color: type === 'entrada' ? 'var(--ok)' : 'var(--crit)',
                          }}
                        >
                          {type === 'entrada' ? '+' : '−'}
                          {bottles}
                        </span>{' '}
                        {t('bottlesShort')}
                        {(m.cases || 0) > 0 ? ` · ${t('cases', { count: m.cases || 0 })}` : ''}
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
                        color: 'var(--fg-3)',
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
          borderTop: '1px solid var(--hairline)',
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
            background: 'var(--fg-0)',
            color: '#fff',
            border: '1px solid var(--hairline)',
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: '.1em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            fontFamily: 'var(--font-display)',
            minWidth: 280,
          }}
        >
          {t('registerMovement')}
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
      </ContentCard>
    </PageFrame>
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
    <section style={{ border: '1px solid var(--hairline)', overflow: 'hidden' }}>
      <button
        type="button"
        onClick={onToggle}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
          padding: '14px 18px',
          background: open ? 'var(--fg-0)' : '#fff',
          color: open ? '#fff' : 'var(--fg-0)',
          border: 'none',
          borderBottom: open ? '1px solid var(--hairline)' : 'none',
          fontSize: 12,
          fontWeight: 800,
          letterSpacing: '.1em',
          textTransform: 'uppercase',
          cursor: 'pointer',
          fontFamily: 'var(--font-display)',
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
        border: '1px solid var(--hairline)',
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
          color: 'var(--fg-3)',
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--fg-0)' }}>{value}</div>
      {hint && (
        <div
          style={{
            marginTop: 2,
            fontSize: 10,
            fontWeight: 700,
            color: 'var(--fg-3)',
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
        color: 'var(--fg-0)',
        opacity: 0.6,
        borderBottom: '1px solid var(--hairline)',
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
  const t = useTranslations('distributor.productos.detail')
  const tCommon = useTranslations('distributor.common')
  const tMov = useTranslations('distributor.movimientos')
  const tTipo = useTranslations('distributor.movimientoTipo')
  const tMerma = useTranslations('distributor.mermaReason')
  const locale = useLocale() as AppLocale
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

  function formatMoney(n: number, currency = 'MXN') {
    if (currency === 'MXN') return formatCurrencyMxn(n, locale)
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(n)
  }

  const typeLabel = (movType: SalidaType) => tTipo(movType)
  const typeLabelLower = (movType: SalidaType) => typeLabel(movType).toLowerCase()

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
      alert(t('modal.insufficientStock', { available }))
      return
    }
    if (type === 'venta' && !clientId) {
      alert(t('modal.selectClientAlert'))
      return
    }

    setSaving(true)
    try {
      const today = new Date().toISOString().slice(0, 10)
      const precio = parseFloat(unitPrice) || 0

      await registrarMovimientoSku(supabase, {
        skuId: product.id,
        tipo: type,
        cantidad: requestedBottles,
        fecha: today,
        notas: notes.trim() || null,
        clientId: type === 'venta' ? clientId : null,
        recipient:
          type === 'donacion' || type === 'muestra' ? recipient.trim() || null : null,
        reason: type === 'merma' ? reason : null,
        event: type === 'muestra' ? event.trim() || null : null,
        precioUnitario: type === 'venta' ? precio : null,
        total: type === 'venta' ? requestedBottles * precio : null,
        moneda: type === 'venta' ? product.currency || 'MXN' : null,
      })
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
        fontFamily: 'var(--font-display)',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff',
          border: '1px solid var(--hairline)',
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
            borderBottom: '1px solid var(--hairline)',
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
                color: 'var(--fg-0)',
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
                color: 'var(--fg-3)',
                letterSpacing: '.05em',
                textTransform: 'uppercase',
              }}
            >
              {t('modal.available', { count: available })}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 36,
              height: 36,
              border: '1px solid var(--hairline)',
              background: '#fff',
              cursor: 'pointer',
              fontSize: 18,
              fontWeight: 800,
              fontFamily: 'var(--font-display)',
            }}
            aria-label={t('modal.close')}
          >
            ×
          </button>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            borderBottom: '1px solid var(--hairline)',
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
                  borderRight: t === 'muestra' ? 'none' : '1px solid var(--hairline)',
                  background: active ? 'var(--fg-0)' : TYPE_BADGE[t],
                  color: active ? '#fff' : 'var(--fg-0)',
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: '.08em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-display)',
                }}
              >
                {tTipo(t)}
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
              <label style={labelStyle}>{tMov('fields.client')}</label>
              <select
                value={clientId}
                onChange={e => setClientId(e.target.value)}
                style={inputStyle}
                required
              >
                <option value="">{tMov('fields.selectClient')}</option>
                {clients.map(cl => (
                  <option key={cl.id} value={cl.id}>
                    {t('modal.clientTier', { name: cl.name, tier: cl.price_tier })}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label style={labelStyle}>{tMov('fields.cases')}</label>
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
            <label style={labelStyle}>{tMov('fields.looseUnits')}</label>
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
                <label style={labelStyle}>{tMov('fields.unitPrice')}</label>
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
                <label style={labelStyle}>{tMov('fields.total')}</label>
                <div
                  style={{
                    ...inputStyle,
                    background: 'var(--fg-0)',
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
                {type === 'donacion' ? tMov('fields.recipient') : tMov('fields.sampleRecipient')}
              </label>
              <input
                type="text"
                value={recipient}
                onChange={e => setRecipient(e.target.value)}
                style={inputStyle}
                placeholder={
                  type === 'donacion'
                    ? tMov('fields.recipientPlaceholder')
                    : tMov('fields.sampleRecipientPlaceholder')
                }
              />
            </div>
          )}

          {type === 'muestra' && (
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>{tMov('fields.event')}</label>
              <input
                type="text"
                value={event}
                onChange={e => setEvent(e.target.value)}
                style={inputStyle}
                placeholder={tMov('fields.eventPlaceholder')}
              />
            </div>
          )}

          {type === 'merma' && (
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>{tMov('fields.reason')}</label>
              <select
                value={reason}
                onChange={e => setReason(e.target.value as MermaReason)}
                style={inputStyle}
                required
              >
                {MERMA_REASONS.map(r => (
                  <option key={r} value={r}>
                    {tMerma(r)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>{tMov('fields.notes')}</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              style={inputStyle}
              placeholder={tMov('fields.notesPlaceholder')}
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
                color: 'var(--fg-0)',
                border: '1px solid var(--hairline)',
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: '.08em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                fontFamily: 'var(--font-display)',
              }}
            >
              {tCommon('cancel')}
            </button>
            <button
              type="submit"
              disabled={saving || requestedBottles <= 0}
              style={{
                flex: 1,
                padding: '12px 20px',
                background: 'var(--fg-0)',
                color: '#fff',
                border: '1px solid var(--hairline)',
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: '.08em',
                textTransform: 'uppercase',
                cursor: saving ? 'wait' : 'pointer',
                opacity: saving ? 0.5 : 1,
                fontFamily: 'var(--font-display)',
              }}
            >
              {saving
                ? tCommon('saving')
                : t('modal.submit', {
                    type: typeLabelLower(type),
                    count: requestedBottles,
                  })}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
