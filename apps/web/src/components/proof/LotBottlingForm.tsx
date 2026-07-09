'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState, useTransition, type CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button, FormField, Input } from '@fermentrack/ui'
import {
  fetchLotBottlingContextAction,
  recordLotBottlingAction,
} from '@/app/actions/lot-bottling'
import {
  computeExistenciaStock,
  WM_BOTELLAS_POR_CAJA_VALUES,
  type WmBotellasPorCaja,
} from '@/lib/proof/finished-goods-types'
import { WM_FORMATO_PRESETS } from '@/lib/proof/record-lot-bottling'

type LotBottlingFormProps = {
  lotId: string
}

type ContextState = Awaited<ReturnType<typeof fetchLotBottlingContextAction>>

const fieldStyle: CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid var(--hairline)',
  background: 'var(--surface-1, var(--canvas))',
  color: 'var(--fg-0)',
  fontSize: 14,
}

export function LotBottlingForm({ lotId }: LotBottlingFormProps) {
  const router = useRouter()
  const t = useTranslations('winemaker.lotDetail.bottling')
  const tLimits = useTranslations('dashboard.limits')
  const [context, setContext] = useState<ContextState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const [mode, setMode] = useState<'existing' | 'new'>('existing')
  const [etiquetaId, setEtiquetaId] = useState('')
  const [newNombre, setNewNombre] = useState('')
  const [anada, setAnada] = useState('')
  const [formato, setFormato] = useState('750ml')
  const [formatoCustom, setFormatoCustom] = useState('')
  const [botellasPorCaja, setBotellasPorCaja] = useState<WmBotellasPorCaja>(12)
  const [botellasProducidas, setBotellasProducidas] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const next = await fetchLotBottlingContextAction(lotId)
      setContext(next)
      if (next.etiquetas.length === 0) setMode('new')
      const firstEtiqueta = next.etiquetas[0]
      if (firstEtiqueta) setEtiquetaId(firstEtiqueta.id)
      if (next.lot.defaultAnada != null) setAnada(String(next.lot.defaultAnada))
    } catch (err) {
      const code = err instanceof Error ? err.message : 'loadFailed'
      setError(t.has(`errors.${code}` as 'errors.loadFailed') ? t(`errors.${code}` as 'errors.loadFailed') : t('errors.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [lotId, t])

  useEffect(() => {
    void load()
  }, [load])

  const resolvedFormato = formato === 'custom' ? formatoCustom.trim() : formato
  const producidas = Number.parseInt(botellasProducidas, 10)
  const preview =
    Number.isFinite(producidas) && producidas > 0
      ? computeExistenciaStock(producidas, 0, botellasPorCaja)
      : null

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(null)

    startTransition(async () => {
      try {
        await recordLotBottlingAction({
          lotId,
          etiquetaId: mode === 'existing' ? etiquetaId : null,
          newEtiqueta:
            mode === 'new'
              ? {
                  nombre: newNombre,
                }
              : null,
          anada: Number.parseInt(anada, 10),
          formato: resolvedFormato,
          botellasPorCaja,
          botellasProducidas: producidas,
        })
        router.refresh()
        await load()
      } catch (err) {
        const code = err instanceof Error ? err.message : 'submitFailed'
        const msg = t.has(`errors.${code}` as 'errors.submitFailed')
          ? t(`errors.${code}` as 'errors.submitFailed')
          : tLimits.has(code as 'limit_reached_etiquetas')
            ? tLimits(code as 'limit_reached_etiquetas', { limit: 5 })
            : t('errors.submitFailed')
        setSubmitError(msg)
      }
    })
  }

  if (loading) {
    return (
      <p style={{ marginTop: 24, fontSize: 14, color: 'var(--fg-3)' }}>{t('loading')}</p>
    )
  }

  if (error) {
    return (
      <p style={{ marginTop: 24, fontSize: 14, color: 'var(--crit)' }}>{error}</p>
    )
  }

  if (!context) return null

  if (context.hasExistencia) {
    return (
      <div
        style={{
          marginTop: 24,
          padding: 16,
          borderRadius: 12,
          border: '1px solid var(--hairline)',
          background: 'var(--surface-1, var(--canvas))',
        }}
      >
        <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{t('completedTitle')}</p>
        <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--fg-2)' }}>
          {t('completedBody')}{' '}
          <Link
            href="/dashboard/winemaker/bodega"
            style={{ color: 'var(--proof-accent, #6940A5)', fontWeight: 600 }}
          >
            {t('completedLink')}
          </Link>
          .
        </p>
      </div>
    )
  }

  if (!context.canRegister) {
    return (
      <div style={{ marginTop: 24, fontSize: 13, color: 'var(--fg-3)' }}>{t('notReady')}</div>
    )
  }

  return (
    <div
      style={{
        marginTop: 24,
        padding: 16,
        borderRadius: 12,
        border: '1px solid var(--hairline)',
        background: 'var(--surface-1, var(--canvas))',
      }}
    >
      <h2 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700 }}>{t('title')}</h2>
      <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--fg-2)' }}>{t('subtitle')}</p>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 14 }}>
        <fieldset style={{ border: 'none', margin: 0, padding: 0 }}>
          <legend style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{t('etiquetaLegend')}</legend>
          <div style={{ display: 'flex', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              <input
                type="radio"
                name="etiquetaMode"
                checked={mode === 'existing'}
                onChange={() => setMode('existing')}
                disabled={context.etiquetas.length === 0}
              />
              {t('etiquetaExisting')}
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              <input
                type="radio"
                name="etiquetaMode"
                checked={mode === 'new'}
                onChange={() => setMode('new')}
              />
              {t('etiquetaNew')}
            </label>
          </div>

          {mode === 'existing' ? (
            <select
              value={etiquetaId}
              onChange={e => setEtiquetaId(e.target.value)}
              style={fieldStyle}
              required
            >
              {context.etiquetas.map(et => (
                <option key={et.id} value={et.id}>
                  {et.nombre}
                </option>
              ))}
            </select>
          ) : (
            <FormField label={t('newEtiquetaLabel')}>
              <Input
                value={newNombre}
                onChange={e => setNewNombre(e.target.value)}
                placeholder={t('newEtiquetaPlaceholder')}
                required
              />
            </FormField>
          )}
        </fieldset>

        <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
          <FormField label={t('anadaLabel')}>
            <Input
              type="number"
              min={1900}
              max={2100}
              value={anada}
              onChange={e => setAnada(e.target.value)}
              required
            />
          </FormField>

          <FormField label={t('formatoLabel')}>
            <select
              value={formato}
              onChange={e => setFormato(e.target.value)}
              style={fieldStyle}
            >
              {WM_FORMATO_PRESETS.map(preset => (
                <option key={preset} value={preset}>
                  {preset}
                </option>
              ))}
              <option value="custom">{t('formatoCustom')}</option>
            </select>
          </FormField>
        </div>

        {formato === 'custom' ? (
          <FormField label={t('formatoCustomLabel')}>
            <Input
              value={formatoCustom}
              onChange={e => setFormatoCustom(e.target.value)}
              placeholder={t('formatoPlaceholder')}
              required
            />
          </FormField>
        ) : null}

        <FormField label={t('botellasPorCajaLabel')}>
          <select
            value={botellasPorCaja}
            onChange={e => setBotellasPorCaja(Number(e.target.value) as WmBotellasPorCaja)}
            style={fieldStyle}
          >
            {WM_BOTELLAS_POR_CAJA_VALUES.map(value => (
              <option key={value} value={value}>
                {t('botellasPorCajaOption', { count: value })}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label={t('botellasProducidasLabel')}>
          <Input
            type="number"
            min={1}
            step={1}
            value={botellasProducidas}
            onChange={e => setBotellasProducidas(e.target.value)}
            required
          />
        </FormField>

        {preview ? (
          <p style={{ margin: 0, fontSize: 13, color: 'var(--fg-2)' }}>
            {t('preview', {
              botellas: preview.producidas,
              cajas: preview.cajas_disponibles,
              sueltas: preview.sueltas,
              porCaja: botellasPorCaja,
            })}
          </p>
        ) : null}

        {submitError ? (
          <p style={{ margin: 0, fontSize: 13, color: 'var(--crit)' }}>{submitError}</p>
        ) : null}

        <Button type="submit" loading={isPending}>
          {t('submit')}
        </Button>
      </form>
    </div>
  )
}
