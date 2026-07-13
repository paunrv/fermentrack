'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { useProfile } from '@/context/ProfileContext'
import { useSupabase } from '@/hooks/useSupabase'
import {
  fetchBatches,
  fetchBottling,
  fetchProductionCosts,
  createProductionCost,
  type Batch,
  type Bottling,
  type ProductionCost,
  type ProductionCostCategory,
} from '@/lib/supabase'
import { PageFrame, ContentCard } from '@fermentrack/ui'
import type { AppLocale } from '@/i18n/routing'
import { intlLocaleTag } from '@/lib/i18n/locale'

const COLORS = ['#FAC775', '#9FE1CB', '#F5C4B3', '#B5D4F4', '#C0DD97', '#F4C0D1']

const CATEGORY_KEYS: ProductionCostCategory[] = [
  'materia_prima',
  'mano_obra',
  'equipo',
  'energia',
  'limpieza',
  'analisis',
  'otro',
]

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
  background: 'var(--surface-card)',
  border: '1px solid var(--hairline)',
  padding: '10px 12px',
  fontSize: 13,
  fontWeight: 500,
  color: 'var(--fg-0)',
  outline: 'none',
  fontFamily: 'var(--font-display)',
}

export default function CostosPage() {
  const t = useTranslations('dashboard.costos')
  const locale = useLocale() as AppLocale
  const intl = intlLocaleTag(locale)
  const { scope } = useProfile()
  const supabase = useSupabase()
  const [batches, setBatches] = useState<Batch[]>([])
  const [bottling, setBottling] = useState<Bottling[]>([])
  const [costs, setCosts] = useState<ProductionCost[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [batchId, setBatchId] = useState('')
  const [category, setCategory] = useState<ProductionCostCategory>('materia_prima')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('MXN')
  const [costDate, setCostDate] = useState(() => new Date().toISOString().slice(0, 10))

  const totalCost = useMemo(() => costs.reduce((s, c) => s + Number(c.amount), 0), [costs])

  const totalBottledUnits = useMemo(
    () => bottling.filter(b => b.batch_id === batchId).reduce((s, b) => s + b.total_units, 0),
    [bottling, batchId]
  )

  const costPerBottle = totalBottledUnits > 0 ? totalCost / totalBottledUnits : 0

  function formatMoney(n: number, curr = 'MXN') {
    return new Intl.NumberFormat(intl, { style: 'currency', currency: curr }).format(n)
  }

  function categoryLabel(cat: ProductionCostCategory) {
    return t(`categories.${cat}` as 'categories.materia_prima')
  }

  async function loadCosts(id: string) {
    if (!id) {
      setCosts([])
      return
    }
    const data = await fetchProductionCosts(supabase, id, scope ?? undefined)
    setCosts(data)
  }

  async function load() {
    const [b, bt] = await Promise.all([
      fetchBatches(supabase, scope ?? undefined),
      fetchBottling(supabase, scope ?? undefined),
    ])
    setBatches(b)
    setBottling(bt)
    const id = batchId || b[0]?.id || ''
    if (id && !batchId) setBatchId(id)
    if (id) await loadCosts(id)
  }

  useEffect(() => {
    if (!scope) return
    load().finally(() => setLoading(false))
  }, [scope?.user_id, scope?.profile_type_v2, supabase])

  useEffect(() => {
    if (batchId) loadCosts(batchId)
  }, [batchId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const amt = parseFloat(amount)
    if (!batchId || !description.trim() || !amt) return
    setSaving(true)
    try {
      await createProductionCost(supabase, {
        batch_id: batchId,
        category,
        description: description.trim(),
        amount: amt,
        currency,
        cost_date: costDate,
        ...(scope
          ? { user_id: scope.user_id, profile_type_v2: scope.profile_type_v2 }
          : {}),
      } as ProductionCost & { user_id?: string; profile_type_v2?: string })
      setDescription('')
      setAmount('')
      await loadCosts(batchId)
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    t('columns.date'),
    t('columns.category'),
    t('columns.description'),
    t('columns.amount'),
  ]

  return (
    <PageFrame style={{ overflow: 'auto' }}>
      <ContentCard>
      <div style={{ marginBottom: 32 }}>
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
        <p style={{ fontSize: 13, color: 'var(--fg-3)', fontWeight: 500 }}>
          {t('subtitle')}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        style={{
          border: '1px solid var(--hairline)',
          padding: 24,
          marginBottom: 24,
          background: COLORS[4],
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
          {t('addCost')}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={label}>{t('fields.batch')}</label>
            <select
              value={batchId}
              onChange={e => setBatchId(e.target.value)}
              style={input}
              required
            >
              <option value="">{t('fields.selectBatch')}</option>
              {batches.map(b => (
                <option key={b.id} value={b.id}>
                  {b.id} — {b.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={label}>{t('fields.category')}</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value as ProductionCostCategory)}
              style={input}
            >
              {CATEGORY_KEYS.map(key => (
                <option key={key} value={key}>
                  {t(`categories.${key}` as 'categories.materia_prima')}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={label}>{t('fields.date')}</label>
            <input
              type="date"
              value={costDate}
              onChange={e => setCostDate(e.target.value)}
              style={input}
              required
            />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={label}>{t('fields.description')}</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={t('fields.descriptionPlaceholder')}
              style={input}
              required
            />
          </div>
          <div>
            <label style={label}>{t('fields.amount')}</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              style={input}
              required
            />
          </div>
          <div>
            <label style={label}>{t('fields.currency')}</label>
            <select value={currency} onChange={e => setCurrency(e.target.value)} style={input}>
              <option value="MXN">MXN</option>
              <option value="USD">USD</option>
            </select>
          </div>
        </div>
        <button
          type="submit"
          disabled={saving || !batchId}
          style={{
            marginTop: 16,
            padding: '12px 20px',
            background: 'var(--fg-0)',
            color: 'var(--ink)',
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
          {saving ? t('saving') : t('submit')}
        </button>
      </form>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 12,
          marginBottom: 24,
        }}
      >
        {[
          { label: t('kpi.total'), value: formatMoney(totalCost, currency), bg: COLORS[0] },
          {
            label: t('kpi.bottledUnits'),
            value: String(totalBottledUnits),
            bg: COLORS[2],
          },
          {
            label: t('kpi.costPerBottle'),
            value: totalBottledUnits > 0 ? formatMoney(costPerBottle, currency) : t('dash'),
            bg: COLORS[5],
          },
        ].map((card, i) => (
          <div
            key={i}
            style={{
              border: '1px solid var(--hairline)',
              padding: 16,
              background: card.bg,
            }}
          >
            <div style={{ ...label, marginBottom: 8 }}>{card.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{card.value}</div>
          </div>
        ))}
      </div>

      <h2
        style={{
          fontSize: 14,
          fontWeight: 800,
          letterSpacing: '.1em',
          textTransform: 'uppercase',
          marginBottom: 12,
        }}
      >
        {t('tableTitle')}
      </h2>
      {loading ? (
        <p style={{ fontSize: 13, color: 'var(--fg-3)' }}>{t('loading')}</p>
      ) : !batchId ? (
        <p style={{ fontSize: 13, color: 'var(--fg-3)' }}>{t('selectBatchHint')}</p>
      ) : costs.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--fg-3)' }}>{t('empty')}</p>
      ) : (
        <div style={{ border: '1px solid var(--hairline)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--fg-0)', color: 'var(--ink)' }}>
                {columns.map(h => (
                  <th
                    key={h}
                    style={{
                      padding: '12px 14px',
                      textAlign: 'left',
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: '.08em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {costs.map((row, i) => (
                <tr key={row.id} style={{ background: i % 2 === 0 ? 'var(--surface-card)' : 'var(--panel-2)' }}>
                  <td style={{ padding: '12px 14px', borderTop: '1px solid var(--hairline)' }}>
                    {new Date(row.cost_date).toLocaleDateString(intl)}
                  </td>
                  <td style={{ padding: '12px 14px', borderTop: '1px solid var(--hairline)', fontWeight: 700 }}>
                    {categoryLabel(row.category)}
                  </td>
                  <td style={{ padding: '12px 14px', borderTop: '1px solid var(--hairline)' }}>
                    {row.description}
                  </td>
                  <td
                    style={{
                      padding: '12px 14px',
                      borderTop: '1px solid var(--hairline)',
                      fontWeight: 800,
                    }}
                  >
                    {formatMoney(Number(row.amount), row.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </ContentCard>
    </PageFrame>
  )
}
