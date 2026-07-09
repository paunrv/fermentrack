'use client'

export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useProfile } from '@/context/ProfileContext'
import { useSupabase } from '@/hooks/useSupabase'
import { VuOpsPage } from '@/components/proof/VuOpsPage'
import { fmtMoney } from '@/lib/proof/format'
import { createOrdenCompraDistribuidor } from '@/lib/supabase/distribuidor'

const field: React.CSSProperties = {
  width: '100%',
  background: 'var(--surface-card)',
  border: '0.5px solid var(--hairline)',
  padding: '10px 12px',
  fontSize: 13,
  color: 'var(--fg-0)',
  outline: 'none',
  borderRadius: 8,
}

const label: React.CSSProperties = {
  display: 'block',
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--fg-3)',
  marginBottom: 6,
}

type ItemDraft = {
  key: string
  producto: string
  cantidad: string
  costo: string
}

function emptyItem(): ItemDraft {
  return { key: crypto.randomUUID(), producto: '', cantidad: '12', costo: '0' }
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export default function NuevaOrdenCompraPage() {
  const t = useTranslations('distributor.compras')
  const router = useRouter()
  const { scope } = useProfile()
  const supabase = useSupabase()

  const [proveedor, setProveedor] = useState('')
  const [fechaEstimada, setFechaEstimada] = useState(todayISO)
  const [items, setItems] = useState<ItemDraft[]>(() => [emptyItem()])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const total = useMemo(() => {
    return items.reduce((s, it) => {
      const qty = parseInt(it.cantidad, 10) || 0
      const cost = parseFloat(it.costo) || 0
      return s + qty * cost
    }, 0)
  }, [items])

  const addItem = () => setItems(prev => [...prev, emptyItem()])

  const removeItem = (key: string) => {
    setItems(prev => (prev.length <= 1 ? prev : prev.filter(i => i.key !== key)))
  }

  const updateItem = (key: string, patch: Partial<ItemDraft>) => {
    setItems(prev => prev.map(i => (i.key === key ? { ...i, ...patch } : i)))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!scope) return

    const prov = proveedor.trim()
    if (!prov) {
      setError(t('errors.supplier'))
      return
    }

    const parsed = items
      .map(it => ({
        producto_nombre: it.producto.trim(),
        cantidad_ordenada: parseInt(it.cantidad, 10) || 0,
        costo_unitario: parseFloat(it.costo) || 0,
      }))
      .filter(it => it.producto_nombre && it.cantidad_ordenada > 0)

    if (parsed.length === 0) {
      setError(t('errors.items'))
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const orden = await createOrdenCompraDistribuidor(supabase, scope, {
        proveedor_nombre: prov,
        fecha_estimada: fechaEstimada || null,
        items: parsed,
      })
      router.push(`/dashboard?oc=${orden.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.create'))
    } finally {
      setSubmitting(false)
    }
  }

  const backLink = (
    <Link
      href="/dashboard"
      style={{ fontSize: 12, color: 'var(--fg-3)', textDecoration: 'none' }}
    >
      {t('back')}
    </Link>
  )

  return (
    <VuOpsPage title={t('title')} description={t('subtitle')} actions={backLink} narrow>
      <form onSubmit={e => void handleSubmit(e)}>
        <div style={{ marginBottom: 20 }}>
          <label style={label}>{t('fields.supplier')}</label>
          <input
            type="text"
            value={proveedor}
            onChange={e => setProveedor(e.target.value)}
            placeholder={t('fields.supplierPlaceholder')}
            style={field}
            required
          />
        </div>

        <div style={{ marginBottom: 28 }}>
          <label style={label}>{t('fields.estimatedDate')}</label>
          <input
            type="date"
            value={fechaEstimada}
            onChange={e => setFechaEstimada(e.target.value)}
            style={field}
          />
        </div>

        <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ ...label, marginBottom: 0 }}>{t('fields.products')}</span>
          <button
            type="button"
            onClick={addItem}
            style={{
              fontSize: 11,
              padding: '6px 10px',
              borderRadius: 6,
              border: '0.5px solid var(--hairline)',
              background: 'var(--surface-card)',
              cursor: 'pointer',
              color: 'var(--fg-3)',
            }}
          >
            {t('fields.add')}
          </button>
        </div>

        {items.map(it => {
          const qty = parseInt(it.cantidad, 10) || 0
          const cost = parseFloat(it.costo) || 0
          const subtotal = qty * cost
          return (
            <div
              key={it.key}
              style={{
                padding: 16,
                marginBottom: 12,
                border: '0.5px solid var(--hairline)',
                borderRadius: 10,
                background: 'var(--panel-2)',
              }}
            >
              <div style={{ marginBottom: 10 }}>
                <label style={label}>{t('fields.productLabel')}</label>
                <input
                  type="text"
                  value={it.producto}
                  onChange={e => updateItem(it.key, { producto: e.target.value })}
                  placeholder={t('fields.productPlaceholder')}
                  style={field}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={label}>{t('fields.quantity')}</label>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={it.cantidad}
                    onChange={e => updateItem(it.key, { cantidad: e.target.value })}
                    style={field}
                  />
                </div>
                <div>
                  <label style={label}>{t('fields.unitCost')}</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={it.costo}
                    onChange={e => updateItem(it.key, { costo: e.target.value })}
                    style={field}
                  />
                </div>
              </div>
              <div
                style={{
                  marginTop: 10,
                  fontSize: 11,
                  color: 'var(--fg-3)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>{t('subtotal', { amount: fmtMoney(subtotal) })}</span>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(it.key)}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--crit)',
                      fontSize: 11,
                      cursor: 'pointer',
                    }}
                  >
                    {t('remove')}
                  </button>
                )}
              </div>
            </div>
          )
        })}

        <div
          style={{
            marginTop: 20,
            padding: '14px 16px',
            borderRadius: 10,
            background: 'var(--panel-2)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>{t('orderTotal')}</span>
          <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--fg-0)' }}>{fmtMoney(total)}</span>
        </div>

        {error && (
          <p style={{ color: 'var(--crit)', fontSize: 12, marginTop: 16 }}>{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting || !scope}
          style={{
            width: '100%',
            marginTop: 24,
            padding: '14px 16px',
            borderRadius: 10,
            border: 'none',
            background: 'var(--fg-0)',
            color: '#fff',
            fontSize: 14,
            fontWeight: 600,
            cursor: submitting ? 'wait' : 'pointer',
            opacity: submitting ? 0.7 : 1,
          }}
        >
          {submitting ? t('creating') : t('create')}
        </button>
      </form>
    </VuOpsPage>
  )
}
