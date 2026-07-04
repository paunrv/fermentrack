'use client'

import { useMemo, useState, useTransition, type CSSProperties } from 'react'
import { useTranslations } from 'next-intl'
import { Button, FormField, Input } from '@fermentrack/ui'
import { recordWmSalidaAction } from '@/app/actions/wm-salida'
import type { ExistenciaInventoryRow } from '@/lib/proof/finished-goods-inventory'
import {
  buildSalidaConversionPreview,
  computeDefaultRango,
} from '@/lib/proof/record-wm-salida'
import {
  WM_SALIDA_TIPO_VALUES,
  type WmSalidaTipo,
} from '@/lib/proof/finished-goods-types'

type RegistrarSalidaFormProps = {
  row: ExistenciaInventoryRow
  numeracionEnabled: boolean
  onSuccess: () => void
  onCancel: () => void
}

const fieldStyle: CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid var(--hairline)',
  background: 'var(--surface-1, var(--canvas))',
  color: 'var(--fg-0)',
  fontSize: 14,
}

export function RegistrarSalidaForm({
  row,
  numeracionEnabled,
  onSuccess,
  onCancel,
}: RegistrarSalidaFormProps) {
  const t = useTranslations('winemaker.bodega.salida')
  const tTipo = useTranslations('winemaker.salidaTipo')
  const [tipo, setTipo] = useState<WmSalidaTipo>('venta')
  const [unidad, setUnidad] = useState<'botellas' | 'cajas'>('cajas')
  const [cantidad, setCantidad] = useState('1')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const cantidadNum = Number.parseFloat(cantidad.replace(',', '.'))
  const preview = useMemo(() => {
    if (!Number.isFinite(cantidadNum) || cantidadNum <= 0) return null
    return buildSalidaConversionPreview(
      cantidadNum,
      unidad,
      row.botellasPorCaja,
      row.stock.disponibles
    )
  }, [cantidadNum, unidad, row.botellasPorCaja, row.stock.disponibles])

  const defaultRango = useMemo(() => {
    if (!preview || !numeracionEnabled) return null
    return computeDefaultRango(row.stock.consumidas, preview.botellas)
  }, [preview, numeracionEnabled, row.stock.consumidas])

  const [rangoInicio, setRangoInicio] = useState('')
  const [rangoFin, setRangoFin] = useState('')

  const resolvedRango = useMemo(() => {
    if (!numeracionEnabled || !preview) return null
    const inicio = Number.parseInt(rangoInicio, 10)
    const fin = Number.parseInt(rangoFin, 10)
    if (Number.isInteger(inicio) && Number.isInteger(fin) && fin >= inicio) {
      return { inicio, fin }
    }
    return defaultRango
  }, [numeracionEnabled, preview, rangoInicio, rangoFin, defaultRango])

  const overStock = preview != null && preview.botellas > row.stock.disponibles

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(null)

    if (!preview || overStock) return

    startTransition(async () => {
      try {
        await recordWmSalidaAction({
          existenciaId: row.id,
          tipo,
          cantidad: cantidadNum,
          unidad,
          rangoInicio: numeracionEnabled ? resolvedRango?.inicio ?? null : null,
          rangoFin: numeracionEnabled ? resolvedRango?.fin ?? null : null,
        })
        onSuccess()
      } catch (err) {
        const code = err instanceof Error ? err.message : 'submitFailed'
        setSubmitError(
          t.has(`errors.${code}` as 'errors.submitFailed')
            ? t(`errors.${code}` as 'errors.submitFailed')
            : t('errors.submitFailed')
        )
      }
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        marginTop: 14,
        padding: 14,
        borderRadius: 10,
        border: '1px solid var(--hairline)',
        background: 'var(--canvas)',
        display: 'grid',
        gap: 12,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 600 }}>{t('title')}</div>

      <FormField label={t('tipoLabel')}>
        <select
          value={tipo}
          onChange={e => setTipo(e.target.value as WmSalidaTipo)}
          style={fieldStyle}
        >
          {WM_SALIDA_TIPO_VALUES.map(value => (
            <option key={value} value={value}>
              {tTipo.has(value) ? tTipo(value) : value}
            </option>
          ))}
        </select>
      </FormField>

      <div>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--fg-2)' }}>
          {t('unidadLabel')}
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <input
              type="radio"
              name={`unidad-${row.id}`}
              checked={unidad === 'cajas'}
              onChange={() => setUnidad('cajas')}
            />
            {t('unidadCajas')}
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <input
              type="radio"
              name={`unidad-${row.id}`}
              checked={unidad === 'botellas'}
              onChange={() => setUnidad('botellas')}
            />
            {t('unidadBotellas')}
          </label>
        </div>
      </div>

      <FormField label={t('cantidadLabel')}>
        <Input
          type="number"
          min={0.01}
          step={unidad === 'cajas' ? 1 : 1}
          value={cantidad}
          onChange={e => setCantidad(e.target.value)}
          required
        />
      </FormField>

      {preview ? (
        <p
          style={{
            margin: 0,
            fontSize: 13,
            color: overStock ? 'var(--crit)' : 'var(--fg-2)',
          }}
        >
          {overStock
            ? t('conversionOverStock', {
                cantidad: cantidadNum,
                unidad: unidad === 'cajas' ? t('unidadCajasShort') : t('unidadBotellasShort'),
                porCaja: row.botellasPorCaja,
                botellas: preview.botellas,
                disponibles: row.stock.disponibles,
              })
            : t('conversionPreview', {
                cantidad: cantidadNum,
                unidad: unidad === 'cajas' ? t('unidadCajasShort') : t('unidadBotellasShort'),
                porCaja: row.botellasPorCaja,
                botellas: preview.botellas,
                quedan: preview.quedan,
              })}
        </p>
      ) : null}

      {numeracionEnabled && preview && !overStock ? (
        <fieldset style={{ border: 'none', margin: 0, padding: 0 }}>
          <legend style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--fg-2)' }}>
            {t('rangoLegend')}
          </legend>
          <div style={{ display: 'grid', gap: 10, gridTemplateColumns: '1fr 1fr' }}>
            <FormField label={t('rangoInicioLabel')}>
              <Input
                type="number"
                min={1}
                step={1}
                placeholder={String(defaultRango?.inicio ?? '')}
                value={rangoInicio}
                onChange={e => setRangoInicio(e.target.value)}
              />
            </FormField>
            <FormField label={t('rangoFinLabel')}>
              <Input
                type="number"
                min={1}
                step={1}
                placeholder={String(defaultRango?.fin ?? '')}
                value={rangoFin}
                onChange={e => setRangoFin(e.target.value)}
              />
            </FormField>
          </div>
          {resolvedRango ? (
            <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--fg-3)' }}>
              {t('rangoHint', {
                inicio: resolvedRango.inicio,
                fin: resolvedRango.fin,
              })}
            </p>
          ) : null}
        </fieldset>
      ) : null}

      {submitError ? (
        <p style={{ margin: 0, fontSize: 13, color: 'var(--crit)' }}>{submitError}</p>
      ) : null}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Button type="submit" loading={isPending} disabled={!preview || overStock}>
          {t('submit')}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isPending}>
          {t('cancel')}
        </Button>
      </div>
    </form>
  )
}
