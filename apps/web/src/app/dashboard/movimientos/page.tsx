'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useProfile } from '@/context/ProfileContext'
import { useSupabase } from '@/hooks/useSupabase'
import { useIntlLocaleTag } from '@/lib/i18n/locale'
import {
  fetchClients,
  fetchDistInventory,
  fetchDistMovements,
  createDistMovement,
  updateDistInventory,
  type Client,
  type DistInventoryRow,
  type DistMovementWithRefs,
  type ProductCategory,
} from '@/lib/supabase'
import { fmtMoney } from '@/lib/proof/format'
import { ConnectedProofAIBar } from '@/components/proof/ConnectedProofAIBar'

type SalidaType = 'venta' | 'donacion' | 'merma' | 'muestra'

const TYPE_TONE: Record<SalidaType, string> = {
  venta: 'var(--ok)',
  donacion: 'var(--info)',
  merma: 'var(--crit)',
  muestra: 'var(--warn)',
}

const TYPE_SOFT: Record<SalidaType, string> = {
  venta: 'var(--ok-soft)',
  donacion: 'var(--info-soft)',
  merma: 'var(--crit-soft)',
  muestra: 'var(--warn-soft)',
}

const MERMA_REASONS = ['rota', 'vencida', 'dañada', 'otro'] as const
type MermaReason = (typeof MERMA_REASONS)[number]

const SALIDA_TYPES: SalidaType[] = ['venta', 'donacion', 'merma', 'muestra']

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: 6,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--canvas)',
  border: '1px solid var(--line)',
  borderRadius: 'var(--radius-sm)',
  padding: '10px 12px',
  fontSize: 13,
  color: 'var(--fg-0)',
  outline: 'none',
  fontFamily: 'inherit',
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function priceForTier(product: DistInventoryRow, tier: Client['price_tier']): number {
  if (tier === 'mayoreo') return Number(product.price_mayoreo)
  if (tier === 'especial') return Number(product.price_especial)
  return Number(product.price_regular)
}

function totalAvailable(row: DistInventoryRow): number {
  const inv = row.inventory
  if (!inv) return 0
  return inv.cases * row.bottles_per_case + inv.loose_units
}

export default function MovimientosPage() {
  const t = useTranslations('distributor.movimientos')
  const tCommon = useTranslations('distributor.common')
  const tTipo = useTranslations('distributor.movimientoTipo')
  const tMerma = useTranslations('distributor.mermaReason')
  const tCat = useTranslations('distributor.productCategories')
  const localeTag = useIntlLocaleTag()
  const { scope } = useProfile()
  const supabase = useSupabase()
  const [type, setType] = useState<SalidaType>('venta')
  const [inventory, setInventory] = useState<DistInventoryRow[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [movements, setMovements] = useState<DistMovementWithRefs[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [productId, setProductId] = useState('')
  const [cases, setCases] = useState('')
  const [looseUnits, setLooseUnits] = useState('')
  const [notes, setNotes] = useState('')

  const [clientId, setClientId] = useState('')
  const [unitPrice, setUnitPrice] = useState('')

  const [recipient, setRecipient] = useState('')
  const [reason, setReason] = useState<MermaReason>('rota')
  const [event, setEvent] = useState('')

  const today = useMemo(() => todayISO(), [])

  const productMap = useMemo(
    () => Object.fromEntries(inventory.map(p => [p.id, p])),
    [inventory]
  )
  const clientMap = useMemo(
    () => Object.fromEntries(clients.map(c => [c.id, c])),
    [clients]
  )

  const selectedProduct = productId ? productMap[productId] : null
  const selectedClient = clientId ? clientMap[clientId] : null

  const totalUnits = useMemo(() => {
    const c = parseInt(cases, 10) || 0
    const u = parseInt(looseUnits, 10) || 0
    if (!selectedProduct) return 0
    return c * selectedProduct.bottles_per_case + u
  }, [cases, looseUnits, selectedProduct])

  const computedTotal = useMemo(() => {
    const price = parseFloat(unitPrice) || 0
    return totalUnits * price
  }, [unitPrice, totalUnits])

  useEffect(() => {
    if (type !== 'venta') return
    if (!selectedProduct || !selectedClient) return
    const p = priceForTier(selectedProduct, selectedClient.price_tier)
    if (p > 0) setUnitPrice(String(p))
  }, [type, productId, clientId, selectedProduct, selectedClient])

  async function load() {
    const [inv, cls, movs] = await Promise.all([
      fetchDistInventory(supabase, scope ?? undefined),
      fetchClients(supabase, scope ?? undefined),
      fetchDistMovements(supabase, { date: today, scope: scope ?? undefined }),
    ])
    setInventory(inv)
    setClients(cls)
    setMovements(movs)
    if (inv.length && !productId && inv[0]) setProductId(inv[0].id)
    if (cls.length && !clientId && cls[0]) setClientId(cls[0].id)
  }

  useEffect(() => {
    if (!scope) return
    load().finally(() => setLoading(false))
  }, [scope?.user_id, scope?.profile_type_v2, supabase])

  function resetForm() {
    setCases('')
    setLooseUnits('')
    setNotes('')
    setRecipient('')
    setEvent('')
    setReason('rota')
    setUnitPrice('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedProduct) return
    const c = parseInt(cases, 10) || 0
    const u = parseInt(looseUnits, 10) || 0
    if (c <= 0 && u <= 0) return

    if (type === 'venta' && !clientId) return

    const requested = totalUnits
    const available = totalAvailable(selectedProduct)
    if (requested > available) {
      alert(t('insufficientStock', { available, name: selectedProduct.name }))
      return
    }

    setSaving(true)
    try {
      const baseRecord = {
        product_id: selectedProduct.id,
        movement_type: type,
        cases: c,
        loose_units: u,
        movement_date: today,
        notes: notes.trim() || null,
        ...(scope
          ? { user_id: scope.user_id, profile_type_v2: scope.profile_type_v2 }
          : {}),
      }

      if (type === 'venta') {
        const price = parseFloat(unitPrice) || 0
        await createDistMovement(supabase, {
          ...baseRecord,
          client_id: clientId,
          unit_price: price,
          total_amount: requested * price,
          currency: selectedProduct.currency || 'MXN',
        })
      } else if (type === 'donacion') {
        await createDistMovement(supabase, {
          ...baseRecord,
          recipient: recipient.trim() || null,
        })
      } else if (type === 'merma') {
        await createDistMovement(supabase, {
          ...baseRecord,
          reason,
        })
      } else if (type === 'muestra') {
        await createDistMovement(supabase, {
          ...baseRecord,
          recipient: recipient.trim() || null,
          event: event.trim() || null,
        })
      }

      await updateDistInventory(
        supabase,
        selectedProduct.id,
        -c,
        -u,
        selectedProduct.bottles_per_case
      )

      resetForm()
      await load()
    } finally {
      setSaving(false)
    }
  }

  const summary = useMemo(() => {
    let totalSold = 0
    let totalUnitsMoved = 0
    const byType: Record<SalidaType, { count: number; units: number; amount: number }> = {
      venta: { count: 0, units: 0, amount: 0 },
      donacion: { count: 0, units: 0, amount: 0 },
      merma: { count: 0, units: 0, amount: 0 },
      muestra: { count: 0, units: 0, amount: 0 },
    }
    movements.forEach(m => {
      if (m.movement_type === 'entrada') return
      const movType = m.movement_type as SalidaType
      const bpc = m.dist_products?.bottles_per_case || 0
      const units = (m.cases || 0) * bpc + (m.loose_units || 0)
      totalUnitsMoved += units
      byType[movType].count += 1
      byType[movType].units += units
      if (movType === 'venta' && m.total_amount) {
        totalSold += Number(m.total_amount)
        byType[movType].amount += Number(m.total_amount)
      }
    })
    return { totalSold, totalUnitsMoved, byType }
  }, [movements])

  const salidasHoy = useMemo(
    () => movements.filter(m => m.movement_type !== 'entrada'),
    [movements]
  )

  const ventaProducts = inventory.filter(p => totalAvailable(p) > 0)

  const proofMsg = loading
    ? t('aiFallbackLoading')
    : t('aiFallback', {
        sold: fmtMoney(summary.totalSold),
        units: summary.totalUnitsMoved,
        count: salidasHoy.length,
      })

  const typeLabel = (movType: SalidaType) => tTipo(movType)
  const typeLabelLower = (movType: SalidaType) => typeLabel(movType).toLowerCase()

  return (
    <div style={{ padding: '28px 28px 100px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 16,
            marginBottom: 24,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div className="eyebrow" style={{ color: 'var(--gold)', marginBottom: 8 }}>
              {t('eyebrow')}
            </div>
            <h1
              style={{
                margin: '0 0 6px',
                fontSize: 28,
                fontWeight: 800,
                color: 'var(--fg-0)',
                letterSpacing: '-0.02em',
              }}
            >
              {t('title')}
            </h1>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--fg-2)' }}>
              {t('subtitle', { date: today })}
            </p>
          </div>
          <Link
            href="/dashboard/recepcion"
            style={{
              padding: '10px 16px',
              background: 'transparent',
              color: 'var(--fg-1)',
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              textDecoration: 'none',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--hairline)',
            }}
          >
            {t('receivingLink')}
          </Link>
        </header>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: 10,
            marginBottom: 20,
          }}
        >
          <Kpi
            label={t('kpis.soldToday')}
            value={loading ? '…' : fmtMoney(summary.totalSold)}
            tone="var(--gold)"
          />
          <Kpi
            label={t('kpis.unitsOut')}
            value={loading ? '…' : String(summary.totalUnitsMoved)}
          />
          {SALIDA_TYPES.map(movType => (
            <Kpi
              key={movType}
              label={typeLabel(movType)}
              value={loading ? '…' : t('kpis.unitsShort', { count: summary.byType[movType].units })}
              tone={TYPE_TONE[movType]}
              hint={
                loading
                  ? undefined
                  : t('kpis.moveHint', {
                      count: summary.byType[movType].count,
                      amount:
                        movType === 'venta' && summary.byType[movType].amount > 0
                          ? ` · ${fmtMoney(summary.byType[movType].amount)}`
                          : '',
                    })
              }
            />
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {SALIDA_TYPES.map(movType => (
            <Tab
              key={movType}
              active={type === movType}
              tone={TYPE_TONE[movType]}
              soft={TYPE_SOFT[movType]}
              onClick={() => {
                setType(movType)
                resetForm()
              }}
            >
              {typeLabel(movType)}
            </Tab>
          ))}
        </div>

        <section
          style={{
            marginBottom: 28,
            padding: 20,
            border: '1px solid var(--hairline)',
            borderRadius: 'var(--radius-card)',
            background: 'var(--panel)',
            borderLeft: `3px solid ${TYPE_TONE[type]}`,
          }}
        >
          <div className="eyebrow" style={{ marginBottom: 16, color: 'var(--fg-2)' }}>
            {t('register', { type: typeLabelLower(type) })}
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
              {type === 'venta' && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="eyebrow" style={labelStyle}>
                    {t('fields.client')}
                  </label>
                  <select
                    value={clientId}
                    onChange={e => setClientId(e.target.value)}
                    style={inputStyle}
                    required
                  >
                    <option value="">{t('fields.selectClient')}</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} — {c.price_tier}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ gridColumn: '1 / -1' }}>
                <label className="eyebrow" style={labelStyle}>
                  {t('fields.product')}
                </label>
                <select
                  value={productId}
                  onChange={e => setProductId(e.target.value)}
                  style={inputStyle}
                  required
                >
                  <option value="">{t('fields.selectProduct')}</option>
                  {(type === 'venta' ? ventaProducts : inventory).map(p => {
                    const avail = totalAvailable(p)
                    return (
                      <option key={p.id} value={p.id} disabled={avail <= 0}>
                        {t('fields.productOption', { name: p.name, avail })}
                      </option>
                    )
                  })}
                </select>
              </div>

              <div>
                <label className="eyebrow" style={labelStyle}>
                  {t('fields.cases')}
                </label>
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
                <label className="eyebrow" style={labelStyle}>
                  {t('fields.looseUnits')}
                </label>
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
                    <label className="eyebrow" style={labelStyle}>
                      {t('fields.unitPrice')}
                    </label>
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
                    <label className="eyebrow" style={labelStyle}>
                      {t('fields.total')}
                    </label>
                    <div
                      className="mono"
                      style={{
                        ...inputStyle,
                        background: 'var(--panel-2)',
                        borderColor: 'var(--gold-soft)',
                        color: 'var(--gold)',
                        fontWeight: 600,
                        fontSize: 15,
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      {fmtMoney(computedTotal, selectedProduct?.currency || 'MXN')}
                    </div>
                  </div>
                </>
              )}

              {type === 'donacion' && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="eyebrow" style={labelStyle}>
                    {t('fields.recipient')}
                  </label>
                  <input
                    type="text"
                    value={recipient}
                    onChange={e => setRecipient(e.target.value)}
                    style={inputStyle}
                    placeholder={t('fields.recipientPlaceholder')}
                  />
                </div>
              )}

              {type === 'merma' && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="eyebrow" style={labelStyle}>
                    {t('fields.reason')}
                  </label>
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

              {type === 'muestra' && (
                <>
                  <div>
                    <label className="eyebrow" style={labelStyle}>
                      {t('fields.sampleRecipient')}
                    </label>
                    <input
                      type="text"
                      value={recipient}
                      onChange={e => setRecipient(e.target.value)}
                      style={inputStyle}
                      placeholder={t('fields.sampleRecipientPlaceholder')}
                    />
                  </div>
                  <div>
                    <label className="eyebrow" style={labelStyle}>
                      {t('fields.event')}
                    </label>
                    <input
                      type="text"
                      value={event}
                      onChange={e => setEvent(e.target.value)}
                      style={inputStyle}
                      placeholder={t('fields.eventPlaceholder')}
                    />
                  </div>
                </>
              )}

              <div style={{ gridColumn: '1 / -1' }}>
                <label className="eyebrow" style={labelStyle}>
                  {t('fields.notes')}
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  style={inputStyle}
                  placeholder={t('fields.notesPlaceholder')}
                />
              </div>
            </div>

            <div
              style={{
                marginTop: 18,
                display: 'flex',
                gap: 12,
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <button
                type="submit"
                disabled={saving || !selectedProduct || totalUnits <= 0}
                style={{
                  padding: '10px 18px',
                  background: 'var(--gold)',
                  color: 'var(--ink)',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  cursor: saving ? 'wait' : 'pointer',
                  opacity: saving || !selectedProduct || totalUnits <= 0 ? 0.5 : 1,
                }}
              >
                {saving
                  ? tCommon('saving')
                  : t('submit', { type: typeLabelLower(type) })}
              </button>
              {selectedProduct && (
                <span className="mono" style={{ fontSize: 11, color: 'var(--fg-3)' }}>
                  {t('unitsAvailable', {
                    units: totalUnits,
                    available: totalAvailable(selectedProduct),
                  })}
                </span>
              )}
            </div>
          </form>
        </section>

        <section>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: 12,
              gap: 12,
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--fg-0)',
              }}
            >
              {t('historyTitle')}
            </h2>
            <span className="mono" style={{ fontSize: 10, color: 'var(--fg-4)' }}>
              {t('historyCount', { count: salidasHoy.length })}
            </span>
          </div>

          <div
            style={{
              border: '1px solid var(--hairline)',
              borderRadius: 'var(--radius-card)',
              overflow: 'hidden',
              background: 'var(--panel)',
            }}
          >
            {loading ? (
              <div style={{ padding: 32, color: 'var(--fg-3)', fontSize: 13 }}>
                {tCommon('loading')}
              </div>
            ) : salidasHoy.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: 14, color: 'var(--fg-2)' }}>
                  {t('emptyToday')}
                </p>
                <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--fg-3)' }}>
                  {t.rich('emptyInReceiving', {
                    link: chunks => (
                      <Link href="/dashboard/recepcion" style={{ color: 'var(--gold)' }}>
                        {chunks}
                      </Link>
                    ),
                  })}
                </p>
              </div>
            ) : (
              salidasHoy.map((m, i) => {
                const movType = m.movement_type as SalidaType
                const product = m.dist_products
                const bpc = product?.bottles_per_case || 0
                const units = (m.cases || 0) * bpc + (m.loose_units || 0)
                const time = new Date(m.created_at).toLocaleTimeString(localeTag, {
                  hour: '2-digit',
                  minute: '2-digit',
                })
                const who =
                  movType === 'venta'
                    ? m.clients?.name || tCommon('dash')
                    : movType === 'merma'
                      ? t('historyReason', { reason: m.reason ? tMerma(m.reason as MermaReason) : tCommon('dash') })
                      : m.recipient || tCommon('dash')
                const eventInfo = movType === 'muestra' && m.event ? ` · ${m.event}` : ''

                return (
                  <div
                    key={m.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '100px 1fr auto',
                      gap: 12,
                      padding: '14px 16px',
                      alignItems: 'center',
                      borderBottom:
                        i === salidasHoy.length - 1 ? 'none' : '1px solid var(--hairline)',
                    }}
                  >
                    <span
                      className="mono"
                      style={{
                        fontSize: 9,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        padding: '6px 8px',
                        borderRadius: 'var(--radius-sm)',
                        background: TYPE_SOFT[movType],
                        color: TYPE_TONE[movType],
                        textAlign: 'center',
                      }}
                    >
                      {typeLabel(movType)}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: 'var(--fg-0)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {product?.name || m.product_id}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 2 }}>
                        {who}
                        {eventInfo}
                        {product?.category
                          ? ` · ${tCat(product.category as ProductCategory)}`
                          : ''}
                        {m.notes ? ` · ${m.notes}` : ''}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div className="mono" style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-0)' }}>
                        {t('kpis.unitsShort', { count: units })}
                      </div>
                      {movType === 'venta' && m.total_amount != null && (
                        <div className="mono" style={{ fontSize: 12, color: 'var(--gold)', marginTop: 2 }}>
                          {fmtMoney(Number(m.total_amount), m.currency || product?.currency || 'MXN')}
                        </div>
                      )}
                      <div className="mono" style={{ fontSize: 10, color: 'var(--fg-4)', marginTop: 4 }}>
                        {time}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </section>
      </div>

      <ConnectedProofAIBar
        pantalla="movimientos"
        vista={type}
        profileType="distributor"
        hints={{ pantalla: { summary, salidasCount: salidasHoy.length, today } }}
        fallback={{ mensaje: proofMsg, accionLabel: tCommon('askProof') }}
      />
    </div>
  )
}

function Kpi({
  label,
  value,
  tone,
  hint,
}: {
  label: string
  value: string
  tone?: string
  hint?: string
}) {
  return (
    <div
      style={{
        padding: '14px 16px',
        background: 'var(--panel)',
        border: '1px solid var(--hairline)',
        borderRadius: 'var(--radius-md)',
      }}
    >
      <div className="mono" style={{ fontSize: 9, color: 'var(--fg-3)', letterSpacing: '0.1em', marginBottom: 6 }}
      >
        {label}
      </div>
      <div className="mono" style={{ fontSize: 18, fontWeight: 600, color: tone || 'var(--fg-0)' }}>
        {value}
      </div>
      {hint && (
        <div style={{ fontSize: 10, color: 'var(--fg-4)', marginTop: 4 }}>
          {hint}
        </div>
      )}
    </div>
  )
}

function Tab({
  children,
  active,
  tone,
  soft,
  onClick,
}: {
  children: React.ReactNode
  active: boolean
  tone: string
  soft: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '10px 14px',
        fontSize: 12,
        fontWeight: active ? 600 : 400,
        color: active ? tone : 'var(--fg-2)',
        background: active ? soft : 'transparent',
        border: `1px solid ${active ? tone : 'var(--hairline)'}`,
        borderRadius: 'var(--radius-sm)',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}
