'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import type { AppLocale } from '@/i18n/routing'
import { useProfile } from '@/context/ProfileContext'
import { useSupabase } from '@/hooks/useSupabase'
import {
  fetchDistProducts,
  createDistProduct,
  type DistProduct,
  type ProductCategory,
  type ProductOrigin,
  type ProductUnitType,
} from '@/lib/supabase'
import { formatCurrencyMxn } from '@/lib/i18n/format'

const CATEGORY_COLORS: Record<ProductCategory, string> = {
  cerveza: '#FAC775',
  vino: '#9FE1CB',
  destilado: '#F5C4B3',
}

const ORIGIN_BG: Record<ProductOrigin, string> = {
  local: '#C0DD97',
  importado: '#B5D4F4',
}

const CATEGORIES: ProductCategory[] = ['cerveza', 'vino', 'destilado']
const ORIGINS: ProductOrigin[] = ['local', 'importado']
const UNIT_TYPES: ProductUnitType[] = ['botella', 'lata']

const label: React.CSSProperties = {
  display: 'block',
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: '.1em',
  textTransform: 'uppercase',
  color: 'var(--fg-0)',
  marginBottom: 6,
}

const input: React.CSSProperties = {
  width: '100%',
  background: '#fff',
  border: '1px solid var(--hairline)',
  padding: '10px 12px',
  fontSize: 13,
  fontWeight: 500,
  color: 'var(--fg-0)',
  outline: 'none',
  fontFamily: 'var(--font-display)',
}

export default function ProductosPage() {
  const t = useTranslations('distributor.productos')
  const tCommon = useTranslations('distributor.common')
  const tCat = useTranslations('distributor.productCategories')
  const tOrigin = useTranslations('distributor.origins')
  const tUnit = useTranslations('distributor.units')
  const locale = useLocale() as AppLocale
  const { scope } = useProfile()
  const supabase = useSupabase()

  function formatMoney(n: number, currency = 'MXN') {
    if (currency === 'MXN') return formatCurrencyMxn(n, locale)
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(n)
  }

  const [products, setProducts] = useState<DistProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const [name, setName] = useState('')
  const [category, setCategory] = useState<ProductCategory>('cerveza')
  const [producer, setProducer] = useState('')
  const [origin, setOrigin] = useState<ProductOrigin>('local')
  const [unitType, setUnitType] = useState<ProductUnitType>('botella')
  const [bottlesPerCase, setBottlesPerCase] = useState('12')
  const [costPerUnit, setCostPerUnit] = useState('')
  const [priceRegular, setPriceRegular] = useState('')
  const [priceMayoreo, setPriceMayoreo] = useState('')
  const [priceEspecial, setPriceEspecial] = useState('')
  const [currency, setCurrency] = useState('MXN')
  const [notes, setNotes] = useState('')

  async function load() {
    const data = await fetchDistProducts(supabase, scope ?? undefined)
    setProducts(data)
  }

  useEffect(() => {
    if (!scope) return
    load().finally(() => setLoading(false))
  }, [scope?.user_id, scope?.profile_type_v2, supabase])

  function resetForm() {
    setName('')
    setCategory('cerveza')
    setProducer('')
    setOrigin('local')
    setUnitType('botella')
    setBottlesPerCase('12')
    setCostPerUnit('')
    setPriceRegular('')
    setPriceMayoreo('')
    setPriceEspecial('')
    setCurrency('MXN')
    setNotes('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    setSaving(true)
    try {
      await createDistProduct(supabase, {
        name: name.trim(),
        category,
        producer: producer.trim() || null,
        origin,
        unit_type: unitType,
        bottles_per_case: parseInt(bottlesPerCase, 10) || 12,
        cost_per_unit: parseFloat(costPerUnit) || 0,
        price_regular: parseFloat(priceRegular) || 0,
        price_mayoreo: parseFloat(priceMayoreo) || 0,
        price_especial: parseFloat(priceEspecial) || 0,
        currency: currency.trim().toUpperCase() || 'MXN',
        notes: notes.trim() || null,
      })
      resetForm()
      setShowForm(false)
      await load()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ fontFamily: 'var(--font-display)', background: '#fff', minHeight: '100vh', padding: 32 }}>
      <div
        style={{
          marginBottom: 32,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: '-.04em',
              color: 'var(--fg-0)',
              lineHeight: 1.1,
              marginBottom: 6,
            }}
          >
            {t('title')}
          </h1>
          <p style={{ fontSize: 13, color: '#888', fontWeight: 500 }}>{t('subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(v => !v)}
          style={{
            padding: '12px 20px',
            background: showForm ? '#fff' : 'var(--fg-0)',
            color: showForm ? 'var(--fg-0)' : '#fff',
            border: '1px solid var(--hairline)',
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '.08em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            fontFamily: 'var(--font-display)',
          }}
        >
          {showForm ? tCommon('cancel') : t('newProduct')}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          style={{
            border: '1px solid var(--hairline)',
            padding: 24,
            marginBottom: 32,
            background: CATEGORY_COLORS[category],
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: '.1em',
              textTransform: 'uppercase',
              marginBottom: 16,
            }}
          >
            {t('formTitle')}
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 12,
            }}
          >
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={label}>{t('fields.name')}</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                style={input}
                placeholder={t('fields.namePlaceholder')}
                required
              />
            </div>
            <div>
              <label style={label}>{t('fields.category')}</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as ProductCategory)}
                style={input}
                required
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>
                    {tCat(c)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={label}>{t('fields.origin')}</label>
              <select
                value={origin}
                onChange={e => setOrigin(e.target.value as ProductOrigin)}
                style={input}
                required
              >
                {ORIGINS.map(o => (
                  <option key={o} value={o}>
                    {tOrigin(o)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={label}>{t('fields.unit')}</label>
              <select
                value={unitType}
                onChange={e => setUnitType(e.target.value as ProductUnitType)}
                style={input}
                required
              >
                {UNIT_TYPES.map(u => (
                  <option key={u} value={u}>
                    {tUnit(u)}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={label}>{t('fields.producer')}</label>
              <input
                type="text"
                value={producer}
                onChange={e => setProducer(e.target.value)}
                style={input}
                placeholder={t('fields.producerPlaceholder')}
              />
            </div>
            <div>
              <label style={label}>{t('fields.bottlesPerCase')}</label>
              <input
                type="number"
                min={1}
                value={bottlesPerCase}
                onChange={e => setBottlesPerCase(e.target.value)}
                style={input}
                required
              />
            </div>
            <div>
              <label style={label}>{t('fields.costPerUnit')}</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={costPerUnit}
                onChange={e => setCostPerUnit(e.target.value)}
                style={input}
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <label style={label}>{t('fields.currency')}</label>
              <input
                type="text"
                value={currency}
                onChange={e => setCurrency(e.target.value.toUpperCase())}
                style={input}
                placeholder="MXN"
                maxLength={3}
                required
              />
            </div>
            <div>
              <label style={label}>{t('fields.priceRegular')}</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={priceRegular}
                onChange={e => setPriceRegular(e.target.value)}
                style={input}
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <label style={label}>{t('fields.priceWholesale')}</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={priceMayoreo}
                onChange={e => setPriceMayoreo(e.target.value)}
                style={input}
                placeholder="0.00"
              />
            </div>
            <div>
              <label style={label}>{t('fields.priceSpecial')}</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={priceEspecial}
                onChange={e => setPriceEspecial(e.target.value)}
                style={input}
                placeholder="0.00"
              />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={label}>{t('fields.notes')}</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                style={{ ...input, minHeight: 70, resize: 'vertical' }}
                placeholder={t('fields.notesPlaceholder')}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={saving || !name.trim()}
            style={{
              marginTop: 16,
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
            {saving ? tCommon('saving') : t('saveProduct')}
          </button>
        </form>
      )}

      <div>
        {loading ? (
          <p style={{ fontSize: 13, color: '#888' }}>{tCommon('loading')}</p>
        ) : products.length === 0 ? (
          <p style={{ fontSize: 13, color: '#888' }}>{t('empty')}</p>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 16,
            }}
          >
            {products.map(product => (
              <Link
                key={product.id}
                href={`/dashboard/productos/${product.id}`}
                style={{
                  border: '1px solid var(--hairline)',
                  padding: 20,
                  background: CATEGORY_COLORS[product.category],
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  minHeight: 220,
                  textDecoration: 'none',
                  color: 'inherit',
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
                        fontSize: 18,
                        fontWeight: 800,
                        lineHeight: 1.2,
                        color: 'var(--fg-0)',
                      }}
                    >
                      {product.name}
                    </div>
                    {product.producer && (
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          marginTop: 4,
                          color: '#333',
                        }}
                      >
                        {product.producer}
                      </div>
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 800,
                      letterSpacing: '.1em',
                      textTransform: 'uppercase',
                      padding: '5px 8px',
                      border: '1px solid var(--hairline)',
                      background: '#fff',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                  >
                    {tCat(product.category)}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 800,
                      letterSpacing: '.1em',
                      textTransform: 'uppercase',
                      padding: '5px 8px',
                      border: '1px solid var(--hairline)',
                      background: ORIGIN_BG[product.origin],
                      color: 'var(--fg-0)',
                    }}
                  >
                    {tOrigin(product.origin)}
                  </span>
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 800,
                      letterSpacing: '.1em',
                      textTransform: 'uppercase',
                      padding: '5px 8px',
                      border: '1px solid var(--hairline)',
                      background: '#fff',
                      color: 'var(--fg-0)',
                    }}
                  >
                    {tUnit('perCase', {
                      unit: tUnit(product.unit_type),
                      count: product.bottles_per_case,
                    })}
                  </span>
                </div>

                <div
                  style={{
                    marginTop: 'auto',
                    border: '1px solid var(--hairline)',
                    background: '#fff',
                    padding: 10,
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
                    {t('card.regularPrice')}
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--fg-0)', lineHeight: 1 }}>
                    {formatMoney(Number(product.price_regular), product.currency)}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      marginTop: 8,
                      color: '#333',
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 8,
                    }}
                  >
                    <span>
                      <span style={{ opacity: 0.6 }}>{t('card.wholesaleShort')} </span>
                      {formatMoney(Number(product.price_mayoreo), product.currency)}
                    </span>
                    <span>
                      <span style={{ opacity: 0.6 }}>{t('card.specialShort')} </span>
                      {formatMoney(Number(product.price_especial), product.currency)}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      marginTop: 6,
                      color: '#888',
                      letterSpacing: '.05em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {t('card.cost', {
                      amount: formatMoney(Number(product.cost_per_unit), product.currency),
                    })}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
