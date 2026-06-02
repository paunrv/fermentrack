'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
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

const ORIGIN_LABELS: Record<ProductOrigin, string> = {
  local: 'Local',
  importado: 'Importado',
}

const ORIGIN_BG: Record<ProductOrigin, string> = {
  local: '#C0DD97',
  importado: '#B5D4F4',
}

const UNIT_LABELS: Record<ProductUnitType, string> = {
  botella: 'Botella',
  lata: 'Lata',
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
  color: '#111',
  marginBottom: 6,
}

const input: React.CSSProperties = {
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

export default function ProductosPage() {
  const { scope } = useProfile()
  const supabase = useSupabase()
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
  }, [scope?.clerk_id, scope?.profile_type_v2, supabase])

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
    <div style={{ fontFamily: font, background: '#fff', minHeight: '100vh', padding: 32 }}>
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
              color: '#111',
              lineHeight: 1.1,
              marginBottom: 6,
            }}
          >
            Productos
          </h1>
          <p style={{ fontSize: 13, color: '#888', fontWeight: 500 }}>
            Catálogo de cervezas, vinos y destilados para distribución
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(v => !v)}
          style={{
            padding: '12px 20px',
            background: showForm ? '#fff' : '#111',
            color: showForm ? '#111' : '#fff',
            border: '3px solid #111',
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '.08em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            fontFamily: font,
          }}
        >
          {showForm ? 'Cancelar' : '+ Nuevo producto'}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          style={{
            border: '3px solid #111',
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
            Nuevo producto
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 12,
            }}
          >
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={label}>Nombre</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                style={input}
                placeholder="Nombre comercial del producto"
                required
              />
            </div>
            <div>
              <label style={label}>Categoría</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as ProductCategory)}
                style={input}
                required
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={label}>Origen</label>
              <select
                value={origin}
                onChange={e => setOrigin(e.target.value as ProductOrigin)}
                style={input}
                required
              >
                {ORIGINS.map(o => (
                  <option key={o} value={o}>
                    {ORIGIN_LABELS[o]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={label}>Unidad</label>
              <select
                value={unitType}
                onChange={e => setUnitType(e.target.value as ProductUnitType)}
                style={input}
                required
              >
                {UNIT_TYPES.map(u => (
                  <option key={u} value={u}>
                    {UNIT_LABELS[u]}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={label}>Productor</label>
              <input
                type="text"
                value={producer}
                onChange={e => setProducer(e.target.value)}
                style={input}
                placeholder="Casa productora / fabricante"
              />
            </div>
            <div>
              <label style={label}>Botellas por caja</label>
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
              <label style={label}>Costo por unidad</label>
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
              <label style={label}>Moneda</label>
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
              <label style={label}>Precio regular</label>
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
              <label style={label}>Precio mayoreo</label>
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
              <label style={label}>Precio especial</label>
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
              <label style={label}>Notas</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                style={{ ...input, minHeight: 70, resize: 'vertical' }}
                placeholder="ABV, estilo, denominación de origen, condiciones..."
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={saving || !name.trim()}
            style={{
              marginTop: 16,
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
            {saving ? 'Guardando...' : 'Guardar producto'}
          </button>
        </form>
      )}

      <div>
        {loading ? (
          <p style={{ fontSize: 13, color: '#888' }}>Cargando...</p>
        ) : products.length === 0 ? (
          <p style={{ fontSize: 13, color: '#888' }}>
            Aún no hay productos. Agrega el primero con el botón &quot;+ Nuevo producto&quot;.
          </p>
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
                  border: '3px solid #111',
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
                        color: '#111',
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
                      border: '3px solid #111',
                      background: '#fff',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                  >
                    {CATEGORY_LABELS[product.category]}
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
                      border: '3px solid #111',
                      background: ORIGIN_BG[product.origin],
                      color: '#111',
                    }}
                  >
                    {ORIGIN_LABELS[product.origin]}
                  </span>
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 800,
                      letterSpacing: '.1em',
                      textTransform: 'uppercase',
                      padding: '5px 8px',
                      border: '3px solid #111',
                      background: '#fff',
                      color: '#111',
                    }}
                  >
                    {UNIT_LABELS[product.unit_type]} · {product.bottles_per_case}/caja
                  </span>
                </div>

                <div
                  style={{
                    marginTop: 'auto',
                    border: '3px solid #111',
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
                    Precio regular
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#111', lineHeight: 1 }}>
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
                      <span style={{ opacity: 0.6 }}>MAY </span>
                      {formatMoney(Number(product.price_mayoreo), product.currency)}
                    </span>
                    <span>
                      <span style={{ opacity: 0.6 }}>ESP </span>
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
                    Costo: {formatMoney(Number(product.cost_per_unit), product.currency)}
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
